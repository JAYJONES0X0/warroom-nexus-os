import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GammaMarket {
  id: string;
  question: string;
  volume24hr: number;
  liquidity: string;
  outcomePrices: string;
  outcomes: string;
  endDate: string;
  oneDayPriceChange?: number;   // YES price move over 24h (probability points)
}

interface MarketScore { score: number; rationale: string; arb: boolean; }

// Opportunity-quality score from real, observable market structure.
// This grades *tradeability* (can you get filled, is price still discovering,
// is the timing sane) — NOT a directional probability call.
function scoreMarket(m: GammaMarket, daysLeft: number | null): MarketScore {
  const vol = m.volume24hr || 0;
  const liq = parseFloat(m.liquidity) || 0;
  const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number);
  const yesPrice = prices[0] ?? 0.5;
  const sum = prices.reduce((s: number, p: number) => s + p, 0);

  // Fillable liquidity — the gate on any real position. log scale, $1M+ ≈ full marks.
  const liqScore = Math.min(30, Math.round((Math.log10(Math.max(1, liq)) / 6) * 30));

  // Fresh volume — active price discovery means information is still flowing in.
  const volScore = Math.min(25, Math.round((Math.log10(Math.max(1, vol)) / 6.5) * 25));

  // Contestedness — peaks at a 50/50 toss-up (genuine uncertainty = where an
  // information edge actually pays); near-resolved markets have nothing left to win.
  const contested = 1 - Math.abs(yesPrice - 0.5) * 2;          // 0..1
  const contestScore = Math.round(contested * 25);

  // Timing fit — too far out locks capital for nothing; <1 day is resolution noise.
  // Sweet spot ≈ 3–45 days.
  const d = daysLeft ?? 30;
  const timeScore = d < 1 ? 4 : d <= 45 ? 15 : d <= 120 ? 9 : 4;

  // Real arbitrage: binary outcomes priced below $1.00 in aggregate = free spread.
  const arb = sum > 0 && sum < 0.985;
  const arbBonus = arb ? 8 : 0;

  const score = Math.min(100, liqScore + volScore + contestScore + timeScore + arbBonus);

  // Rationale cites the dominant driver so the operator sees *why* it ranks.
  const drivers: [string, number][] = [
    [`$${(liq / 1000).toFixed(0)}K liquidity`, liqScore],
    [`$${(vol / 1000).toFixed(0)}K 24h volume`, volScore],
    [contested > 0.6 ? 'toss-up — live discovery' : 'leaning resolved', contestScore],
    [`${d}d to resolve`, timeScore],
  ];
  drivers.sort((a, b) => b[1] - a[1]);
  const rationale = (arb ? 'ARB spread + ' : '') + drivers.slice(0, 2).map(x => x[0]).join(', ');

  return { score, rationale, arb };
}

// Honest structural classification of what a market IS — NOT a mispricing call.
// The market price is the consensus probability; we don't pretend to beat it. The
// only genuine edge here is a real arbitrage spread (outcome prices sum < $1).
function classify(yesPrice: number, liquidity: number, arb: boolean): string {
  if (arb) return 'ARB';                                  // real free spread
  if (liquidity < 50_000) return 'THIN';                  // likely unfillable / trap
  if (yesPrice >= 0.80 || yesPrice <= 0.20) return 'CONSENSUS'; // strongly priced in
  if (yesPrice >= 0.40 && yesPrice <= 0.60) return 'CONTESTED'; // genuine toss-up
  return 'LONGSHOT';                                       // 0.20–0.40 / 0.60–0.80 lean
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Pull a deep slice — ~60% of top markets sit at price extremes and get
    // filtered, so fetch 150 to land on a rich, full board (not 1-5 markets).
    const resp = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=150&active=true&closed=false&order=volume24hr&ascending=false',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!resp.ok) throw new Error(`Gamma API ${resp.status}`);

    const raw: GammaMarket[] = await resp.json();

    const markets = raw
      .map(m => {
        const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number);
        const outcomeNames = JSON.parse(m.outcomes || '["Yes","No"]');
        const yesPrice = prices[0] ?? 0.5;
        const daysLeft = m.endDate
          ? Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000))
          : null;
        const { score, rationale, arb } = scoreMarket(m, daysLeft);

        return {
          id: m.id,
          question: m.question,
          volume24h: Math.round(m.volume24hr || 0),
          liquidity: Math.round(parseFloat(m.liquidity) || 0),
          yesPrice,
          noPrice: prices[1] ?? 0.5,
          outcomeNames,
          daysLeft,
          score,
          rationale,
          arb,
          edge: classify(yesPrice, Math.round(parseFloat(m.liquidity) || 0), arb),
          move24h: Number.isFinite(m.oneDayPriceChange) ? (m.oneDayPriceChange as number) : 0,
        };
      })
      // Filter out effectively-resolved markets and expired ones
      .filter(m => m.yesPrice > 0.03 && m.yesPrice < 0.97 && m.daysLeft !== 0)
      .slice(0, 60);

    res.json({ markets, fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
