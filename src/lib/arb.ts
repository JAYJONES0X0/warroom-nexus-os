// ARB ENGINE — the one claim in this app that can be right by construction.
//
// A negRisk Polymarket event groups N mutually-exclusive binary markets ("Will X
// win?") where EXACTLY ONE resolves YES. That structure creates a mechanical edge:
// if you can buy a complete basket for less than its guaranteed payout, the profit
// is arithmetic, not a prediction.
//
// DOCTRINE (load-bearing): Gamma displayed prices make CANDIDATES. Only walked CLOB
// ask-depth, after fees + slippage, makes an EXECUTABLE edge. "Guaranteed" is earned,
// never assumed. Every function below keeps theory and execution strictly separate.

// ── Status taxonomy ──────────────────────────────────────────────────────────
export type ArbType = "BUY_ALL_YES" | "BUY_ALL_NO";

export type EdgeStatus =
  | "NO_EDGE"            // priced efficiently after friction
  | "THEORETICAL_EDGE"   // Gamma Σ suggests arb; NOT orderbook-confirmed
  | "EXECUTABLE_EDGE"    // CLOB asks confirm a fillable, gross-positive basket
  | "LIVE_EDGE"          // executable AND net-positive after friction AND fresh
  | "INSUFFICIENT_DEPTH" // arb exists but can't fill the minimum order size
  | "STALE_DATA"         // book too old to trust — recheck required
  | "AUGMENTED_WATCH"    // negRiskAugmented / negRiskOther / "Other" — watch only
  | "REJECTED";          // failed an integrity gate (reason recorded)

// ── Discovery shapes (from Gamma) ────────────────────────────────────────────
export interface CandidateMarket {
  id: string;
  question: string;          // outcome label (groupItemTitle preferred)
  yesTokenId: string | null; // clobTokenIds[0]
  noTokenId: string | null;  // clobTokenIds[1]
  yesPrice: number;          // outcomePrices[0]
  noPrice: number;           // outcomePrices[1]
  liquidity: number;
  enableOrderBook: boolean;
  acceptingOrders: boolean;
  feesEnabled: boolean;
  feeRateBps: number;        // takerBaseFee (basis points; only used if feesEnabled)
}

export interface CandidateEvent {
  id: string;
  title: string;
  negRisk: boolean;
  negRiskAugmented: boolean;
  negRiskOther: boolean;
  endDate: string | null;
  markets: CandidateMarket[];
}

// ── Execution shapes (from CLOB /book) ───────────────────────────────────────
export interface BookLevel { price: number; size: number; }
export interface OrderBook {
  tokenId: string;
  asks: BookLevel[];   // raw — we NEVER trust its sort; we sort locally
  timestamp: number;   // ms epoch the book snapshot was taken (CLOB `timestamp`)
  hash: string;
  minOrderSize: number;
  tickSize: number;
}

// ── Output shapes ────────────────────────────────────────────────────────────
export interface ArbLeg {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  tokenId: string | null;
  displayPrice: number;       // Gamma price (discovery)
  fillPrice?: number;         // weighted-avg ask fill (execution)
  fillableShares?: number;    // ask depth available on this leg
  bookAgeMs?: number;
  bookHash?: string;
}

export interface TheoreticalArb {
  arbType: ArbType | null;
  sumYes: number;
  legCount: number;
  theoreticalCostPerShare: number | null; // BUY_ALL_YES: Σyes ; BUY_ALL_NO: N−Σyes
  payoutPerShare: number | null;          // BUY_ALL_YES: 1 ; BUY_ALL_NO: N−1
  theoreticalReturnPct: number | null;
  distFromArbBps: number;                 // |Σyes − 1| in basis points
}

export interface ArbEdge {
  eventId: string;
  eventTitle: string;
  status: EdgeStatus;
  arbType: ArbType | null;
  legCount: number;
  endDate: string | null;

  sumYes: number;
  theoreticalReturnPct: number | null;
  distFromArbBps: number;

