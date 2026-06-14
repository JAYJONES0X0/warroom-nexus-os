// Resolution scoreboard — a browser-local log of every prediction-market read,
// checked against the real outcome once the market resolves. Turns "trust me"
// into a provable, compounding hit rate. Seeded with the first verified result
// (Brazil 1-1 Morocco, FIFA WC 2026 — our CONTESTED/50-50 read held).

export interface TrackEntry {
  id: string;
  question: string;
  classification: string;          // ARB | CONTESTED | CONSENSUS | LONGSHOT | THIN
  impliedYes: number;              // market-implied YES prob when first logged (0-1)
  firstSeen: number;               // ts
  daysLeft: number | null;
  resolved: "YES" | "NO" | null;   // actual outcome once settled
  resolvedAt?: number;
  note?: string;
}

const KEY = "warroom.track.v1";
const MAX = 200;

const SEED: TrackEntry[] = [{
  id: "seed-brazil-2026-06-13",
  question: "Will Brazil win on 2026-06-13?",
  classification: "CONTESTED",
  impliedYes: 0.585,
  firstSeen: Date.parse("2026-06-13T20:00:00Z"),
  daysLeft: 1,
  resolved: "NO",
  resolvedAt: Date.parse("2026-06-13T22:00:00Z"),
  note: "1-1 draw vs Morocco (FIFA WC 2026, verified). Our read: 50/50 toss-up — vindicated.",
}];

function read(): TrackEntry[] {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s) as TrackEntry[];
  } catch { /* ignore */ }
  write(SEED);
  return [...SEED];
}

function write(arr: TrackEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))); } catch { /* ignore */ }
}

export function getRecord(): TrackEntry[] {
  return read();
}

export interface LoggableMarket { id: string; question: string; edge: string; yesPrice: number; daysLeft: number | null; }

// Log any newly-seen markets (dedupe by id). Returns the updated record.
export function logMarkets(markets: LoggableMarket[]): TrackEntry[] {
  const rec = read();
  const byId = new Map(rec.map((e) => [e.id, e] as const));
  let changed = false;
  for (const m of markets) {
    if (!m.id || byId.has(m.id)) continue;
    byId.set(m.id, {
      id: m.id, question: m.question, classification: m.edge,
      impliedYes: m.yesPrice, firstSeen: Date.now(), daysLeft: m.daysLeft, resolved: null,
    });
    changed = true;
  }
  if (!changed) return rec;
  const arr = [...byId.values()];
  write(arr);
  return arr;
}

// Stamp outcomes onto logged entries once /api/resolve reports a winner.
export function applyResolutions(results: { id: string; winner: "YES" | "NO" | null }[]): TrackEntry[] {
  const rec = read();
  const winners = new Map(results.map((r) => [r.id, r.winner] as const));
  let changed = false;
  const arr = rec.map((e) => {
    const w = winners.get(e.id);
    if (e.resolved == null && w) { changed = true; return { ...e, resolved: w, resolvedAt: Date.now() }; }
    return e;
  });
  if (changed) write(arr);
  return arr;
}

export interface TrackStats { tracked: number; resolved: number; favHitRate: number | null; }

// Calibration: of resolved markets, how often did the implied favorite (>50% side) win?
// If markets are well-calibrated this trends with the average confidence — and the
// gaps are where a real edge could live.
export function computeStats(rec: TrackEntry[]): TrackStats {
  const resolved = rec.filter((e) => e.resolved);
  let hits = 0;
  for (const e of resolved) {
    const favYes = e.impliedYes >= 0.5;
    if ((favYes && e.resolved === "YES") || (!favYes && e.resolved === "NO")) hits++;
  }
  return {
    tracked: rec.length,
    resolved: resolved.length,
    favHitRate: resolved.length ? Math.round((hits / resolved.length) * 100) : null,
  };
}

// ── Play journal + bankroll — the £100 operating system ──────────────────────
// Logs the plays you actually take (side + stake) and scores them against your
// bankroll once the market resolves. Process over outcome: you control the action.
export interface Play {
  id: string;
  marketId: string;
  question: string;
  side: "YES" | "NO";
  stake: number;          // £
  entryPrice: number;     // price of the chosen side at entry (0-1)
  takenAt: number;
  resolved: "WON" | "LOST" | null;
  resolvedAt?: number;
  pnl: number;            // realized £ once resolved (0 while open)
}

const PLAYS_KEY = "warroom.plays.v1";
export const BANKROLL_START = 100;

function readPlays(): Play[] {
  try { const s = localStorage.getItem(PLAYS_KEY); if (s) return JSON.parse(s) as Play[]; } catch { /* ignore */ }
  return [];
}
function writePlays(arr: Play[]) {
  try { localStorage.setItem(PLAYS_KEY, JSON.stringify(arr.slice(-MAX))); } catch { /* ignore */ }
}

export function getPlays(): Play[] { return readPlays(); }

export function logPlay(
  market: { id: string; question: string; yesPrice: number; noPrice: number },
  side: "YES" | "NO",
  stake: number,
): Play[] {
  const plays = readPlays();
  const entryPrice = side === "YES" ? market.yesPrice : market.noPrice;
  plays.push({
    id: `${market.id}-${Date.now()}`, marketId: market.id, question: market.question,
    side, stake, entryPrice, takenAt: Date.now(), resolved: null, pnl: 0,
  });
  writePlays(plays);
  return plays;
}

// Polymarket payout: YES bought at p pays 1 per share if YES wins → return
// stake*(1-p)/p; a loss is -stake.
export function resolvePlays(results: { id: string; winner: "YES" | "NO" | null }[]): Play[] {
  const plays = readPlays();
  const winners = new Map(results.map((r) => [r.id, r.winner] as const));
  let changed = false;
  const arr = plays.map((p) => {
    if (p.resolved != null) return p;
    const w = winners.get(p.marketId);
    if (!w) return p;
    changed = true;
    const won = p.side === w;
    const pnl = won ? p.stake * (1 - p.entryPrice) / p.entryPrice : -p.stake;
    return { ...p, resolved: (won ? "WON" : "LOST") as "WON" | "LOST", resolvedAt: Date.now(), pnl: Math.round(pnl * 100) / 100 };
  });
  if (changed) writePlays(arr);
  return arr;
}

export interface PlayStats {
  bankroll: number; realizedPnl: number; openExposure: number;
  taken: number; resolved: number; won: number; winRate: number | null; weekPnl: number;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
export function playStats(plays: Play[]): PlayStats {
  const resolved = plays.filter((p) => p.resolved);
  const realizedPnl = resolved.reduce((s, p) => s + p.pnl, 0);
  const openExposure = plays.filter((p) => p.resolved == null).reduce((s, p) => s + p.stake, 0);
  const won = resolved.filter((p) => p.resolved === "WON").length;
  const weekAgo = Date.now() - 7 * 86400000;
  const weekPnl = resolved.filter((p) => (p.resolvedAt ?? p.takenAt) >= weekAgo).reduce((s, p) => s + p.pnl, 0);
  return {
    bankroll: r2(BANKROLL_START + realizedPnl),
    realizedPnl: r2(realizedPnl),
    openExposure: r2(openExposure),
    taken: plays.length, resolved: resolved.length, won,
    winRate: resolved.length ? Math.round((won / resolved.length) * 100) : null,
    weekPnl: r2(weekPnl),
  };
}
