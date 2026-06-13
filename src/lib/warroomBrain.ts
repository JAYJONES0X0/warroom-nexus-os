// WARROOM BRAIN — real trading intelligence, encoded.
// Sourced from the WARROOM NEXUS brain export (asset playbooks + correlation
// matrix engine, backtested 2023–2025). This is the institutional layer that a
// charting tool can't give you: backtested edge per asset, live cross-asset
// correlation confirmation, and liquidity-magnet (round-number) proximity.

export interface AssetPattern { name: string; winRate: number; }
export interface AssetBrain {
  label: string;
  classification: string;
  winRate: number | null;     // backtested overall, %
  avgRR: string | null;       // e.g. "1:3.5"
  expectancy: string | null;  // e.g. "+1.52R"
  adr: string;                // average daily range
  sessions: string[];         // optimal sessions
  roundStep: number;          // spacing of round-number liquidity magnets
  edge: string;               // one-line institutional read
  patterns?: AssetPattern[];  // top backtested setups
}

// ── Per-asset brain (figures are real backtested footers from the playbooks) ──
export const ASSET_BRAIN: Record<string, AssetBrain> = {
  EURUSD: { label: "EUR/USD", classification: "Major Forex", winRate: 68, avgRR: "1:3.2", expectancy: "+1.18R", adr: "60–100 pips", sessions: ["London", "NY"], roundStep: 0.01, edge: "Most liquid pair on earth — textbook liquidity sweeps", patterns: [{ name: "London Sweep → NY Reversal", winRate: 73 }, { name: "CPI/NFP Pre-News Accumulation", winRate: 78 }, { name: "NY Open Liquidity Grab", winRate: 68 }] },
  GBPUSD: { label: "GBP/USD", classification: "Major Forex", winRate: 64, avgRR: "1:2.8", expectancy: "+0.79R", adr: "80–150 pips (2× EURUSD)", sessions: ["London", "NY"], roundStep: 0.01, edge: "Double EURUSD's range — bigger sweeps, wider stops" },
  USDJPY: { label: "USD/JPY", classification: "Major Forex", winRate: 71, avgRR: "1:3.0", expectancy: "+1.13R", adr: "60–120 pips", sessions: ["Tokyo", "NY"], roundStep: 0.5, edge: "Yield-driven — tracks the US 10Y; 3rd-highest expectancy" },
  GBPJPY: { label: "GBP/JPY", classification: "High-volatility cross", winRate: null, avgRR: null, expectancy: null, adr: "150–250 pips", sessions: ["London", "Tokyo"], roundStep: 1.0, edge: "'The Beast' — highest-volatility major cross, GBP × JPY" },
  AUDUSD: { label: "AUD/USD", classification: "Commodity currency major", winRate: null, avgRR: null, expectancy: null, adr: "50–90 pips", sessions: ["Asia", "NY"], roundStep: 0.01, edge: "Risk-on proxy — tracks SPX and metals" },
  NZDUSD: { label: "NZD/USD", classification: "Commodity currency minor", winRate: null, avgRR: null, expectancy: null, adr: "50–80 pips", sessions: ["Asia", "NY"], roundStep: 0.01, edge: "AUD's twin (+0.92) — confirm with AUDUSD" },
  XAUUSD: { label: "XAU/USD", classification: "Commodity / Safe-haven", winRate: 72, avgRR: "1:3.5", expectancy: "+1.52R", adr: "$20–50", sessions: ["London", "NY"], roundStep: 50, edge: "Highest expectancy in WARROOM — the macro beast", patterns: [{ name: "Pre-CPI → Post-CPI Delivery", winRate: 82 }, { name: "FOMC Rate-Decision Trap", winRate: 79 }, { name: "London Sweep → NY Reversal", winRate: 76 }] },
  BTCUSD: { label: "BTC/USD", classification: "Crypto / Risk asset", winRate: 66, avgRR: "1:2.9", expectancy: "+0.91R", adr: "$1k–3k", sessions: ["NY", "Weekend"], roundStep: 1000, edge: "Risk-on proxy — tracks NAS100, inverse to VIX" },
  NAS100: { label: "NAS100", classification: "Equity index / Risk asset", winRate: 74, avgRR: "1:3.1", expectancy: "+1.29R", adr: "150–300 pts", sessions: ["NY", "Pre-Market"], roundStep: 500, edge: "2nd-highest expectancy — pure risk-on engine", patterns: [{ name: "NY Open Drive", winRate: 74 }] },
  SPX: { label: "SPX500", classification: "Equity index / Risk asset", winRate: 73, avgRR: "1:3.0", expectancy: "+1.19R", adr: "30–80 pts", sessions: ["NY", "Pre-Market"], roundStep: 50, edge: "4th-highest expectancy — the risk-on benchmark" },
  DXY: { label: "DXY", classification: "Currency index", winRate: null, avgRR: null, expectancy: null, adr: "30–80 pips", sessions: ["London", "NY"], roundStep: 1.0, edge: "The dollar's pulse — inverse to almost everything" },
};

