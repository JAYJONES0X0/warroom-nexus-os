import { useState, useEffect } from "react";
import { usePrices } from "./usePrices";
import { ASSET_BRAIN, correlationConfirmation, type CorrelationResult } from "@/lib/warroomBrain";

export interface EXAFactor {
  label: string;
  value: number;   // 0-100 contribution score
  note: string;    // human-readable evidence
}

export interface EXAScores {
  technical: number;
  risk: number;
  sentiment: number;
  volatility: number;
  liquidity: number;
  composite: number;
  verdict: "AUTHORIZED" | "DELAY" | "DENIED";
  locks: boolean[];
  session: string;
  // additive transparency fields — the "why" behind the score
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: number;       // -100..100 signed directional momentum
  ticks: number;          // live samples in the rolling window
  factors: EXAFactor[];
  // WARROOM brain grounding
  confirmation: CorrelationResult; // live cross-asset correlation confirmation
  winRate: number | null;          // backtested overall win rate (%)
  expectancy: string | null;       // backtested expectancy per trade
}

const EMPTY_CONFIRMATION: CorrelationResult = {
  confirms: 0, denies: 0, neutral: 0, total: 0, score: 0, confidence: "STAND ASIDE", checks: [],
};

const EMPTY: EXAScores = {
  technical: 0, risk: 0, sentiment: 0, volatility: 0, liquidity: 0,
  composite: 0, verdict: "DENIED", locks: [false, false, false, false],
  session: "Loading...", bias: "NEUTRAL", momentum: 0, ticks: 0, factors: [],
  confirmation: EMPTY_CONFIRMATION, winRate: null, expectancy: null,
};

// Typical daily move (%) per instrument — used to normalise volatility 0-100
// so a 0.5% EURUSD day and a 4% BTC day both read as "normal".
const TYPICAL_DAILY_PCT: Record<string, number> = {
  EURUSD: 0.45, GBPUSD: 0.55, USDJPY: 0.50, GBPJPY: 0.70, AUDUSD: 0.60,
  NZDUSD: 0.65, XAUUSD: 1.00, BTCUSD: 3.50, NAS100: 1.20, SPX: 0.90, DXY: 0.35,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

// ── Rolling tick buffer (module-level so it survives re-renders) ──────────────
interface Tick { t: number; p: number; }
const HISTORY = new Map<string, Tick[]>();
const MAX_TICKS = 60;          // ~5 min at the 5s feed cadence
const MIN_GAP_MS = 4_000;      // ignore duplicate samples from parallel fetchers

function pushTick(pair: string, price: number) {
  if (!price || !isFinite(price)) return;
  const buf = HISTORY.get(pair) ?? [];
  const last = buf[buf.length - 1];
  if (last && last.p === price && Date.now() - last.t < MIN_GAP_MS) return;
  buf.push({ t: Date.now(), p: price });
  if (buf.length > MAX_TICKS) buf.shift();
  HISTORY.set(pair, buf);
}

// Net move over the window + how cleanly directional it was (0-1).
function tickStats(pair: string): { momPct: number; persistence: number; n: number; windowMin: number } {
  const buf = HISTORY.get(pair) ?? [];
  if (buf.length < 3) return { momPct: 0, persistence: 0, n: buf.length, windowMin: 0 };
  const first = buf[0].p, lastP = buf[buf.length - 1].p;
  const momPct = ((lastP - first) / first) * 100;
  const netSign = Math.sign(momPct);
  let aligned = 0, steps = 0;
  for (let i = 1; i < buf.length; i++) {
    const d = buf[i].p - buf[i - 1].p;
    if (d === 0) continue;
    steps++;
    if (Math.sign(d) === netSign) aligned++;
  }
  const persistence = steps ? aligned / steps : 0;
  const windowMin = (buf[buf.length - 1].t - buf[0].t) / 60_000;
  return { momPct, persistence, n: buf.length, windowMin };
}

// ── Session model (UTC) — drives liquidity + the timing lock ──────────────────
function getSessionInfo() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const weekend = day === 0 || (day === 6) || (day === 5 && h >= 21);
  if (weekend) return { name: "Weekend / Thin", active: false, liquidity: 22 };
  if (h >= 12 && h < 16) return { name: "London/NY Overlap", active: true, liquidity: 92 };
  if (h >= 7 && h < 9)   return { name: "London Killzone",   active: true, liquidity: 80 };
  if (h >= 9 && h < 12)  return { name: "London Session",    active: true, liquidity: 72 };
  if (h >= 16 && h < 21) return { name: "NY Afternoon",      active: true, liquidity: 62 };
  if (h >= 0 && h < 7)   return { name: "Asian Session",     active: false, liquidity: 44 };
  return { name: "Late NY / Thin", active: false, liquidity: 30 };
}

// Market-wide risk appetite from cross-asset confirmation. 50 = neutral.
function riskAppetite(prices: Record<string, { changePct: number }>): { score: number; note: string } {
  const nas = prices["NAS100"]?.changePct;
  const spx = prices["SPX"]?.changePct;
  const dxy = prices["DXY"]?.changePct;
  const btc = prices["BTCUSD"]?.changePct;
  let bull = 0, parts: string[] = [];
  const eq = [nas, spx].filter((v) => v != null) as number[];
  if (eq.length) { const a = eq.reduce((s, v) => s + v, 0) / eq.length; bull += a * 12; parts.push(`equities ${a >= 0 ? "+" : ""}${a.toFixed(2)}%`); }
  if (dxy != null) { bull += -dxy * 14; parts.push(`DXY ${dxy >= 0 ? "+" : ""}${dxy.toFixed(2)}%`); }
  if (btc != null) { bull += btc * 4; }
  const score = clamp(50 + bull);
  const note = parts.length ? parts.join(" · ") : "cross-asset data pending";
  return { score: round(score), note };
}