  // execution (null until CLOB-verified)
  executableCost: number | null;          // $ to deploy for the profitable basket
  payout: number | null;                  // $ the profitable basket returns
  maxExecutableShares: number | null;     // profitable capacity, in basket shares
  maxExecutableStakeUsd: number | null;   // = executableCost
  weakestLeg: string | null;

  // friction-decomposed (never one mystery number)
  grossProfitUsd: number | null;
  estimatedFeeUsd: number | null;
  estimatedSlippageUsd: number | null;
  safetyBufferUsd: number | null;
  netProfitUsd: number | null;
  netReturnPct: number | null;

  // requested-stake view
  requestedStakeUsd: number;
  profitAtRequestedStake: number | null;

  // freshness / provenance
  dataAgeMs: number | null;
  bookHashes: string[];

  rejectedReasons: string[];
  legs: ArbLeg[];
}

// ── Tunables ─────────────────────────────────────────────────────────────────
export const LIVE_MIN_NET_RETURN_PCT = 1.5; // below this, executable but not LIVE
export const SAFETY_BUFFER_PCT = 0.5;        // haircut on cost, models residual slippage
export const FRESH_MS = 15_000;              // books older than this can never be LIVE
export const MAX_VERIFY_LEGS = 8;            // legs above this → SCALE WATCH, not verified

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// ── 1. THEORETICAL — from Gamma prices ONLY. Never used for a live decision. ──
export function computeTheoreticalArb(ev: CandidateEvent): TheoreticalArb {
  const legs = ev.markets;
  const N = legs.length;
  const sumYes = r4(legs.reduce((s, m) => s + m.yesPrice, 0));
  const distFromArbBps = Math.round(Math.abs(sumYes - 1) * 10000);

  if (N < 2 || sumYes <= 0) {
    return { arbType: null, sumYes, legCount: N, theoreticalCostPerShare: null, payoutPerShare: null, theoreticalReturnPct: null, distFromArbBps };
  }
  if (sumYes < 1) {
    const cost = sumYes, payout = 1;
    return { arbType: "BUY_ALL_YES", sumYes, legCount: N, theoreticalCostPerShare: cost, payoutPerShare: payout, theoreticalReturnPct: r2(((payout - cost) / cost) * 100), distFromArbBps };
  }
  if (sumYes > 1) {
    const cost = N - sumYes, payout = N - 1;
    // cost is positive whenever sumYes < N, i.e. always for a real book.
    const ret = cost > 0 ? r2(((payout - cost) / cost) * 100) : null;
    return { arbType: "BUY_ALL_NO", sumYes, legCount: N, theoreticalCostPerShare: cost, payoutPerShare: payout, theoreticalReturnPct: ret, distFromArbBps };
  }
  return { arbType: null, sumYes, legCount: N, theoreticalCostPerShare: null, payoutPerShare: null, theoreticalReturnPct: null, distFromArbBps };
}

// ── Merged marginal walk: exact profitable capacity across all legs ───────────
// Asks are sorted ASCENDING locally first (CLOB sort is never trusted). We add
// basket shares while the marginal cost — the sum of each leg's current cheapest
// ask — stays below the per-share payout. That boundary IS the executable edge.
interface BasketFill {
  shares: number;          // profitable basket shares
  cost: number;            // $ spent to acquire them
  perLegFill: number[];    // weighted-avg fill price per leg
  perLegShares: number[];  // depth consumed per leg (= shares for a complete basket)
  weakestLegIndex: number; // leg that capped capacity (-1 = profit boundary, not depth)
  depthLimited: boolean;
}