// ── Correlation matrix (coefficients from the WARROOM correlation engine) ─────
// Only counterparties present in the live feed are listed, so confirmation can
// actually be computed. `derived` flags coefficients inferred from the playbook
// direction where the matrix gave only a qualitative relationship.
export interface CorrLink { asset: string; rho: number; derived?: boolean; }
export const CORRELATIONS: Record<string, CorrLink[]> = {
  EURUSD: [{ asset: "DXY", rho: -0.95 }, { asset: "GBPUSD", rho: 0.85 }, { asset: "XAUUSD", rho: 0.70 }],
  GBPUSD: [{ asset: "DXY", rho: -0.90 }, { asset: "EURUSD", rho: 0.85 }],
  USDJPY: [{ asset: "DXY", rho: 0.70, derived: true }],
  GBPJPY: [{ asset: "GBPUSD", rho: 0.75, derived: true }, { asset: "USDJPY", rho: 0.70, derived: true }],
  AUDUSD: [{ asset: "DXY", rho: -0.85 }, { asset: "NZDUSD", rho: 0.92 }, { asset: "SPX", rho: 0.70 }],
  NZDUSD: [{ asset: "AUDUSD", rho: 0.92 }, { asset: "DXY", rho: -0.80, derived: true }],
  XAUUSD: [{ asset: "DXY", rho: -0.75 }, { asset: "EURUSD", rho: 0.70 }],
  BTCUSD: [{ asset: "NAS100", rho: 0.65, derived: true }, { asset: "SPX", rho: 0.60, derived: true }],
  NAS100: [{ asset: "SPX", rho: 0.95 }, { asset: "BTCUSD", rho: 0.65, derived: true }],
  SPX: [{ asset: "NAS100", rho: 0.95 }, { asset: "AUDUSD", rho: 0.70 }],
  DXY: [{ asset: "EURUSD", rho: -0.95 }, { asset: "GBPUSD", rho: -0.90 }, { asset: "XAUUSD", rho: -0.75 }, { asset: "AUDUSD", rho: -0.85 }, { asset: "USDJPY", rho: 0.70, derived: true }],
};

type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";
type Px = Record<string, { changePct: number }>;

export interface CorrCheck { asset: string; rho: number; expected: "up" | "down"; actual: number; ok: boolean; derived?: boolean; }
export interface CorrelationResult {
  confirms: number;
  denies: number;
  neutral: number;
  total: number;
  score: number;                                   // 0-100 confirmation strength
  confidence: "HIGH" | "MODERATE" | "STAND ASIDE"; // per WARROOM decision matrix
  checks: CorrCheck[];
}

// Live cross-asset confirmation, straight from the WARROOM decision matrix:
// for a given directional bias, each correlated asset SHOULD move with the sign
// of its coefficient. 3+ confirmations = HIGH, 2 = MODERATE, 0–1 = divergence
// (stand aside). Correlation is a SECONDARY filter — never the primary signal.
export function correlationConfirmation(symbol: string, bias: Bias, prices: Px): CorrelationResult {
  const links = CORRELATIONS[symbol] ?? [];
  const dir = bias === "BULLISH" ? 1 : bias === "BEARISH" ? -1 : 0;
  const NEUTRAL_BAND = 0.03; // % move below which a counterparty reads as flat
  const checks: CorrCheck[] = [];
  let confirms = 0, denies = 0, neutral = 0;

  for (const { asset, rho, derived } of links) {
    const cp = prices[asset]?.changePct;
    const expectedDir = dir * Math.sign(rho); // where the counterparty should go
    const expected: "up" | "down" = expectedDir >= 0 ? "up" : "down";
    if (cp == null || dir === 0 || Math.abs(cp) < NEUTRAL_BAND) {
      neutral++;
      checks.push({ asset, rho, expected, actual: cp ?? 0, ok: false, derived });
      continue;
    }
    const ok = Math.sign(cp) === expectedDir;
    if (ok) confirms++; else denies++;
    checks.push({ asset, rho, expected, actual: cp, ok, derived });
  }

  const decisive = confirms + denies;
  const score = decisive ? Math.round((confirms / decisive) * 100) : 0;
  const confidence: CorrelationResult["confidence"] =
    confirms >= 3 ? "HIGH" : confirms >= 2 ? "MODERATE" : "STAND ASIDE";

  return { confirms, denies, neutral, total: links.length, score, confidence, checks };
}

export interface RoundMagnet { nearest: number; distPct: number; atMagnet: boolean; label: string; }

// Round numbers are where retail stops cluster — the primary liquidity magnets
// the playbooks key on. Flags when price is sitting on one (sweep risk).
export function roundNumberProximity(symbol: string, price: number): RoundMagnet | null {
  const step = ASSET_BRAIN[symbol]?.roundStep;
  if (!step || !price) return null;
  const nearest = Math.round(price / step) * step;
  const distPct = Math.abs(price - nearest) / price * 100;
  const atMagnet = distPct < 0.08;
  const dec = step < 1 ? (step < 0.1 ? 4 : 2) : step >= 100 ? 0 : 2;
  return {
    nearest,
    distPct,
    atMagnet,
    label: atMagnet ? `AT magnet ${nearest.toFixed(dec)}` : `${distPct.toFixed(2)}% from ${nearest.toFixed(dec)}`,
  };
}
