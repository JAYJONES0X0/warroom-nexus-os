import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  evaluateEvent, rankEdges, MAX_VERIFY_LEGS,
  type CandidateEvent, type CandidateMarket, type OrderBook, type BookLevel, type ArbEdge,
} from '../src/lib/arb.js';

// ARB EDGE SCANNER — two stages.
//   Stage 1: Gamma /events discovers negRisk multi-outcome CANDIDATES (theory).
//   Stage 2: CLOB /book walks real ask depth to confirm an EXECUTABLE basket.
// Theory and execution are kept strictly separate (see src/lib/arb.ts). A cached
// orderbook is a fake edge, so CLOB-verified results get a very short cache only.

const GAMMA = 'https://gamma-api.polymarket.com/events';
const CLOB = 'https://clob.polymarket.com/book';

interface GammaMarket {
  id: string; question: string; groupItemTitle?: string;
  outcomePrices?: string; outcomes?: string; clobTokenIds?: string;
  liquidity?: string; enableOrderBook?: boolean; acceptingOrders?: boolean;
  feesEnabled?: boolean; takerBaseFee?: number; closed?: boolean;
}
interface GammaEvent {
  id: string; title: string; negRisk?: boolean; negRiskAugmented?: boolean;
  endDate?: string; markets?: GammaMarket[];
}

function parseArr(s: string | undefined, fallback: unknown[]): unknown[] {
  if (!s) return fallback;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
}

// Defensive: one malformed event must never crash the scan — return null, skip it.
function toCandidate(ev: GammaEvent): CandidateEvent | null {
  if (!ev.markets || ev.markets.length < 2) return null;
  const markets: CandidateMarket[] = [];
  let negRiskOther = false;
  for (const m of ev.markets) {
    if (m.closed) continue;
    const prices = parseArr(m.outcomePrices, []).map(Number);
    const tokenIds = parseArr(m.clobTokenIds, []);
    if (prices.length < 2 || tokenIds.length < 2) continue; // need a binary Yes/No leg
    const label = m.groupItemTitle || m.question || 'outcome';
    if (/\bother\b/i.test(label)) negRiskOther = true;
    markets.push({
      id: m.id, question: label,
      yesTokenId: String(tokenIds[0] ?? '') || null,
      noTokenId: String(tokenIds[1] ?? '') || null,
      yesPrice: Number(prices[0]) || 0,
      noPrice: Number(prices[1]) || 0,
      liquidity: Math.round(parseFloat(m.liquidity ?? '0') || 0),
      enableOrderBook: m.enableOrderBook !== false,
      acceptingOrders: m.acceptingOrders !== false,
      feesEnabled: !!m.feesEnabled,
      feeRateBps: Number(m.takerBaseFee ?? 0) || 0,
    });
  }
  if (markets.length < 2) return null;
  return {
    id: ev.id, title: ev.title, negRisk: !!ev.negRisk,
    negRiskAugmented: !!ev.negRiskAugmented, negRiskOther,
    endDate: ev.endDate ?? null, markets,
  };
}

async function fetchBook(tokenId: string): Promise<OrderBook | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(`${CLOB}?token_id=${encodeURIComponent(tokenId)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const asks: BookLevel[] = (Array.isArray(d.asks) ? d.asks : [])
      .map((a: { price: string; size: string }) => ({ price: Number(a.price), size: Number(a.size) }))
      .filter((a: BookLevel) => isFinite(a.price) && isFinite(a.size) && a.size > 0);
    // Normalise timestamp to ms (CLOB may report seconds). Fail toward "old" (safe).
    let ts = Number(d.timestamp) || 0;
    if (ts > 0 && ts < 1e12) ts *= 1000;
    return {
      tokenId, asks,
      timestamp: ts || 0,
      hash: String(d.hash ?? ''),
      minOrderSize: Number(d.min_order_size) || 0,
      tickSize: Number(d.tick_size) || 0.01,
    };
  } catch { return null; } finally { clearTimeout(to); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Short cache only — a verified arb decays fast; the UI always shows data age.
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const stake = Math.max(1, Number(req.query.stake) || 100);
  const limit = Math.min(200, Number(req.query.limit) || 120);
  const verifyK = Math.min(10, Number(req.query.verify) || 6);

  try {
    const r = await fetch(`${GAMMA}?active=true&closed=false&order=volume_24hr&ascending=false&limit=${limit}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(`Gamma ${r.status}`);
    const raw: GammaEvent[] = await r.json();

    const negRiskEvents = raw.filter((e) => e.negRisk);
    const candidates: CandidateEvent[] = [];
    for (const e of negRiskEvents) { const c = toCandidate(e); if (c) candidates.push(c); }

    // Stage 1 — theoretical pass (no books) to find and rank real candidates.
    const theoretical = candidates
      .map((c) => ({ c, edge: evaluateEvent(c, null, stake) }))
      .filter((x) => x.edge.arbType != null);

    // Verify the closest-to-arb, non-augmented, tractable-leg candidates.
    const toVerify = theoretical
      .filter((x) => x.edge.status !== 'AUGMENTED_WATCH' && x.c.markets.length <= MAX_VERIFY_LEGS)
      .sort((a, b) => a.edge.distFromArbBps - b.edge.distFromArbBps)
      .slice(0, verifyK);

    // Stage 2 — CLOB verification (parallel, capped). Failure → stays theoretical.
    const verifiedMap = new Map<string, ArbEdge>();
    await Promise.all(toVerify.map(async ({ c, edge }) => {
      const side = edge.arbType === 'BUY_ALL_YES' ? 'YES' : 'NO';
      const tokenIds = c.markets.map((m) => (side === 'YES' ? m.yesTokenId : m.noTokenId)).filter(Boolean) as string[];
      const fetched = await Promise.all(tokenIds.map(fetchBook));
      const books = new Map<string, OrderBook>();
      fetched.forEach((b) => { if (b) books.set(b.tokenId, b); });
      verifiedMap.set(c.id, evaluateEvent(c, books, stake));
    }));

    // Verified where we have it, else theoretical-only.
    const all: ArbEdge[] = theoretical.map(({ c, edge }) => verifiedMap.get(c.id) ?? edge);
    all.sort(rankEdges);

    const count = (s: ArbEdge['status']) => all.filter((e) => e.status === s).length;
    const scanned = {
      events: raw.length, negRiskEvents: negRiskEvents.length, candidates: candidates.length,
      theoretical: theoretical.length, executable: count('EXECUTABLE_EDGE'), live: count('LIVE_EDGE'),
      rejected: count('AUGMENTED_WATCH'),
    };
    const rejectedSummary = {
      insufficientDepth: count('INSUFFICIENT_DEPTH'), augmented: count('AUGMENTED_WATCH'),
      staleBook: count('STALE_DATA'), theoreticalOnly: count('THEORETICAL_EDGE'),
    };

    const shown = new Set(['LIVE_EDGE', 'EXECUTABLE_EDGE', 'INSUFFICIENT_DEPTH', 'STALE_DATA', 'THEORETICAL_EDGE']);
    const edges = all.filter((e) => shown.has(e.status)).slice(0, 30);
    const closest = all
      .filter((e) => e.status === 'AUGMENTED_WATCH' || e.status === 'NO_EDGE')
      .sort((a, b) => a.distFromArbBps - b.distFromArbBps)
      .slice(0, 6);

    res.json({
      fetchedAt: Date.now(), scanId: `scan-${Date.now()}`,
      dataMode: toVerify.length ? 'clob_verified' : 'gamma_only',
      scanned, edges, closest, rejectedSummary,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
