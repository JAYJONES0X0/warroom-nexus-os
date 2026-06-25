import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrices } from "@/hooks/usePrices";
import { usePriceTick } from "@/hooks/usePriceTick";
import { useEXAScores, useEXAScan } from "@/hooks/useEXAScores";
import { useWarroom } from "@/context/WarroomStateContext";
import { ScreenAgent } from "@/components/ScreenAgent";
import {
  WARROOM_ASSETS,
  WARROOM_TIMEFRAMES,
  calculateRiskAmount,
  estimatePositionSize,
  evaluateCommand,
  formatPrice,
  formatCountdown,
  getAssetMeta,
  getNextKillzone,
  isKillzone,
  type JournalDraft,
  type WarroomTimeframe,
} from "@/lib/warroomCommand";

// Maps to exa.locks[0..3] from the 4-LOCKS framework
const LOCK_LABELS = ["Structure", "Liquidity", "Timing", "Confirmation"] as const;

// Stable array for useEXAScan — must be module-level to avoid re-running every render
const ALL_ASSETS = WARROOM_ASSETS.map((a) => a.key);

const statusStyle: Record<string, { label: string; fg: string; bg: string; border: string }> = {
  AUTHORIZE:    { label: "AUTHORIZE",    fg: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.45)" },
  DELAY:        { label: "DELAY",        fg: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.45)" },
  DENY:         { label: "DENY",         fg: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.45)" },
  MONITOR:      { label: "MONITOR",      fg: "#38bdf8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.45)" },
  INVALIDATED:  { label: "INVALIDATED",  fg: "#f43f5e", bg: "rgba(244,63,94,0.12)",   border: "rgba(244,63,94,0.45)" },
  MISSING_DATA: { label: "HALT — DATA INCOMPLETE", fg: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.45)" },
};

// ─── Provenance system — every panel tells what kind of truth it shows ────────
type ProvenanceState =
  | "LIVE" | "FRESH" | "STALE" | "DELAYED"
  | "SIMULATED" | "USER_INPUT" | "MODEL_INFERENCE"
  | "UNVERIFIED" | "MISSING";

