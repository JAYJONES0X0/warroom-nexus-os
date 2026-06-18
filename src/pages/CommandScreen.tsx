import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrices } from "@/hooks/usePrices";
import { useEXAScores, useEXAScan } from "@/hooks/useEXAScores";
import { useWarroom } from "@/context/WarroomStateContext";
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
  MISSING_DATA: { label: "MISSING DATA", fg: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.45)" },
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
      fontSize: "7px", fontWeight: "800", letterSpacing: "0.13em",
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
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">{label}</div>
      <div className="mt-1 text-sm font-black tabular-nums" style={{ color: accent ?? "rgba(255,255,255,0.9)" }}>{value}</div>
    </div>
  );
}

function FactorBar({ label, value, note }: { label: string; value: number; note: string }) {
  const color = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40">{label}</span>
        <span className="truncate text-right text-[9px] text-white/25">{note}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, value)}%`, background: color }}
          />
        </div>
        <span className="w-7 text-right text-[10px] font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

const CommandScreen = () => {
  const navigate = useNavigate();
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
  } = useWarroom();

  const { prices, fetchedAt, loading, error, source } = usePrices();
  const exa = useEXAScores(state.selectedAsset);
  const scan = useEXAScan(ALL_ASSETS);

  // Wire live price feed → global quote state
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
        return m ? `Complete data: ${m}.` : "Enter asset data to evaluate.";
      }
      case "MONITOR":
        return "Watching conditions. Re-evaluate at next session.";
      case "INVALIDATED":
        return "Setup invalidated. Clear plan and restart analysis.";
      default:
        return "Awaiting asset data.";
    }
  })();

  // Session countdown — updates every 60s
  const [nextKZ, setNextKZ] = useState(() => getNextKillzone());
  useEffect(() => {
    setNextKZ(getNextKillzone());
    const id = setInterval(() => setNextKZ(getNextKillzone()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#020508] text-white" style={{ fontFamily: "monospace" }}>
      {/* Top nav */}
      <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#020508]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/markets")} className="text-[10px] uppercase tracking-[0.2em] text-white/35 hover:text-white">Markets</button>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <div className="text-xs font-black tracking-[0.25em] text-red-400">WARROOM NEXUS</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/25">Command · execution intelligence terminal</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate("/cosmos")} className="rounded border border-white/10 px-2 py-1 text-[9px] uppercase text-white/35 hover:text-white">Cosmos</button>
            <button onClick={() => navigate("/polymarket")} className="rounded border border-white/10 px-2 py-1 text-[9px] uppercase text-white/35 hover:text-white">Polymarket Module</button>
            <button onClick={() => navigate("/settings")} className="rounded border border-white/10 px-2 py-1 text-[9px] uppercase text-white/35 hover:text-white">Settings</button>
          </div>
        </div>
      </div>

      <main className="grid gap-4 p-4 xl:grid-cols-[280px_1fr_360px]">
        {/* ── LEFT COLUMN ── */}
        <aside className="space-y-4">
          {/* Asset + Timeframe */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Selected Asset</div>
            <select
              value={state.selectedAsset}
              onChange={(e) => setAsset(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black text-white outline-none"
            >
              {WARROOM_ASSETS.map((a) => <option key={a.key} value={a.key}>{a.label} · {a.category}</option>)}
            </select>

            {/* Asset constellation — visual EXA state across all 8 pairs */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {WARROOM_ASSETS.map((a) => {
                const row = scan.find((r) => r.pair === a.key);
                const dotColor = row ? (VERDICT_DOT[row.scores.verdict] ?? "#374151") : "#2d3748";
                const isSelected = a.key === state.selectedAsset;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAsset(a.key)}
                    className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-all duration-150"
                    style={{
                      background: isSelected ? `${dotColor}18` : "transparent",
                      border: `1px solid ${isSelected ? `${dotColor}45` : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
                    <span className="text-[7.5px] font-black tabular-nums" style={{ color: isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)" }}>
                      {shortAssetKey(a.key)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">Timeframe</div>
            <select
              value={state.selectedTimeframe}
              onChange={(e) => setTimeframe(e.target.value as WarroomTimeframe)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black text-white outline-none"
            >
              {WARROOM_TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </section>

          {/* Account Model */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Account Model</div>
            <select
              value={state.accountProfile.mode}
              onChange={(e) => updateAccount({ mode: e.target.value as any })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-black text-white outline-none"
            >
              {["Demo", "Personal", "Prop Firm", "Institutional", "Custom"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label className="mt-3 block text-[9px] uppercase tracking-[0.16em] text-white/30">Balance</label>
            <input
              type="number"
              value={state.accountProfile.balance}
              onChange={(e) => updateAccount({ balance: Number(e.target.value) || 0 })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black text-white outline-none"
            />
            <label className="mt-3 block text-[9px] uppercase tracking-[0.16em] text-white/30">Risk %</label>
            <input
              type="number"
              step="0.1"
              value={state.accountProfile.riskPct}
              onChange={(e) => updateAccount({ riskPct: Number(e.target.value) || 0 })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black text-white outline-none"
            />
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/30 p-3 text-xs">
              <div className="text-white/35">Risk amount</div>
              <div className="text-xl font-black text-emerald-400">£{calculateRiskAmount(state.accountProfile).toFixed(2)}</div>
              <div className="mt-1 text-[10px] text-white/35">{risk.note}</div>
            </div>
          </section>

          {/* Manual Readiness Gates — toggle with visual state */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between mb-0.5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Manual Readiness Gates</div>
              <ProvenanceBadge state="USER_INPUT" />
            </div>
            <p className="mt-1 text-[9px] text-white/25 leading-relaxed">
              Mark when YOU have verified on chart. Cannot be auto-satisfied — this is the human lock.
            </p>
            <button
              onClick={() => setStructureReady(!state.structureContext)}
              className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                state.structureContext
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
              }`}
            >
              {state.structureContext ? "✓ SMC Structure — READY" : "Mark SMC Structure Ready"}
            </button>
            <button
              onClick={() => setCorrelationReady(!state.correlationState)}
              className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                state.correlationState
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
              }`}
            >
              {state.correlationState ? "✓ Correlation — READY" : "Mark Correlation Ready"}
            </button>
          </section>
        </aside>

        {/* ── CENTER COLUMN ── */}
        <section className="space-y-4">
          {/* Command State card */}
          <div className="rounded-3xl border p-5" style={{ borderColor: style.border, background: style.bg }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: style.fg }}>Command State</div>
                  <ProvenanceBadge state={quoteProv} />
                </div>
                <div className="mt-1 text-5xl font-black tracking-tight" style={{ color: style.fg }}>{style.label}</div>
                <div className="mt-2 text-[10px] leading-relaxed max-w-[260px]" style={{ color: `${style.fg}99` }}>
                  {commandDirective}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{asset.label}</div>
                <div className="text-3xl font-black tabular-nums">
                  {state.liveQuote ? formatPrice(state.selectedAsset, state.liveQuote.price) : "—"}
                </div>
                {priceChange != null && (
                  <div className={`text-xs font-bold tabular-nums ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                  </div>
                )}
                <div className="text-[10px] uppercase text-white/35">
                  {loading ? "loading quote" : error ? "quote error" : state.liveQuote?.source ?? "no source"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Session" value={state.selectedSession}
                accent={state.selectedSession.includes("KILL") || state.selectedSession.includes("NY AM") ? "#10b981" : "#f59e0b"} />
              <Field label="Timeframe" value={state.selectedTimeframe} />
              <Field label="Bias" value={decision.direction} />
              <Field label="Confluence" value={`${decision.confluence.score}%`}
                accent={decision.confluence.score >= 85 ? "#10b981" : decision.confluence.score >= 62 ? "#f59e0b" : "#ef4444"} />
              <Field label="Entry" value={formatPrice(state.selectedAsset, decision.entry)} />
              <Field label="Stop" value={formatPrice(state.selectedAsset, decision.stop)} />
              <Field label="TP1 / TP2" value={`${formatPrice(state.selectedAsset, decision.tp1)} / ${formatPrice(state.selectedAsset, decision.tp2)}`} />
              <Field label="Lot Size" value={risk.lots == null ? "—" : risk.lots.toFixed(2)} />
            </div>
          </div>

          {/* EXA Intelligence — 4-LOCKS + Factor bars */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 4-LOCKS */}
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">EXA 4-Locks</div>
                  <ProvenanceBadge state="MODEL_INFERENCE" />
                </div>
                <div className={`text-[10px] font-bold tabular-nums ${locksActive === 4 ? "text-emerald-400" : locksActive >= 2 ? "text-amber-400" : "text-red-400"}`}>
                  {locksActive}/4 engaged
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOCK_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 transition-all duration-300 ${
                      exa.locks[i]
                        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                        : "border-white/[0.06] bg-white/[0.015]"
                    }`}
                  >
                    <div className={`h-2 w-2 shrink-0 rounded-full ${exa.locks[i] ? "bg-emerald-400" : "bg-white/15"}`} />
                    <span className={`text-[10px] uppercase tracking-wider ${exa.locks[i] ? "text-emerald-400" : "text-white/30"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Readiness gates status (mirrored here for at-a-glance) */}
              <div className="mt-3 border-t border-white/[0.05] pt-3 space-y-1">
                <div className="flex items-center gap-2 text-[9px]">
                  <div className={`h-1.5 w-1.5 rounded-full ${state.structureContext ? "bg-emerald-400" : "bg-white/20"}`} />
                  <span className={state.structureContext ? "text-emerald-400" : "text-white/30"}>
                    SMC Structure {state.structureContext ? "verified" : "not verified"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px]">
                  <div className={`h-1.5 w-1.5 rounded-full ${state.correlationState ? "bg-emerald-400" : "bg-white/20"}`} />
                  <span className={state.correlationState ? "text-emerald-400" : "text-white/30"}>
                    Correlation {state.correlationState ? "verified" : "not verified"}
                  </span>
                </div>
              </div>
            </section>

            {/* Factor bars */}
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">EXA Intelligence</div>
                  <ProvenanceBadge state="MODEL_INFERENCE" />
                </div>
                <div className="flex items-center gap-3">
                  {exa.winRate != null && (
                    <span className="text-[9px] text-white/30">
                      {exa.winRate}% win · {exa.expectancy}
                    </span>
                  )}
                  <span className={`text-sm font-black tabular-nums ${exa.composite >= 85 ? "text-emerald-400" : exa.composite >= 62 ? "text-amber-400" : "text-red-400"}`}>
                    {exa.composite}%
                  </span>
                </div>
              </div>
              {exa.factors.length === 0 ? (
                <div className="text-[10px] text-white/25">Building score…</div>
              ) : (
                <div className="space-y-3">
                  {exa.factors.map((f) => (
                    <FactorBar key={f.label} label={f.label} value={f.value} note={f.note} />
                  ))}
                </div>
              )}
              {exa.confirmation.total > 0 && (
                <div className="mt-3 border-t border-white/[0.05] pt-2.5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/30">Correlation consensus</span>
                    <span className={`font-bold ${exa.confirmation.score >= 60 ? "text-emerald-400" : exa.confirmation.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {exa.confirmation.confidence} · {exa.confirmation.confirms}/{exa.confirmation.total} agree
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Top Reasons | Blockers */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Top Reasons</div>
              <div className="mt-3 space-y-2">
                {(decision.confluence.reasons.length ? decision.confluence.reasons : ["No validated reasons yet."]).slice(0, 5).map((r, i) => (
                  <div key={i} className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3 text-xs text-white/70">{r}</div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-400">Blockers</div>
              <div className="mt-3 space-y-2">
                {(decision.confluence.blockers.length ? decision.confluence.blockers : ["No blockers."]).slice(0, 7).map((b, i) => (
                  <div key={i} className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 text-xs text-white/70">{b}</div>
                ))}
              </div>
            </section>
          </div>

          {/* Trade Plan Inputs */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Trade Plan Inputs</div>
                  <ProvenanceBadge state="USER_INPUT" />
                </div>
                <div className="text-xs text-white/35">Manual until live SMC engine writes these fields.</div>
              </div>
              <div className="flex items-center gap-2">
                {(state.setup.entry || state.setup.stop) && (
                  <button
                    onClick={() => updateSetup({ command: "INVALIDATED" })}
                    className="rounded border border-red-500/25 px-2 py-1 text-[9px] uppercase text-red-400/70 hover:text-red-400"
                  >
                    Invalidate
                  </button>
                )}
                <button
                  onClick={() => updateSetup({ entry: undefined, stop: undefined, tp1: undefined, tp2: undefined, rr: undefined, invalidation: undefined })}
                  className="text-[10px] text-white/35 hover:text-white"
                >
                  clear
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["entry", "stop", "tp1", "tp2", "rr", "invalidation"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/30">{key === "rr" ? "R:R" : key}</span>
                  <input
                    value={(state.setup as any)[key] ?? ""}
                    onChange={(e) => updateSetup({ [key]: e.target.value } as any)}
                    placeholder={key === "rr" && autoRR ? `${autoRR}:1 (auto)` : undefined}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20"
                  />
                </label>
              ))}
            </div>
            {autoRR && (
              <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 text-[10px] text-white/45">
                Auto R:R from entry / stop / TP1 —{" "}
                <span className="font-bold text-amber-400">{autoRR}:1</span>
                {risk.lots != null && (
                  <span className="ml-3 text-white/30">
                    {risk.lots.toFixed(2)} lots · {risk.note}
                  </span>
                )}
              </div>
            )}
          </section>
        </section>

        {/* ── RIGHT COLUMN ── */}
        <aside className="space-y-4">
          {/* EXA Structured Read — replaces pre-block debug output */}
          <section className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-violet-400">EXA Operator Read</div>
                <ProvenanceBadge state="MODEL_INFERENCE" />
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(aiRead)}
                className="text-[8px] uppercase tracking-wider text-white/20 hover:text-white/50 transition-colors"
              >
                copy
              </button>
            </div>
            <div className="space-y-2">
              {([
                { label: "asset",     value: asset.label,             color: "rgba(255,255,255,0.88)" },
                { label: "session",   value: state.selectedSession,    color: sessionAccent },
                { label: "bias",      value: decision.direction,       color: biasColor },
                { label: "phase",     value: style.label,              color: style.fg },
                { label: "confluenc", value: `${decision.confluence.score}%`, color: confluenceColor },
                { label: "action",    value: commandDirective,         color: "rgba(255,255,255,0.65)" },
                ...(risk.lots != null ? [{ label: "lot size", value: `${risk.lots.toFixed(2)} · ${risk.note}`, color: "rgba(255,255,255,0.38)" }] : []),
                ...(autoRR ? [{ label: "r:r", value: `${autoRR}:1`, color: "rgba(255,255,255,0.38)" }] : []),
              ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-[8.5px] uppercase tracking-[0.1em] text-white/22 shrink-0" style={{ minWidth: "68px" }}>{label}</span>
                  <span className="text-[11px] font-black leading-tight" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
            {decision.missingData.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-violet-500/10">
                <div className="text-[8px] uppercase tracking-wider text-violet-400/50 mb-1.5">Missing data</div>
                {decision.missingData.slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[9px] text-white/30 leading-relaxed">◌ {m}</div>
                ))}
              </div>
            )}
          </section>

          {/* Session Intel — replaces Architecture Gate dev checklist */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Session Intel</div>
            <div className="text-sm font-black uppercase tracking-wide leading-tight" style={{ color: sessionAccent }}>
              {state.selectedSession}
            </div>
            <div className="text-[9px] text-white/35 mt-1.5 leading-relaxed">
              {SESSION_RECOMMENDATION[state.selectedSession] ?? "Monitor conditions."}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.05]">
              <div className="text-[8px] uppercase tracking-wider text-white/22 mb-1.5">Next Killzone</div>
              {nextKZ ? (
                <div>
                  <div className="text-[11px] font-black" style={{ color: nextKZ.minutesAway < 60 ? "#f59e0b" : "rgba(255,255,255,0.55)" }}>
                    {nextKZ.label}
                  </div>
                  <div className="text-[9px] text-white/30 mt-0.5">in {formatCountdown(nextKZ.minutesAway)}</div>
                </div>
              ) : (
                <div className="text-[10px] font-bold" style={{ color: sessionAccent }}>Currently active</div>
              )}
            </div>
          </section>

          {/* Path to AUTHORIZE — live status */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">Path to Authorize</div>
            <div className="space-y-2 text-[10px]">
              {[
                { label: "Live quote", done: !!state.liveQuote && !state.liveQuote.stale },
                { label: "SMC structure verified", done: !!state.structureContext },
                { label: "Correlation verified", done: !!state.correlationState },
                { label: "Confluence ≥ 85%", done: decision.confluence.score >= 85 },
                {
                  label: (() => {
                    const inKZ = state.selectedSession.includes("KILL") || state.selectedSession.includes("NY AM");
                    if (inKZ) return "In killzone / NY overlap";
                    if (nextKZ) return `In killzone · ${nextKZ.label} in ${formatCountdown(nextKZ.minutesAway)}`;
                    return "In killzone / NY overlap";
                  })(),
                  done: state.selectedSession.includes("KILL") || state.selectedSession.includes("NY AM"),
                },
                { label: "Entry / stop / TP entered", done: !!(state.setup.entry && state.setup.stop && state.setup.tp1) },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? "bg-emerald-400" : "bg-white/15"}`} />
                  <span className={done ? "text-emerald-400" : "text-white/35"}>{label}</span>
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