function walkBasket(asksPerLeg: BookLevel[][], payoutPerShare: number): BasketFill {
  const n = asksPerLeg.length;
  const books = asksPerLeg.map((a) => [...a].sort((x, y) => x.price - y.price)); // local ascending sort
  const ptr = new Array(n).fill(0);
  const remAtLevel = books.map((b) => (b[0]?.size ?? 0));
  const legCost = new Array(n).fill(0);
  const legShares = new Array(n).fill(0);
  let shares = 0, cost = 0, weakestLegIndex = -1, depthLimited = false;

  for (;;) {
    let depthOut = -1;
    for (let i = 0; i < n; i++) if (ptr[i] >= books[i].length) { depthOut = i; break; }
    if (depthOut >= 0) { weakestLegIndex = depthOut; depthLimited = true; break; }

    const marginal = books.reduce((s, b, i) => s + b[ptr[i]].price, 0);
    if (marginal >= payoutPerShare) break; // no further profitable share

    let step = Infinity;
    for (let i = 0; i < n; i++) step = Math.min(step, remAtLevel[i]);
    if (!(step > 0) || !isFinite(step)) break;

    shares += step;
    cost += step * marginal;
    for (let i = 0; i < n; i++) {
      const p = books[i][ptr[i]].price;
      legCost[i] += step * p;
      legShares[i] += step;
      remAtLevel[i] -= step;
      if (remAtLevel[i] <= 1e-9) { ptr[i]++; remAtLevel[i] = books[i][ptr[i]]?.size ?? 0; }
    }
  }

  const perLegFill = legShares.map((s, i) => (s > 0 ? r4(legCost[i] / s) : 0));
  return { shares: r4(shares), cost: r4(cost), perLegFill, perLegShares: legShares, weakestLegIndex, depthLimited };
}

// ── 2. EXECUTABLE — walk REAL asks. Equal shares per leg, not equal dollars. ──
export interface ExecutableBasket {
  fillable: boolean;
  arbType: ArbType;
  shares: number;
  cost: number;
  payout: number;
  perLegFill: number[];
  weakestLegIndex: number;
  belowMinSize: boolean;
  dataAgeMs: number;
  bookHashes: string[];
  legSide: "YES" | "NO";
  legTokenIds: (string | null)[];
}

export function verifyExecutableBasket(
  ev: CandidateEvent,
  theo: TheoreticalArb,
  books: Map<string, OrderBook>,
  now: number,
): ExecutableBasket | null {
  if (!theo.arbType || theo.payoutPerShare == null) return null;
  const side: "YES" | "NO" = theo.arbType === "BUY_ALL_YES" ? "YES" : "NO";
  const tokenIds = ev.markets.map((m) => (side === "YES" ? m.yesTokenId : m.noTokenId));

  const legBooks: OrderBook[] = [];
  for (const tid of tokenIds) {
    const b = tid ? books.get(tid) : undefined;
    if (!b || !b.asks?.length) return null; // a missing leg means no executable claim
    legBooks.push(b);
  }

  const fill = walkBasket(legBooks.map((b) => b.asks), theo.payoutPerShare);
  const payout = fill.shares * theo.payoutPerShare;
  const dataAgeMs = now - Math.min(...legBooks.map((b) => b.timestamp || 0));
  // A leg whose profitable capacity is below its own min order size can't be placed.
  const belowMinSize = fill.shares <= 0 || legBooks.some((b) => fill.shares < (b.minOrderSize || 0));

  return {
    fillable: fill.shares > 0,
    arbType: theo.arbType,
    shares: fill.shares,
    cost: fill.cost,
    payout: r4(payout),
    perLegFill: fill.perLegFill,
    weakestLegIndex: fill.weakestLegIndex,
    belowMinSize,
    dataAgeMs,
    bookHashes: legBooks.map((b) => b.hash),
    legSide: side,
    legTokenIds: tokenIds,
  };
}