// Pure scorer — the single source of truth shared by the single-pair hook and
// the multi-asset scan, so they can never disagree on the same asset.
export function computeEXAScores(
  pair: string,
  prices: Record<string, { price: number; changePct: number }>,
): EXAScores {
  const p = prices[pair];
  if (!p) return EMPTY;

  {
    pushTick(pair, p.price);
    const stats = tickStats(pair);
    const ref = TYPICAL_DAILY_PCT[pair] ?? 0.8;
    const session = getSessionInfo();

    // Momentum: blend measured intraday tick drift with the day's move.
    // Falls back to the daily change cleanly until the tick window fills.
    const haveTicks = stats.n >= 5;
    const momPct = haveTicks ? (stats.momPct * 0.7 + p.changePct * 0.3) : p.changePct;
    const persistence = haveTicks ? stats.persistence : Math.min(1, Math.abs(p.changePct) / ref);
    const momStrength = clamp((Math.abs(momPct) / (ref * 0.5)) * 60); // 0-100 magnitude
    const momentum = round(Math.sign(momPct) * momStrength);          // signed -100..100
    const bias: EXAScores["bias"] = momStrength < 18 ? "NEUTRAL" : momPct > 0 ? "BULLISH" : "BEARISH";

    // Technical: directional strength rewarded by clean, persistent structure.
    const technical = clamp(round(35 + momStrength * 0.45 + persistence * 30));

    // Volatility: today's range vs. the instrument's typical day (real, normalised).
    const volatility = clamp(round((Math.abs(p.changePct) / ref) * 50), 4);

    // Risk-environment quality: best in a tradeable vol sweet-spot (~55-75),
    // penalised when dead-calm or chaotic. Triangular around the ideal band.
    const distFromIdeal = Math.abs(volatility - 65);
    const risk = clamp(round(85 - distFromIdeal * 0.9 - (session.active ? 0 : 15)));

    // Sentiment: market-wide risk appetite from cross-asset confirmation.
    const appetite = riskAppetite(prices);
    const sentiment = appetite.score;

    // Liquidity: session depth.
    const liquidity = session.liquidity;

    // Cross-asset confirmation — the WARROOM correlation matrix, live. A flat
    // market reads as neutral (50) rather than tanking the score to zero.
    const confirmation = correlationConfirmation(pair, bias, prices);
    const confirmScore = bias === "NEUTRAL" ? 50 : confirmation.score;

    // Confluence — technical-led, with correlation as a secondary filter (the
    // brain is explicit: SMC structure is primary, correlation confirms it).
    const composite = clamp(round(
      technical * 0.25 + risk * 0.22 + confirmScore * 0.18 + sentiment * 0.08 + volatility * 0.12 + liquidity * 0.15
    ));

    const verdict: EXAScores["verdict"] =
      composite >= 82 ? "AUTHORIZED" : composite >= 62 ? "DELAY" : "DENIED";

    // 4-LOCKS — each grounded in a real, observable condition.
    const locks = [
      technical >= 55,                                            // Structure: clean directional move
      liquidity >= 55,                                            // Liquidity: session has depth
      session.active,                                             // Timing: inside a real trading session
      bias !== "NEUTRAL" && confirmation.confidence !== "STAND ASIDE", // Confirmation: correlations agree
    ];

    const brain = ASSET_BRAIN[pair];
    const winMin = stats.windowMin >= 0.1 ? `${stats.windowMin.toFixed(1)}m` : "warming up";
    const confirmNote = bias === "NEUTRAL"
      ? "no directional bias to confirm"
      : `${confirmation.confirms}/${confirmation.confirms + confirmation.denies} agree · ${confirmation.confidence}`;
    const factors: EXAFactor[] = [
      { label: "Momentum",        value: round(momStrength), note: `${bias} · ${momPct >= 0 ? "+" : ""}${momPct.toFixed(2)}% (${winMin})` },
      { label: "Trend Clarity",   value: round(persistence * 100), note: haveTicks ? `${round(persistence * 100)}% of ${stats.n} ticks aligned` : "building tick history" },
      { label: "Correlation",     value: confirmScore, note: confirmNote },
      { label: "Volatility",      value: volatility, note: `${(Math.abs(p.changePct)).toFixed(2)}% day vs ${ref}% typical` },
      { label: "Session Liquidity", value: liquidity, note: session.name },
    ];

    return {
      technical, risk, sentiment, volatility, liquidity, composite, verdict,
      locks, session: session.name, bias, momentum, ticks: stats.n, factors,
      confirmation, winRate: brain?.winRate ?? null, expectancy: brain?.expectancy ?? null,
    };
  }
}

export function useEXAScores(pair = "EURUSD"): EXAScores {
  const { prices } = usePrices();
  const [scores, setScores] = useState<EXAScores>(EMPTY);

  useEffect(() => {
    if (!prices[pair]) return;
    setScores(computeEXAScores(pair, prices));
  }, [prices, pair]);

  return scores;
}

export interface ScanRow { pair: string; scores: EXAScores; }

// Live multi-asset scan — real EXA scores for every pair from one price feed.
// Pass a stable (module-constant) `pairs` array to avoid re-running every render.
export function useEXAScan(pairs: string[]): ScanRow[] {
  const { prices } = usePrices();
  const [scan, setScan] = useState<ScanRow[]>([]);

  useEffect(() => {
    const rows = pairs.filter((p) => prices[p]).map((p) => ({ pair: p, scores: computeEXAScores(p, prices) }));
    setScan(rows);
  }, [prices, pairs]);

  return scan;
}