const PROVENANCE_STYLE: Record<ProvenanceState, { label: string; color: string; bg: string }> = {
  LIVE:             { label: "LIVE",       color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  FRESH:            { label: "FRESH",      color: "#34d399", bg: "rgba(52,211,153,0.08)" },
  STALE:            { label: "STALE",      color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  DELAYED:          { label: "DELAYED",    color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  SIMULATED:        { label: "SIMULATED",  color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
  USER_INPUT:       { label: "USER INPUT", color: "#38bdf8", bg: "rgba(56,189,248,0.08)" },
  MODEL_INFERENCE:  { label: "MODEL",      color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  UNVERIFIED:       { label: "UNVERIFIED", color: "#6b7280", bg: "rgba(107,114,128,0.06)" },
  MISSING:          { label: "MISSING",    color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
};

function ProvenanceBadge({ state }: { state: ProvenanceState }) {
  const s = PROVENANCE_STYLE[state];
  return (
    <span style={{
      fontSize: "8px", fontWeight: "800", letterSpacing: "0.13em",
      padding: "1px 5px", borderRadius: "4px",
      color: s.color, background: s.bg, border: `1px solid ${s.color}28`,
      fontFamily: "monospace",
    }}>
      {s.label}
    </span>
  );
}

const VERDICT_DOT: Record<string, string> = {
  AUTHORIZED: "#10b981",
  DELAY:      "#f59e0b",
  DENIED:     "#ef4444",
};

const SESSION_RECOMMENDATION: Record<string, string> = {
  "LONDON KILLZONE":    "Prime execution window. High-probability setups active.",
  "NY AM / OVERLAP":    "High volatility overlap. Strong setups only.",
  "LONDON/NY OVERLAP":  "High volatility overlap. Strong setups only.",
  "LONDON SESSION":     "Standard session. Watch for continuation setups.",
  "NY PM / MANAGEMENT": "End of session. Manage open positions only.",
  "ASIA RANGE":         "Low volatility range. USDJPY and crypto preferred.",
  "WEEKEND / CLOSED":   "Market closed. Plan only. No execution.",
  "DEAD ZONE":          "Low liquidity. No new trades until next session.",
};

const SESSION_ACCENT: Record<string, string> = {
  "LONDON KILLZONE":   "#f59e0b",
  "NY AM":             "#10b981",
  "OVERLAP":           "#10b981",
  "LONDON SESSION":    "#6ee7b7",
  "NY PM":             "#38bdf8",
  "ASIA":              "#a855f7",
  "WEEKEND":           "#374151",
  "DEAD ZONE":         "#374151",
};

const shortAssetKey = (key: string) => {
  if (key === "USDJPY") return "JPY";
  if (key === "NAS100") return "NAS";
  if (key.length <= 4) return key;
  return key.slice(0, 3);
};

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass-card p-3">
      <div className="text-[8px] uppercase tracking-[0.2em] text-white/25">{label}</div>
      <div className="mt-1 text-sm font-black tabular-nums leading-tight" style={{ color: accent ?? "rgba(255,255,255,0.88)" }}>{value}</div>
    </div>
  );
}

function FactorBar({ label, value, note }: { label: string; value: number; note: string }) {
  const color = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="shrink-0 text-[9px] uppercase tracking-wider text-white/35">{label}</span>
        <span className="truncate text-right text-[8px] text-white/22">{note}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[3px] flex-1 rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, value)}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
          />
        </div>
        <span className="w-7 text-right text-[11px] font-black tabular-nums" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

const CommandScreen = () => {

  const {
    state,
    setAsset,
    setTimeframe,
    updateAccount,
    updateQuote,
    updateConfluence,
    updateSetup,
    setStructureReady,
    setCorrelationReady,
    updateJournalDraft,
  } = useWarroom();

  const { prices, fetchedAt, loading, error, source } = usePrices();
  const tick = usePriceTick(state.selectedAsset);
  const exa = useEXAScores(state.selectedAsset);
  const scan = useEXAScan(ALL_ASSETS);
  const navigate = useNavigate();

  // Wire live price feed → global quote state (5s polling fallback)
  useEffect(() => {
    const price = prices[state.selectedAsset];
    if (!price) { updateQuote(null); return; }
    const fetched = fetchedAt ? new Date(fetchedAt).getTime() : Date.now();
    updateQuote({
      asset: state.selectedAsset,
      price: price.price,
      source: source ?? "unknown",
      timestamp: fetched,
      stale: Date.now() - fetched > 30_000 || source === "error",
    });
  }, [prices, fetchedAt, source, state.selectedAsset, updateQuote]);

  // Wire WebSocket tick → overrides polled quote with real-time price
  useEffect(() => {
    if (!tick?.price) return;
    updateQuote({
      asset: state.selectedAsset,
      price: tick.price,
      source: "twelvedata-ws",
      timestamp: tick.timestamp * 1000,
      stale: false,
    });
  }, [tick, state.selectedAsset, updateQuote]);

  // Wire EXA scores → confluence + setup state
  useEffect(() => {
    if (!exa) return;
    const locksOn = exa.locks.filter(Boolean).length;
    updateConfluence({
      score: exa.composite,
      reasons: [
        `EXA verdict ${exa.verdict} · bias ${exa.bias}`,
        `Session: ${exa.session}`,
        `Locks: ${locksOn}/4 engaged`,
        ...(exa.factors ?? []).slice(0, 2).map((f) => `${f.label}: ${f.note}`),
      ],
      blockers: [
        ...(exa.verdict === "DENIED" ? ["EXA denied current conditions."] : []),
        ...(locksOn < 3 ? [`Only ${locksOn}/4 EXA locks engaged — need 3+.`] : []),
      ],
    });
    updateSetup({
      command: exa.verdict === "DELAY" ? "DELAY" : "DENY",
      direction: exa.bias === "BULLISH" ? "LONG" : exa.bias === "BEARISH" ? "SHORT" : "NEUTRAL",
      nextCheck: "Wait for full SMC structure map and risk plan before authorization.",
    });
  }, [exa, updateConfluence, updateSetup]);

  const decision = useMemo(() => evaluateCommand(state), [state]);
  const asset = getAssetMeta(state.selectedAsset);
  const style = statusStyle[decision.command] ?? statusStyle.MISSING_DATA;

  const risk = estimatePositionSize({
    account: state.accountProfile,
    asset: state.selectedAsset,
    entry: state.setup.entry,
    stop: state.setup.stop,
  });

  // Daily price change for selected asset
  const priceChange = prices[state.selectedAsset]?.changePct ?? null;

  // Auto R:R from entry / stop / TP1 — display only, not written to state
  const autoRR = useMemo(() => {
    const e = Number(state.setup.entry);
    const s = Number(state.setup.stop);
    const t = Number(state.setup.tp1);
    if (!isFinite(e) || !isFinite(s) || !isFinite(t) || e === s || e === t) return null;
    return (Math.abs(t - e) / Math.abs(s - e)).toFixed(2);
  }, [state.setup.entry, state.setup.stop, state.setup.tp1]);

  const locksActive = exa.locks.filter(Boolean).length;

  // Provenance for live quote — honest data state
  const quoteProv: ProvenanceState = !state.liveQuote ? "MISSING"
    : source === "error" ? "UNVERIFIED"
    : state.liveQuote.stale ? "STALE"
    : "LIVE";

  // Computed display values
  const sessionAccent = Object.entries(SESSION_ACCENT).find(([k]) => state.selectedSession.toUpperCase().includes(k))?.[1] ?? "#6b7280";
  const biasColor = decision.direction === "LONG" ? "#10b981" : decision.direction === "SHORT" ? "#ef4444" : "rgba(255,255,255,0.45)";
  const confluenceColor = decision.confluence.score >= 85 ? "#10b981" : decision.confluence.score >= 62 ? "#f59e0b" : "#ef4444";

  const commandDirective = (() => {
    switch (decision.command) {
      case "AUTHORIZE":
        return `Execute at entry. ${risk.lots != null ? `${risk.lots.toFixed(2)} lots.` : ""} Stops placed.`;
      case "DELAY": {
        const m = decision.missingData.slice(0, 2).join(", ");
        return m ? `Stand by. Missing: ${m}.` : "Stand by. Wait for confirmation.";
      }
      case "DENY":
        return "No trade. Conditions not met. Wait for next structure.";
      case "MISSING_DATA": {
        const m = decision.missingData.slice(0, 2).join(", ");
        return m ? `HALT — Missing: ${m}.` : "HALT — Enter asset data to evaluate.";
      }
      case "MONITOR":
        return "Watching conditions. Re-evaluate at next session.";
      case "INVALIDATED":
        return "Setup invalidated. Clear plan and restart analysis.";
      default:
        return "Awaiting asset data.";
    }
  })();

  // Live quote age counter — turns amber >15s, red >60s
  const [quoteAge, setQuoteAge] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setQuoteAge(
      !state.liveQuote ? null : Math.floor((Date.now() - state.liveQuote.timestamp) / 1000)
    );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.liveQuote?.timestamp]);

  // Auto-populate journal draft when AUTHORIZE conditions are fully met
  useEffect(() => {
    if (decision.command !== "AUTHORIZE") return;
    if (!state.setup.entry || !state.setup.stop || !state.setup.tp1) return;
    if (risk.lots == null) return;
    if (state.journalDraft) return; // don't overwrite user-edited draft
    updateJournalDraft({
      asset: state.selectedAsset,
      direction: decision.direction,
      entry: state.setup.entry,
      stop: state.setup.stop,
      tp1: state.setup.tp1,
      tp2: state.setup.tp2,
      rr: autoRR ? `${autoRR}:1` : undefined,
      lots: risk.lots,
      riskAmount: risk.riskAmount,
      session: state.selectedSession,
      timeframe: state.selectedTimeframe,
      timestamp: Date.now(),
      notes: "",
    } as JournalDraft);
  }, [decision.command, state.setup.entry, state.setup.stop, state.setup.tp1, risk.lots]);

  // Session countdown — updates every 60s
  const [nextKZ, setNextKZ] = useState(() => getNextKillzone());
  useEffect(() => {
    setNextKZ(getNextKillzone());
    const id = setInterval(() => setNextKZ(getNextKillzone()), 60_000);
    return () => clearInterval(id);
  }, []);

  // NEXUS-C system context — full warroom state bound to the agent
  const nexusCContext = useMemo(() => [
    "You are NEXUS-C, the WARROOM command-screen analyst. You are NOT a general chatbot.",
    "You receive live OS state. Respond ONLY in the fixed WARROOM READ format below.",
    "Never invent price levels. Never say 'looks interesting'. If data is missing, output MISSING_DATA.",
    "Keep each field to one line. No prose outside the format.",
    "",
    `Asset: ${asset.label}`,
    `Timeframe: ${state.selectedTimeframe}`,
    `Session: ${state.selectedSession}`,
    `Price: ${state.liveQuote ? formatPrice(state.selectedAsset, state.liveQuote.price) : "MISSING"}`,
    `Bias: ${decision.direction}`,
    `Command: ${decision.command}`,
    `Confluence: ${decision.confluence.score}%`,
    `Locks: ${locksActive}/4`,
    `Entry: ${formatPrice(state.selectedAsset, decision.entry)}`,
    `Stop: ${formatPrice(state.selectedAsset, decision.stop)}`,
    `TP1: ${formatPrice(state.selectedAsset, decision.tp1)}`,
    `TP2: ${formatPrice(state.selectedAsset, decision.tp2)}`,
    `R:R: ${autoRR ? `${autoRR}:1` : "—"}`,
    `Lot size: ${risk.lots != null ? risk.lots.toFixed(2) : "—"} (${risk.note})`,
    `Account: ${state.accountProfile.mode} · ${state.accountProfile.balance} ${state.accountProfile.currency} · ${state.accountProfile.riskPct}% risk = ${calculateRiskAmount(state.accountProfile).toFixed(2)} ${state.accountProfile.currency}`,
    `Max daily loss: ${state.accountProfile.maxDailyLossPct}% = ${(state.accountProfile.balance * state.accountProfile.maxDailyLossPct / 100).toFixed(2)} ${state.accountProfile.currency}`,
    `Blockers: ${decision.confluence.blockers.length ? decision.confluence.blockers.slice(0, 4).join(" | ") : "None"}`,
    `Missing: ${decision.missingData.length ? decision.missingData.join(" | ") : "None"}`,
    "",
    "Response format (use exactly):",
    "WARROOM READ",
    "Asset:",
    "Bias:",
    "Current phase:",
    "Setup status:",
    "Action:",
    "Lot size:",
    "Invalidation:",
    "Next check:",
    "Missing data:",
  ].join("\n"), [asset.label, state, decision, locksActive, autoRR, risk]);

  const aiRead = [
    "WARROOM READ",
    "",
    `Asset: ${asset.label}`,
    `Session: ${state.selectedSession}`,
    `Bias: ${decision.direction}`,
    `Current phase: ${decision.command}`,
    `Setup status: ${decision.confluence.score}% confluence · ${locksActive}/4 locks`,
    `Action: ${decision.command === "AUTHORIZE" ? "Execute only at entry conditions." : "Stand by. Do not force action."}`,
    `Entry: ${formatPrice(state.selectedAsset, decision.entry)}`,
    `Stop: ${formatPrice(state.selectedAsset, decision.stop)}`,
    `Targets: ${formatPrice(state.selectedAsset, decision.tp1)} / ${formatPrice(state.selectedAsset, decision.tp2)}`,
    `R:R: ${autoRR ? `${autoRR}:1` : "—"}`,
    `Lot size: ${risk.lots != null ? risk.lots.toFixed(2) : "—"}`,
    `Invalidation: ${decision.invalidation ?? "—"}`,
    `Next check: ${decision.nextCheck ?? "—"}`,
    `Missing data: ${decision.missingData.length ? decision.missingData.join(" | ") : "None"}`,
  ].join("\n");

  const journalDraftText = state.journalDraft ? [
    "WARROOM JOURNAL ENTRY",
    `Date: ${new Date(state.journalDraft.timestamp).toISOString().slice(0, 16).replace("T", " ")}`,
    `Asset: ${getAssetMeta(state.journalDraft.asset).label}`,
    `Direction: ${state.journalDraft.direction}`,
    `Entry: ${formatPrice(state.journalDraft.asset, state.journalDraft.entry)}`,
    `Stop: ${formatPrice(state.journalDraft.asset, state.journalDraft.stop)}`,
    `TP1: ${formatPrice(state.journalDraft.asset, state.journalDraft.tp1)}`,
    ...(state.journalDraft.rr ? [`R:R: ${state.journalDraft.rr}`] : []),
    `Lots: ${state.journalDraft.lots.toFixed(2)}`,
    `Risk: £${state.journalDraft.riskAmount.toFixed(2)}`,
    `Session: ${state.journalDraft.session}`,
    `Timeframe: ${state.journalDraft.timeframe}`,
    ...(state.journalDraft.notes ? [`Notes: ${state.journalDraft.notes}`] : []),
  ].join("\n") : "";

  return (
    <div className="min-h-screen bg-[#020508] text-white" style={{ fontFamily: "monospace" }}>
      <main className="grid gap-3 p-3 xl:grid-cols-[268px_1fr_348px]">

        {/* ── LEFT COLUMN ────────────────────────────────────────── */}
        <aside className="space-y-3">

          {/* Asset selector + constellation */}
          <section className="glass-card rounded-2xl p-3.5">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/25 mb-2">Asset</div>
            <select
              value={state.selectedAsset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
            >
              {WARROOM_ASSETS.map((a) => <option key={a.key} value={a.key}>{a.label} · {a.category}</option>)}
            </select>

            {/* Asset constellation */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {WARROOM_ASSETS.map((a) => {
                const row = scan.find((r) => r.pair === a.key);
                const dotColor = row ? (VERDICT_DOT[row.scores.verdict] ?? "#374151") : "#2d3748";
                const isSelected = a.key === state.selectedAsset;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAsset(a.key)}
                    className="flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all duration-150"
                    style={{
                      background: isSelected ? `${dotColor}15` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSelected ? `${dotColor}50` : "rgba(255,255,255,0.05)"}`,
                      boxShadow: isSelected ? `0 0 12px ${dotColor}18` : "none",
                    }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ background: dotColor, boxShadow: isSelected ? `0 0 6px ${dotColor}` : "none" }} />
                    <span className="text-[8px] font-black tabular-nums mt-0.5" style={{ color: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}>
                      {shortAssetKey(a.key)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[8px] uppercase tracking-[0.25em] text-white/25 mb-2">Timeframe</div>
            <select
              value={state.selectedTimeframe}
              onChange={(e) => setTimeframe(e.target.value as WarroomTimeframe)}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
            >
              {WARROOM_TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </section>

          {/* Account Model */}
          <section className="glass-card rounded-2xl p-3.5">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/25 mb-2">Account</div>
            <select
              value={state.accountProfile.mode}
              onChange={(e) => updateAccount({ mode: e.target.value as any })}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs font-black text-white outline-none"
            >
              {["Demo", "Personal", "Prop Firm", "Institutional", "Custom"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">Balance</span>
                <input
                  type="number"
                  value={state.accountProfile.balance}
                  onChange={(e) => updateAccount({ balance: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">Risk %</span>
                <input
                  type="number" step="0.1"
                  value={state.accountProfile.riskPct}
                  onChange={(e) => updateAccount({ riskPct: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">Max Daily %</span>
                <input
                  type="number" step="0.5" min="0" max="10"
                  value={state.accountProfile.maxDailyLossPct}
                  onChange={(e) => updateAccount({ maxDailyLossPct: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">Max Weekly %</span>
                <input
                  type="number" step="0.5" min="0" max="20"
                  value={state.accountProfile.maxWeeklyLossPct}
                  onChange={(e) => updateAccount({ maxWeeklyLossPct: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-black text-white outline-none"
                />
              </label>
            </div>
            <div className="mt-3 glass-card p-3 space-y-1.5">
              {[
                ["Risk / trade", `£${calculateRiskAmount(state.accountProfile).toFixed(2)}`, "#10b981"],
                ["Max daily",   `£${(state.accountProfile.balance * state.accountProfile.maxDailyLossPct / 100).toFixed(2)}`, "#f59e0b"],
                ["Max weekly",  `£${(state.accountProfile.balance * state.accountProfile.maxWeeklyLossPct / 100).toFixed(2)}`, "#ef4444"],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between items-baseline text-[10px]">
                  <span className="text-white/30">{l}</span>
                  <span className="font-black" style={{ color: c }}>{v}</span>
                </div>
              ))}
              <div className="text-[8px] text-white/20 pt-1">{risk.note}</div>
            </div>
          </section>

          {/* Manual Readiness Gates */}
          <section className="glass-card rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[8px] uppercase tracking-[0.25em] text-white/25">Human Gates</div>
              <ProvenanceBadge state="USER_INPUT" />
            </div>
            <p className="text-[8px] text-white/22 leading-relaxed mb-3">
              Mark when verified on chart. Cannot be auto-satisfied.
            </p>
            <button
              onClick={() => setStructureReady(!state.structureContext)}
              className="w-full rounded-xl border px-3 py-3 text-xs font-black transition-all duration-200 relative overflow-hidden"
              style={state.structureContext ? {
                borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "#10b981",
                boxShadow: "0 0 20px rgba(16,185,129,0.08)",
              } : {
                borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.5)",
              }}
            >
              {state.structureContext ? "✓ SMC STRUCTURE — READY" : "Mark SMC Structure Ready"}
            </button>
            <button
              onClick={() => setCorrelationReady(!state.correlationState)}
              className="mt-2 w-full rounded-xl border px-3 py-3 text-xs font-black transition-all duration-200"
              style={state.correlationState ? {
                borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "#10b981",
                boxShadow: "0 0 20px rgba(16,185,129,0.08)",
              } : {
                borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.5)",
              }}
            >
              {state.correlationState ? "✓ CORRELATION — READY" : "Mark Correlation Ready"}
            </button>
          </section>
        </aside>

        {/* ── CENTER COLUMN ─────────────────────────────────────── */}
        <section className="space-y-3">

          {/* ── COMMAND STATE CARD — the heart of the OS ── */}
          <div
            className="rounded-3xl border relative overflow-hidden"
            style={{
              borderColor: style.border,
              background: `linear-gradient(135deg, ${style.fg}0a 0%, rgba(2,5,8,0.98) 55%)`,
              boxShadow: `0 0 80px ${style.fg}0d, inset 0 1px 0 ${style.fg}18`,
            }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, ${style.fg}cc, ${style.fg}30 50%, transparent)` }} />
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 20% 40%, ${style.fg}0d 0%, transparent 60%)` }} />

            <div className="p-5 relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Verdict block */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full animate-pulse"
                      style={{ background: style.fg, boxShadow: `0 0 8px ${style.fg}` }} />
                    <span className="text-[8px] uppercase tracking-[0.35em]" style={{ color: `${style.fg}80` }}>
                      Command State
                    </span>
                    <ProvenanceBadge state={quoteProv} />
                  </div>
                  <div
                    className="font-black tracking-tight leading-none"
                    style={{
                      fontSize: "clamp(44px,6vw,72px)",
                      color: style.fg,
                      textShadow: `0 0 60px ${style.fg}55, 0 0 120px ${style.fg}20`,
                    }}
                  >
                    {style.label}
                  </div>
                  <div className="mt-3 text-[11px] leading-relaxed max-w-[300px]" style={{ color: `${style.fg}75` }}>
                    {commandDirective}
                  </div>
                </div>

                {/* Live price */}
                <div className="text-right">
                  <div className="text-[8px] uppercase tracking-[0.25em] text-white/30 mb-1 flex items-center gap-2 justify-end">
                    {asset.label}
                    {tick?.connected ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400/60">WS</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="text-white/20">POLL</span>
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-black tabular-nums leading-none">
                    {state.liveQuote ? formatPrice(state.selectedAsset, state.liveQuote.price) : "—"}
                  </div>
                  {priceChange != null && (
                    <div className={`text-sm font-black tabular-nums mt-1 ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                    </div>
                  )}
                  <div className="text-[8px] uppercase text-white/25 mt-1">
                    {loading ? "loading" : error ? "error" : state.liveQuote?.source ?? "—"}
                  </div>
                  {quoteAge !== null && (
                    <div className="text-[9px] font-mono tabular-nums mt-0.5" style={{
                      color: quoteAge < 15 ? "#10b981" : quoteAge < 60 ? "#f59e0b" : "#ef4444",
                    }}>
                      {quoteAge < 60 ? `${quoteAge}s ago` : `${Math.floor(quoteAge / 60)}m ${quoteAge % 60}s ago`}
                    </div>
                  )}
                </div>
              </div>

              {/* Data health strip */}
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  {
                    label: "QUOTE",
                    ok: !!state.liveQuote && !state.liveQuote.stale,
                    warn: !!state.liveQuote?.stale,
                    detail: quoteAge !== null
                      ? (quoteAge < 60 ? `${quoteAge}s` : `${Math.floor(quoteAge / 60)}m`) + " · " + (state.liveQuote?.source ?? "?")
                      : "missing",
                  },
                  { label: "STRUCTURE",   ok: !!state.structureContext,  warn: false, detail: state.structureContext ? "verified" : "unverified" },
                  { label: "CORRELATION", ok: !!state.correlationState,  warn: false, detail: state.correlationState ? "verified" : "unverified" },
                  {
                    label: "SESSION",
                    ok: isKillzone(state.selectedSession),
                    warn: !isKillzone(state.selectedSession) && !state.selectedSession.includes("WEEKEND") && !state.selectedSession.includes("DEAD"),
                    detail: state.selectedSession.split(" ")[0].toLowerCase(),
                  },
                ] as const).map(({ label, ok, warn, detail }) => {
                  const color = ok ? "#10b981" : warn ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={label} className="flex items-center gap-1.5 rounded-lg border px-2 py-1"
                      style={{ borderColor: `${color}22`, background: `${color}07` }}>
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[8px] font-black uppercase tracking-wider" style={{ color }}>{label}</span>
                      <span className="text-[8px] text-white/20">{detail}</span>
                    </div>
                  );
                })}
              </div>

              {/* 8 field grid */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Session" value={state.selectedSession}
                  accent={state.selectedSession.includes("KILL") || state.selectedSession.includes("NY AM") ? "#10b981" : "#f59e0b"} />
                <Field label="Timeframe" value={state.selectedTimeframe} />
                <Field label="Bias" value={decision.direction} accent={biasColor} />
                <Field label="Confluence" value={`${decision.confluence.score}%`} accent={confluenceColor} />
                <Field label="Entry" value={formatPrice(state.selectedAsset, decision.entry)} />
                <Field label="Stop"  value={formatPrice(state.selectedAsset, decision.stop)} />
                <Field label="TP1 / TP2" value={`${formatPrice(state.selectedAsset, decision.tp1)} / ${formatPrice(state.selectedAsset, decision.tp2)}`} />
                <Field label="Lot Size" value={risk.lots == null ? "—" : risk.lots.toFixed(2)} accent={risk.lots != null ? "#10b981" : undefined} />
              </div>
            </div>
          </div>

          {/* AUTHORIZE risk confirmation */}
          {decision.command === "AUTHORIZE" && risk.lots != null && (
            <div className="glass-card glass-card-green rounded-2xl p-4"
              style={{ boxShadow: "0 0 40px rgba(16,185,129,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-emerald-400 font-black">Risk Confirmation</div>
                <div className="text-[8px] text-emerald-400/50">verify before executing on MT4/MT5</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Lot Size",      risk.lots.toFixed(2),                    "rgba(255,255,255,0.9)"],
                  ["Risk Amount",   `£${risk.riskAmount.toFixed(0)}`,        "#10b981"],
                  ["Stop Distance", risk.stopDistance != null ? `${risk.stopDistance.toFixed(asset.decimals)} (${(risk.stopDistance / asset.pipSize).toFixed(0)}p)` : "—", "rgba(255,255,255,0.7)"],
                ].map(([l, v, c]) => (
                  <div key={l}>
                    <div className="text-[8px] text-white/28 uppercase tracking-wider mb-1">{l}</div>
                    <div className="text-lg font-black" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => navigate("/journal")}
                  className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all"
                  style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)" }}>
                  ✓ SEND TO JOURNAL
                </button>
                <button onClick={() => navigate("/execution")}
                  className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all"
                  style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.25)", background: "rgba(56,189,248,0.06)" }}>
                  → PAPER TRADING
                </button>
              </div>
            </div>
          )}

          {/* EXA 4-LOCKS + Intelligence bars */}
          <div className="grid gap-3 lg:grid-cols-2">
            {/* 4-LOCKS */}
            <section className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">EXA 4-Locks</div>
                  <ProvenanceBadge state="MODEL_INFERENCE" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black tabular-nums ${locksActive === 4 ? "text-emerald-400" : locksActive >= 2 ? "text-amber-400" : "text-red-400"}`}>
                    {locksActive}
                  </span>
                  <span className="text-[10px] text-white/25">/4</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOCK_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className="rounded-xl border p-3 transition-all duration-300 relative overflow-hidden"
                    style={{
                      borderColor: exa.locks[i] ? "rgba(16,185,129,0.28)" : "rgba(255,255,255,0.05)",
                      background: exa.locks[i] ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.015)",
                      boxShadow: exa.locks[i] ? "0 0 20px rgba(16,185,129,0.07)" : "none",
                    }}
                  >
                    {exa.locks[i] && (
                      <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: "linear-gradient(90deg, #10b98155, transparent)" }} />
                    )}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: exa.locks[i] ? "#10b981" : "rgba(255,255,255,0.1)", boxShadow: exa.locks[i] ? "0 0 6px #10b981" : "none" }} />
                      <span className="text-[8px] text-white/20">L{i + 1}</span>
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-wide"
                      style={{ color: exa.locks[i] ? "#10b981" : "rgba(255,255,255,0.28)" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
                {[
                  ["SMC Structure", !!state.structureContext],
                  ["Correlation",   !!state.correlationState],
                ].map(([label, done]) => (
                  <div key={label} className="flex items-center gap-2 text-[9px]">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: done ? "#10b981" : "rgba(255,255,255,0.15)" }} />
                    <span style={{ color: done ? "#10b981" : "rgba(255,255,255,0.28)" }}>{label} {done ? "verified" : "not verified"}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Factor bars */}
            <section className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">EXA Intelligence</div>
                  <ProvenanceBadge state="MODEL_INFERENCE" />
                </div>
                <div className="flex items-baseline gap-2">
                  {exa.winRate != null && (
                    <span className="text-[8px] text-white/25">{exa.winRate}% win</span>
                  )}
                  <span className="text-xl font-black tabular-nums"
                    style={{ color: exa.composite >= 85 ? "#10b981" : exa.composite >= 62 ? "#f59e0b" : "#ef4444" }}>
                    {exa.composite}
                  </span>
                  <span className="text-[9px] text-white/25">/100</span>
                </div>
              </div>
              {exa.factors.length === 0 ? (
                <div className="text-[10px] text-white/25">Building score…</div>
              ) : (
                <div className="space-y-3.5">
                  {exa.factors.map((f) => (
                    <FactorBar key={f.label} label={f.label} value={f.value} note={f.note} />
                  ))}
                </div>
              )}
              {exa.confirmation.total > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/28">Correlation consensus</span>
                    <span className="font-black" style={{ color: exa.confirmation.score >= 60 ? "#10b981" : exa.confirmation.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                      {exa.confirmation.confidence} · {exa.confirmation.confirms}/{exa.confirmation.total} agree
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Reasons + Blockers */}
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="glass-card glass-card-green rounded-2xl p-4">
              <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 mb-3">Top Reasons</div>
              <div className="space-y-1.5">
                {(decision.confluence.reasons.length ? decision.confluence.reasons : ["No validated reasons yet."]).slice(0, 5).map((r, i) => (
                  <div key={i} className="glass-card glass-card-green px-3 py-2 text-[11px] text-white/60">{r}</div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-4">
              <div className="text-[9px] uppercase tracking-[0.2em] text-red-400/70 mb-3">Blockers</div>
              <div className="space-y-1.5">
                {(decision.confluence.blockers.length ? decision.confluence.blockers : ["No blockers."]).slice(0, 7).map((b, i) => (
                  <div key={i} className="rounded-xl border border-red-500/10 bg-red-500/[0.03] px-3 py-2 text-[11px] text-white/60">{b}</div>
                ))}
              </div>
            </section>
          </div>

          {/* ── STEP GATES — guided workflow ── */}
          {(() => {
            const steps = [
              { id: "quote",       label: "Live Quote",         done: !!state.liveQuote && !state.liveQuote.stale, gate: false as const },
              { id: "structure",   label: "SMC Structure",      done: !!state.structureContext,  gate: "structure" as const },
              { id: "correlation", label: "Correlation",        done: !!state.correlationState,  gate: "correlation" as const },
              { id: "tradeplan",   label: "Trade Plan",         done: !!(state.setup.entry && state.setup.stop && state.setup.tp1), gate: false as const },
              { id: "confluence",  label: "Confluence Gateway", done: decision.confluence.score >= 85, gate: false as const },
            ];
            const currentIdx = steps.findIndex(s => !s.done);
            const currentStep = currentIdx === -1 ? steps.length : currentIdx;
            const nextAction = (() => {
              if (currentStep >= steps.length) return "All gates passed. AUTHORIZE ready.";
              const s = steps[currentStep];
              if (s.id === "quote") return "Waiting for live price data from Twelve Data / WebSocket.";
              if (s.id === "structure") return "Verify SMC structure on chart, then mark as ready.";
              if (s.id === "correlation") return "Check correlated assets (DXY, NAS, yields), then mark as ready.";
              if (s.id === "tradeplan") return "Enter entry price, stop loss, and take profit for auto-calculation.";
              if (s.id === "confluence") return `Need confluence ≥ 85 (currently ${decision.confluence.score}). Wait for conditions.`;
              return "";
            })();

            return (
              <section className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">Step Gates</div>
                    <span className="text-[8px] text-white/20">
                      Step {Math.min(currentStep + 1, steps.length)}/{steps.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{
                      background: currentStep >= steps.length ? "#10b981" : currentStep < 2 ? "#f59e0b" : "#38bdf8",
                    }} />
                    <span className="text-[8px] font-mono text-white/30">
                      {currentStep >= steps.length ? "ALL CLEAR" : `NEXT: ${steps[currentStep].label.toUpperCase()}`}
                    </span>
                  </div>
                </div>

                {/* Step timeline */}
                <div className="space-y-0">
                  {steps.map((s, i) => {
                    const isDone = s.done;
                    const isCurrent = i === currentStep;
                    const isLocked = i > currentStep;
                    return (
                      <div key={s.id} className="flex items-stretch gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                        {/* Step number + line */}
                        <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 20 }}>
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all"
                            style={{
                              background: isDone ? "rgba(16,185,129,0.15)" : isCurrent ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${isDone ? "rgba(16,185,129,0.4)" : isCurrent ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                              color: isDone ? "#10b981" : isCurrent ? "#38bdf8" : "rgba(255,255,255,0.2)",
                            }}>
                            {isDone ? "✓" : i + 1}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wide"
                              style={{ color: isDone ? "#10b981" : isCurrent ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}>
                              {s.label}
                            </span>
                            {s.gate === "structure" && (
                              <button onClick={() => setStructureReady(!state.structureContext)}
                                className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-all shrink-0"
                                style={state.structureContext ? {
                                  color: "#10b981", borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)",
                                } : {
                                  color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.08)", background: "transparent",
                                }}>
                                {state.structureContext ? "✓ READY" : "MARK READY"}
                              </button>
                            )}
                            {s.gate === "correlation" && (
                              <button onClick={() => setCorrelationReady(!state.correlationState)}
                                className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-all shrink-0"
                                style={state.correlationState ? {
                                  color: "#10b981", borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)",
                                } : {
                                  color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.08)", background: "transparent",
                                }}>
                                {state.correlationState ? "✓ READY" : "MARK READY"}
                              </button>
                            )}
                            {s.id === "tradeplan" && (
                              <span className="text-[8px] font-mono" style={{
                                color: s.done ? "#10b981" : "rgba(255,255,255,0.2)",
                              }}>
                                {s.done ? `${state.setup.entry} / ${state.setup.stop} / ${state.setup.tp1}` : "— / — / —"}
                              </span>
                            )}
                            {s.id === "quote" && (
                              <span className="text-[8px] font-mono" style={{
                                color: s.done ? "#10b981" : "rgba(255,255,255,0.2)",
                              }}>
                                {s.done ? `${quoteAge ?? 0}s · ${state.liveQuote?.source ?? "?"}` : "MISSING"}
                              </span>
                            )}
                            {s.id === "confluence" && (
                              <span className="text-[8px] font-black tabular-nums" style={{
                                color: s.done ? "#10b981" : "#f59e0b",
                              }}>
                                {decision.confluence.score}/100
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Next action directive */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center gap-2">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-white/20">Next</span>
                  <span className="text-[10px]" style={{
                    color: currentStep >= steps.length ? "#10b981" : "rgba(255,255,255,0.5)",
                  }}>
                    {nextAction}
                  </span>
                </div>
              </section>
            );
          })()}

          {/* Draft Preview — auto-generated when Command authorises */}
          {state.journalDraft && (
            <section className="glass-card rounded-2xl p-4 border border-amber-500/15">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <div className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    DRAFT READY
                  </div>
                  <span className="text-[8px] text-white/30 font-mono">Auto-generated from Command · review in Journal</span>
                </div>
                <button onClick={() => navigate("/journal")}
                  className="text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded border"
                  style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)" }}>
                  OPEN IN JOURNAL
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[9px] font-mono">
                {[
                  ["Asset", state.journalDraft.asset],
                  ["Direction", state.journalDraft.direction],
                  ["Entry", state.journalDraft.entry],
                  ["Stop", state.journalDraft.stop],
                  ["TP1", state.journalDraft.tp1],
                  ["R:R", state.journalDraft.rr ?? "—"],
                  ["Lots", state.journalDraft.lots.toFixed(2)],
                  ["Risk", `£${state.journalDraft.riskAmount.toFixed(0)}`],
                ].map(([l, v]) => (
                  <div key={l} className="card-surface p-2">
                    <div className="text-[8px] text-white/25 uppercase">{l}</div>
                    <div className="text-[9px] font-black text-white mt-0.5">{String(v)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trade Plan Inputs */}
          <section className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/28">Trade Plan</div>
                <ProvenanceBadge state="USER_INPUT" />
                <span className="text-[8px] text-white/20">Manual until live SMC engine writes these.</span>
              </div>
              <div className="flex items-center gap-2">
                {(state.setup.entry || state.setup.stop) && (
                  <button onClick={() => updateSetup({ command: "INVALIDATED" })}
                    className="rounded border border-red-500/25 px-2 py-1 text-[8px] uppercase text-red-400/60 hover:text-red-400">
                    Invalidate
                  </button>
                )}
                <button
                  onClick={() => updateSetup({ entry: undefined, stop: undefined, tp1: undefined, tp2: undefined, rr: undefined, invalidation: undefined })}
                  className="text-[9px] text-white/28 hover:text-white">
                  clear
                </button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {(["entry", "stop", "tp1", "tp2", "rr", "invalidation"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-white/25">{key === "rr" ? "R:R" : key}</span>
                  <input
                    value={(state.setup as any)[key] ?? ""}
                    onChange={(e) => updateSetup({ [key]: e.target.value } as any)}
                    placeholder={key === "rr" && autoRR ? `${autoRR}:1 (auto)` : undefined}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none placeholder:text-white/18"
                  />
                </label>
              ))}
            </div>
            {autoRR && (
              <div className="mt-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] px-3 py-2 text-[10px] text-white/40">
                Auto R:R — <span className="font-black text-amber-400">{autoRR}:1</span>
                {risk.lots != null && <span className="ml-3 text-white/25">{risk.lots.toFixed(2)} lots · {risk.note}</span>}
              </div>
            )}
          </section>
        </section>

        {/* ── RIGHT COLUMN ──────────────────────────────────────── */}
        <aside className="space-y-3">

          {/* EXA Operator Read */}
          <section className="glass-card glass-card-purple rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, #a855f740, transparent)" }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-violet-400/80">EXA Operator Read</div>
                <ProvenanceBadge state="MODEL_INFERENCE" />
              </div>
              <button onClick={() => navigator.clipboard?.writeText(aiRead)}
                className="text-[8px] uppercase tracking-wider text-white/20 hover:text-white/50 transition-colors">
                copy
              </button>
            </div>
            <div className="space-y-2">
              {([
                { label: "ASSET",    value: asset.label,                   color: "rgba(255,255,255,0.9)" },
                { label: "SESSION",  value: state.selectedSession,          color: sessionAccent },
                { label: "BIAS",     value: decision.direction,             color: biasColor },
                { label: "PHASE",    value: style.label,                    color: style.fg },
                { label: "CONF",     value: `${decision.confluence.score}%`, color: confluenceColor },
                { label: "ACTION",   value: commandDirective,               color: "rgba(255,255,255,0.6)" },
                ...(risk.lots != null ? [{ label: "LOTS", value: `${risk.lots.toFixed(2)} · ${risk.note}`, color: "rgba(255,255,255,0.35)" }] : []),
                ...(autoRR ? [{ label: "R:R", value: `${autoRR}:1`, color: "rgba(255,255,255,0.35)" }] : []),
              ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-[8px] uppercase tracking-[0.12em] text-white/20 shrink-0" style={{ minWidth: "52px" }}>{label}</span>
                  <span className="text-[11px] font-black leading-tight" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
            {decision.missingData.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-violet-500/10">
                <div className="text-[8px] uppercase tracking-wider text-violet-400/45 mb-1.5">Missing</div>
                {decision.missingData.slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[9px] text-white/28 leading-relaxed">◌ {m}</div>
                ))}
              </div>
            )}
          </section>

          {/* NEXUS-C */}
          <section className="glass-card glass-card-green rounded-2xl overflow-hidden" style={{ height: 270 }}>
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.04]">
              <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/75">NEXUS-C · Command Analyst</div>
              <div className="text-[8px] text-white/18 mt-0.5">context-bound · WARROOM READ format</div>
            </div>
            <div style={{ height: 222 }}>
              <ScreenAgent
                agentId="NEXUS-C"
                agentRole="command analyst"
                glowColor="#10b981"
                systemContext={nexusCContext}
                autoPrompt={`Give me the current WARROOM READ for ${asset.label}.`}
              />
            </div>
          </section>

          {/* Session Intel */}
          <section className="glass-card rounded-2xl p-4">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/25 mb-3">Session Intel</div>
            <div className="text-base font-black uppercase tracking-wide leading-tight" style={{ color: sessionAccent }}>
              {state.selectedSession}
            </div>
            <div className="text-[10px] text-white/32 mt-2 leading-relaxed">
              {SESSION_RECOMMENDATION[state.selectedSession] ?? "Monitor conditions."}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <div className="text-[8px] uppercase tracking-wider text-white/20 mb-1.5">Next Killzone</div>
              {nextKZ ? (
                <div>
                  <div className="text-[13px] font-black" style={{ color: nextKZ.minutesAway < 60 ? "#f59e0b" : "rgba(255,255,255,0.5)" }}>
                    {nextKZ.label}
                  </div>
                  <div className="text-[9px] text-white/28 mt-0.5">in {formatCountdown(nextKZ.minutesAway)}</div>
                </div>
              ) : (
                <div className="text-[12px] font-black" style={{ color: sessionAccent }}>Currently active</div>
              )}
            </div>
          </section>

          {/* Gate Status (summary — full gates in center column) */}
          <section className="glass-card rounded-2xl p-4">
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/25 mb-3">Gate Status</div>
            <div className="space-y-2">
              {([
                { label: "Quote",       done: !!state.liveQuote && !state.liveQuote.stale },
                { label: "Structure",   done: !!state.structureContext },
                { label: "Correlation", done: !!state.correlationState },
                { label: "Trade Plan",  done: !!(state.setup.entry && state.setup.stop && state.setup.tp1) },
                { label: "Confluence",  done: decision.confluence.score >= 85 },
                { label: "Killzone",    done: state.selectedSession.includes("KILL") || state.selectedSession.includes("NY AM") },
              ] as const).map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-3 w-3 shrink-0 rounded-full border flex items-center justify-center"
                    style={{
                      borderColor: done ? "#10b981" : "rgba(255,255,255,0.1)",
                      background: done ? "rgba(16,185,129,0.12)" : "transparent",
                    }}>
                    {done && <div className="h-1 w-1 rounded-full bg-emerald-400" />}
                  </div>
                  <span className="text-[9px]" style={{ color: done ? "#10b981" : "rgba(255,255,255,0.32)" }}>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
};

export default CommandScreen;