// ── 3. NET — friction broken out, then classified. Stale can NEVER be LIVE. ───
export function computeNetEdge(
  ev: CandidateEvent,
  theo: TheoreticalArb,
  exec: ExecutableBasket | null,
  requestedStakeUsd: number,
): ArbEdge {
  const reasons: string[] = [];
  const augmented = ev.negRiskAugmented || ev.negRiskOther || ev.markets.some((m) => /\bother\b/i.test(m.question));

  const legs: ArbLeg[] = ev.markets.map((m, i) => ({
    marketId: m.id,
    question: m.question,
    side: theo.arbType === "BUY_ALL_NO" ? "NO" : "YES",
    tokenId: theo.arbType === "BUY_ALL_NO" ? m.noTokenId : m.yesTokenId,
    displayPrice: theo.arbType === "BUY_ALL_NO" ? m.noPrice : m.yesPrice,
    fillPrice: exec?.perLegFill[i],
    fillableShares: exec?.shares,
    bookAgeMs: exec?.dataAgeMs,
    bookHash: exec?.bookHashes[i],
  }));

  const base: ArbEdge = {
    eventId: ev.id, eventTitle: ev.title, status: "NO_EDGE", arbType: theo.arbType,
    legCount: theo.legCount, endDate: ev.endDate, sumYes: theo.sumYes,
    theoreticalReturnPct: theo.theoreticalReturnPct, distFromArbBps: theo.distFromArbBps,
    executableCost: null, payout: null, maxExecutableShares: null, maxExecutableStakeUsd: null,
    weakestLeg: null, grossProfitUsd: null, estimatedFeeUsd: null, estimatedSlippageUsd: null,
    safetyBufferUsd: null, netProfitUsd: null, netReturnPct: null,
    requestedStakeUsd, profitAtRequestedStake: null, dataAgeMs: exec?.dataAgeMs ?? null,
    bookHashes: exec?.bookHashes ?? [], rejectedReasons: reasons, legs,
  };

  // No theoretical arb at all.
  if (!theo.arbType || theo.payoutPerShare == null || theo.theoreticalCostPerShare == null) {
    return { ...base, status: "NO_EDGE" };
  }
  // Augmented / "Other" universe is not a clean exhaustive basket → watch only.
  if (augmented) { reasons.push("augmented / 'Other' outcome present — basket not provably exhaustive"); return { ...base, status: "AUGMENTED_WATCH" }; }
  // Too many legs to verify / execute sanely.
  if (theo.legCount > MAX_VERIFY_LEGS) { reasons.push(`${theo.legCount} legs — scale watch, not executable at small size`); return { ...base, status: "THEORETICAL_EDGE" }; }
  // Order books unavailable → we only have theory.
  if (!exec) { reasons.push("orderbook unavailable — theoretical only, needs CLOB confirmation"); return { ...base, status: "THEORETICAL_EDGE" }; }

  const weakestLeg = exec.weakestLegIndex >= 0 ? ev.markets[exec.weakestLegIndex]?.question ?? null : null;

  // CLOB confirms the displayed arb does not survive a real walk (already captured).
  if (!exec.fillable || exec.shares <= 0) {
    reasons.push("displayed arb does not survive an orderbook walk — likely already captured");
    return { ...base, status: "THEORETICAL_EDGE", weakestLeg };
  }

  // Friction, decomposed.
  const grossProfit = exec.payout - exec.cost;
  const feesEnabled = ev.markets.some((m) => m.feesEnabled);
  let fee = 0;
  if (feesEnabled) {
    // Per-share, per-leg, symmetric (peaks at p=0.5): shares × rate × p × (1−p).
    for (let i = 0; i < ev.markets.length; i++) {
      const rate = (ev.markets[i].feeRateBps || 0) / 10_000;
      const p = exec.perLegFill[i];
      fee += exec.shares * rate * p * (1 - p);
    }
  }
  const buffer = exec.cost * (SAFETY_BUFFER_PCT / 100);
  // Slippage = what the real walk cost above the Gamma-implied price for the same
  // shares. It already lives in `exec.cost`; we surface it as its own number.
  const idealCost = exec.shares * theo.theoreticalCostPerShare;
  const slippage = Math.max(0, exec.cost - idealCost);

  const netProfit = grossProfit - fee - buffer;
  const netReturnPct = exec.cost > 0 ? (netProfit / exec.cost) * 100 : 0;
  const stale = exec.dataAgeMs > FRESH_MS;

  // Requested-stake view: scale to the smaller of requested capacity and real capacity.
  const reqShares = theo.theoreticalCostPerShare > 0 ? requestedStakeUsd / theo.theoreticalCostPerShare : 0;
  const usableShares = Math.min(reqShares, exec.shares);
  const profitAtRequested = exec.shares > 0 ? r2((netProfit) * (usableShares / exec.shares)) : 0;

  const filled: ArbEdge = {
    ...base,
    executableCost: r2(exec.cost),
    payout: r2(exec.payout),
    maxExecutableShares: Math.round(exec.shares),
    maxExecutableStakeUsd: r2(exec.cost),
    weakestLeg,
    grossProfitUsd: r2(grossProfit),
    estimatedFeeUsd: r2(fee),
    estimatedSlippageUsd: r2(slippage),
    safetyBufferUsd: r2(buffer),
    netProfitUsd: r2(netProfit),
    netReturnPct: r2(netReturnPct),
    profitAtRequestedStake: profitAtRequested,
    dataAgeMs: exec.dataAgeMs,
    bookHashes: exec.bookHashes,
  };

  // Below minimum order size → real arb, but you physically can't place it.
  if (exec.belowMinSize) { reasons.push("profitable size below the market minimum order size"); return { ...filled, status: "INSUFFICIENT_DEPTH" }; }
  // Stale book can NEVER be called LIVE — recheck required.
  if (stale) { reasons.push(`book is ${Math.round(exec.dataAgeMs / 1000)}s old — recheck required`); return { ...filled, status: "STALE_DATA" }; }
  // Gross-positive but net friction eats it below the LIVE bar.
  if (netReturnPct < LIVE_MIN_NET_RETURN_PCT) { reasons.push(`net ${r2(netReturnPct)}% after friction — below the ${LIVE_MIN_NET_RETURN_PCT}% LIVE bar`); return { ...filled, status: netProfit > 0 ? "EXECUTABLE_EDGE" : "NO_EDGE" }; }

  // Fresh, executable, net-positive above the bar, non-augmented → LIVE.
  return { ...filled, status: "LIVE_EDGE" };
}

