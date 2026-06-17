export type CommandState =
  | "AUTHORIZE"
  | "DELAY"
  | "DENY"
  | "MONITOR"
  | "INVALIDATED"
  | "MISSING_DATA";

export type Direction = "LONG" | "SHORT" | "NEUTRAL";
export type AccountMode = "Demo" | "Personal" | "Prop Firm" | "Institutional" | "Custom";

export interface AssetMeta {
  key: string;
  label: string;
  category: "FX" | "COMM" | "INDEX" | "CRYPTO";
  decimals: number;
  pipSize: number;
  pipValuePerLot: number;
}

export const WARROOM_ASSETS: AssetMeta[] = [
  { key: "EURUSD", label: "EUR/USD", category: "FX", decimals: 5, pipSize: 0.0001, pipValuePerLot: 10 },
  { key: "GBPUSD", label: "GBP/USD", category: "FX", decimals: 5, pipSize: 0.0001, pipValuePerLot: 10 },
  { key: "USDJPY", label: "USD/JPY", category: "FX", decimals: 3, pipSize: 0.01, pipValuePerLot: 9.2 },
  { key: "DXY", label: "DXY", category: "FX", decimals: 3, pipSize: 0.01, pipValuePerLot: 1 },
  { key: "XAUUSD", label: "XAU/USD", category: "COMM", decimals: 2, pipSize: 0.1, pipValuePerLot: 10 },
  { key: "NAS100", label: "NAS100", category: "INDEX", decimals: 0, pipSize: 1, pipValuePerLot: 1 },
  { key: "SPX", label: "SPX500", category: "INDEX", decimals: 0, pipSize: 1, pipValuePerLot: 1 },
  { key: "BTCUSD", label: "BTC/USD", category: "CRYPTO", decimals: 0, pipSize: 1, pipValuePerLot: 1 },
];

export const WARROOM_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"] as const;
export type WarroomTimeframe = typeof WARROOM_TIMEFRAMES[number];

export interface AccountProfile {
  mode: AccountMode;
  balance: number;
  currency: "GBP" | "USD" | "EUR";
  riskPct: number;
  maxDailyLossPct: number;
  maxOpenTrades: number;
}

export interface QuoteState {
  asset: string;
  price: number;
  bid?: number;
  ask?: number;
  source: string;
  timestamp: number;
  stale: boolean;
}

export interface ConfluenceState {
  score: number;
  reasons: string[];
  blockers: string[];
}

export interface SetupState {
  command: CommandState;
  direction: Direction;
  entry?: number | string;
  stop?: number | string;
  tp1?: number | string;
  tp2?: number | string;
  rr?: string;
  invalidation?: string;
  nextCheck?: string;
}

export interface WarroomState {
  selectedAsset: string;
  selectedTimeframe: WarroomTimeframe;
  selectedSession: string;
  accountProfile: AccountProfile;
  liveQuote: QuoteState | null;
  chartContext: unknown | null;
  structureContext: unknown | null;
  confluence: ConfluenceState;
  setup: SetupState;
  correlationState: unknown | null;
  aiContext: unknown | null;
  alerts: unknown[];
  drawings: unknown[];
  journalDraft: unknown | null;
}

export interface CommandDecision extends SetupState {
  confluence: ConfluenceState;
  missingData: string[];
}

export function getAssetMeta(asset: string): AssetMeta {
  return WARROOM_ASSETS.find((a) => a.key === asset) ?? WARROOM_ASSETS[0];
}

export function formatPrice(asset: string, value?: number | string): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  const meta = getAssetMeta(asset);
  return value.toFixed(meta.decimals);
}

export function getSessionLabel(now = new Date()): string {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return "WEEKEND / CLOSED";
  if (h >= 7 && h < 10) return "LONDON KILLZONE";
  if (h >= 12.5 && h < 16) return "NY AM / OVERLAP";
  if (h >= 0 && h < 7) return "ASIA RANGE";
  if (h >= 16 && h < 21) return "NY PM / MANAGEMENT";
  return "DEAD ZONE";
}

export function isKillzone(session: string): boolean {
  return session.includes("KILLZONE") || session.includes("NY AM");
}

export function calculateRiskAmount(account: AccountProfile): number {
  return Math.max(0, account.balance * (account.riskPct / 100));
}

export function estimatePositionSize(args: {
  account: AccountProfile;
  asset: string;
  entry?: number | string;
  stop?: number | string;
}): { riskAmount: number; stopDistance: number | null; lots: number | null; note: string } {
  const riskAmount = calculateRiskAmount(args.account);
  const entry = typeof args.entry === "number" ? args.entry : Number(args.entry);
  const stop = typeof args.stop === "number" ? args.stop : Number(args.stop);
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry === stop) {
    return { riskAmount, stopDistance: null, lots: null, note: "Entry/stop required for lot size." };
  }
  const meta = getAssetMeta(args.asset);
  const stopDistance = Math.abs(entry - stop);
  const pips = stopDistance / meta.pipSize;
  if (!Number.isFinite(pips) || pips <= 0) {
    return { riskAmount, stopDistance: null, lots: null, note: "Invalid stop distance." };
  }
  const lots = riskAmount / (pips * meta.pipValuePerLot);
  return {
    riskAmount,
    stopDistance,
    lots: Math.max(0, lots),
    note: `${pips.toFixed(1)} pip/tick stop using ${args.account.riskPct}% risk.`,
  };
}