// ── One-shot: discovery → (optional) execution → classification ──────────────
export function evaluateEvent(
  ev: CandidateEvent,
  books: Map<string, OrderBook> | null,
  requestedStakeUsd: number,
  now: number = Date.now(),
): ArbEdge {
  const theo = computeTheoreticalArb(ev);
  const exec = books ? verifyExecutableBasket(ev, theo, books, now) : null;
  return computeNetEdge(ev, theo, exec, requestedStakeUsd);
}

// Ranking: LIVE first, then by tier, net return, capacity, fewest legs, freshest.
const TIER: Record<EdgeStatus, number> = {
  LIVE_EDGE: 0, EXECUTABLE_EDGE: 1, INSUFFICIENT_DEPTH: 2, STALE_DATA: 3,
  THEORETICAL_EDGE: 4, AUGMENTED_WATCH: 5, NO_EDGE: 6, REJECTED: 7,
};
export function rankEdges(a: ArbEdge, b: ArbEdge): number {
  if (TIER[a.status] !== TIER[b.status]) return TIER[a.status] - TIER[b.status];
  const nr = (b.netReturnPct ?? -1e9) - (a.netReturnPct ?? -1e9);
  if (nr !== 0) return nr;
  const cap = (b.maxExecutableStakeUsd ?? 0) - (a.maxExecutableStakeUsd ?? 0);
  if (cap !== 0) return cap;
  if (a.legCount !== b.legCount) return a.legCount - b.legCount;
  return (a.dataAgeMs ?? 1e9) - (b.dataAgeMs ?? 1e9);
}