export function evaluateCommand(state: WarroomState): CommandDecision {
  const missingData: string[] = [];
  const blockers: string[] = [...state.confluence.blockers];
  const reasons: string[] = [...state.confluence.reasons];

  if (!state.liveQuote) missingData.push(`No live quote for ${state.selectedAsset}.`);
  if (state.liveQuote?.stale) missingData.push(`Quote for ${state.selectedAsset} is stale or demo-sourced.`);
  if (!state.structureContext) missingData.push("No current structure context / SMC map.");
  if (!state.correlationState) missingData.push("No DXY / correlation state.");
  if (!state.selectedSession) missingData.push("No valid session state.");

  if (missingData.length) {
    return {
      ...state.setup,
      command: "MISSING_DATA",
      direction: "NEUTRAL",
      confluence: {
        score: Math.min(state.confluence.score, 25),
        reasons,
        blockers: [...blockers, ...missingData],
      },
      missingData,
      nextCheck: "Load missing data, then reassess.",
    };
  }

  const sessionOK = isKillzone(state.selectedSession);
  if (!sessionOK) blockers.push(`Session is ${state.selectedSession}; action delayed outside prime window.`);
  if (state.confluence.score < 85) blockers.push(`Confluence ${state.confluence.score}% is below 85% authorization gate.`);

  const hasTradePlan = state.setup.entry != null && state.setup.stop != null && (state.setup.tp1 != null || state.setup.tp2 != null);
  if (!hasTradePlan) blockers.push("No complete entry/stop/target plan.");

  const command: CommandState =
    blockers.length > 0 ? "DELAY" :
    state.setup.command === "INVALIDATED" ? "INVALIDATED" :
    state.setup.direction === "NEUTRAL" ? "DENY" :
    "AUTHORIZE";

  return {
    ...state.setup,
    command,
    confluence: {
      score: state.confluence.score,
      reasons,
      blockers,
    },
    missingData,
    nextCheck: state.setup.nextCheck ?? (command === "AUTHORIZE" ? "Execute only if price tags entry." : "Wait for next confirmation candle."),
  };
}

// ── Session countdown ────────────────────────────────────────────────────────

export interface NextKillzone {
  label: string;
  minutesAway: number;
}

/** Returns the next upcoming killzone, or null if one is active right now. */
export function getNextKillzone(now = new Date()): NextKillzone | null {
  const day = now.getUTCDay();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const weekend = day === 0 || day === 6 || (day === 5 && h >= 21);

  // Active killzone now — nothing to countdown to
  if (!weekend && ((h >= 7 && h < 10) || (h >= 12.5 && h < 16))) return null;

  const mins = (hrs: number) => Math.round(hrs * 60);

  if (weekend) {
    // Days remaining to Monday 00:00 UTC
    const daysToMon = day === 0 ? 1 : day === 6 ? 2 : 3; // Sun=1, Sat=2, Fri-late=3
    const hoursToMon7 = (24 - h) + (daysToMon - 1) * 24 + 7;
    return { label: "London Killzone (Mon)", minutesAway: mins(hoursToMon7) };
  }

  if (h < 7) return { label: "London Killzone", minutesAway: mins(7 - h) };
  if (h >= 10 && h < 12.5) return { label: "NY/London Overlap", minutesAway: mins(12.5 - h) };
  // h >= 16 or edge: next is London Killzone the following morning
  return { label: "London Killzone", minutesAway: mins((24 - h) + 7) };
}

export function formatCountdown(minutesAway: number): string {
  if (minutesAway <= 0) return "NOW";
  const h = Math.floor(minutesAway / 60);
  const m = minutesAway % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const DEFAULT_WARROOM_STATE: WarroomState = {
  selectedAsset: "XAUUSD",
  selectedTimeframe: "15m",
  selectedSession: getSessionLabel(),
  accountProfile: {
    mode: "Personal",
    balance: 70000,
    currency: "GBP",
    riskPct: 1,
    maxDailyLossPct: 2,
    maxOpenTrades: 2,
  },
  liveQuote: null,
  chartContext: null,
  structureContext: null,
  confluence: {
    score: 0,
    reasons: [],
    blockers: ["Awaiting synced market data."],
  },
  setup: {
    command: "MISSING_DATA",
    direction: "NEUTRAL",
    nextCheck: "Load selected-asset data.",
  },
  correlationState: null,
  aiContext: null,
  alerts: [],
  drawings: [],
  journalDraft: null,
};
