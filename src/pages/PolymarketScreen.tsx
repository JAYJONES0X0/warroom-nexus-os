import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { useEdges } from "@/hooks/useEdges";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroContextPanel } from "@/components/MacroContextPanel";
import { marketCopy } from "@/lib/marketCopy";
import { observeEdges } from "@/lib/edgeJournal";
import type { ArbEdge, EdgeStatus } from "@/lib/arb";
import {
  getRecord, logMarkets, applyResolutions,
  getPlays, logPlay, resolvePlays, playStats,
  type TrackEntry, type Play,
} from "@/lib/trackRecord";

// ─── helpers ───────────────────────────────────────────────────────────────
const TAG_COLOR: Record<string, string> = {
  ARB: "#22d3ee", CONTESTED: "#f59e0b", CONSENSUS: "#94a3b8", LONGSHOT: "#a855f7", THIN: "#6b7280", OPEN: "#64748b",
};
const tagColor = (t: string) => TAG_COLOR[t] ?? TAG_COLOR.OPEN;
const money = (n: number) => `£${n.toFixed(2)}`;
const usd = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`);
const cents = (p: number) => `${Math.round(p * 100)}¢`;

function getRiskPct(): number {
  try {
    const s = localStorage.getItem("warroom.prefs");
    if (s) { const r = parseFloat(JSON.parse(s).risk); if (r > 0 && r <= 20) return r; }
  } catch { /* ignore */ }
  return 4;
}

// Doctrine-compliant labels: no "guaranteed / free money" anywhere. Each tier earns
// its language — only LIVE means a fresh, CLOB-verified, net-positive basket.
const STATUS_META: Record<EdgeStatus, { label: string; color: string; blurb: string }> = {
  LIVE_EDGE: { label: "LIVE MECHANICAL EDGE", color: "#10b981", blurb: "CLOB-verified · net-positive after friction · locked payout if filled at this size" },
  EXECUTABLE_EDGE: { label: "EXECUTABLE BASKET", color: "#22d3ee", blurb: "Fillable on the book and gross-positive — net sits below the LIVE bar" },
  INSUFFICIENT_DEPTH: { label: "INSUFFICIENT DEPTH", color: "#f59e0b", blurb: "A real basket, but profitable size is below the market minimum" },
  STALE_DATA: { label: "RECHECK REQUIRED", color: "#f59e0b", blurb: "Orderbook too old to trust — re-scan before believing it" },
  THEORETICAL_EDGE: { label: "THEORETICAL MISPRICING", color: "#a855f7", blurb: "Gamma prices suggest a basket — needs orderbook confirmation" },
  AUGMENTED_WATCH: { label: "AUGMENTED — WATCH ONLY", color: "#6b7280", blurb: "Outcome set isn't provably exhaustive ('Other' present)" },
  NO_EDGE: { label: "NO MECHANICAL EDGE", color: "#6b7280", blurb: "Priced efficiently after friction" },
  REJECTED: { label: "REJECTED", color: "#6b7280", blurb: "Failed an integrity gate" },
};
const whenStr = (d: string | null) => {
  if (!d) return "—";
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`;
};

// ─── edge card ─────────────────────────────────────────────────────────────
const EdgeCard = ({ e, hero }: { e: ArbEdge; hero?: boolean }) => {
  const m = STATUS_META[e.status];
  const [open, setOpen] = useState(false);
  const verified = e.status === "LIVE_EDGE" || e.status === "EXECUTABLE_EDGE" || e.status === "INSUFFICIENT_DEPTH" || e.status === "STALE_DATA";
  const legSum = e.legs.reduce((s, l) => s + l.displayPrice, 0);

  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: `${m.color}3a`, background: hero ? `${m.color}0d` : "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide" style={{ color: m.color, background: `${m.color}1a`, border: `1px solid ${m.color}40` }}>{m.label}</span>
        {e.arbType && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded" style={{ color: "#e5e7eb", background: "rgba(255,255,255,0.06)" }}>{e.arbType === "BUY_ALL_YES" ? "BUY ALL YES" : "BUY ALL NO"}</span>}
        <span className="ml-auto text-[9px] text-white/30 font-mono">{e.legCount} legs · settles {whenStr(e.endDate)}</span>
      </div>

      <div className={`${hero ? "text-lg" : "text-[15px]"} font-black text-white leading-snug mb-1`}>{e.eventTitle}</div>
      <div className="text-[11px] text-white/45 font-mono leading-relaxed mb-3">{m.blurb}</div>

      {verified ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              ["Net return", e.netReturnPct != null ? `${e.netReturnPct}%` : "—", m.color],
              ["Capacity", e.maxExecutableStakeUsd != null ? usd(e.maxExecutableStakeUsd) : "—", "rgba(255,255,255,0.85)"],
              ["Book age", e.dataAgeMs != null ? `${Math.round(e.dataAgeMs / 1000)}s` : "—", e.status === "STALE_DATA" ? "#f59e0b" : "rgba(255,255,255,0.6)"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-2.5 py-1.5">
                <div className="text-[8px] text-white/30 uppercase font-mono">{l}</div>
                <div className="text-base font-black tabular-nums" style={{ color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {/* friction, never one mystery number */}
          {e.grossProfitUsd != null && (
            <div className="text-[10px] text-white/45 font-mono mb-3 leading-relaxed">
              gross {usd(e.grossProfitUsd)} − fees {usd(e.estimatedFeeUsd ?? 0)} − slippage {usd(e.estimatedSlippageUsd ?? 0)} − buffer {usd(e.safetyBufferUsd ?? 0)} = <span className="font-black" style={{ color: m.color }}>net {usd(e.netProfitUsd ?? 0)}</span>
              {e.weakestLeg && <span className="text-white/30"> · weakest leg: {e.weakestLeg}</span>}
            </div>
          )}
        </>
      ) : (
        <div className="text-[11px] text-white/55 font-mono mb-3 leading-relaxed">
          Theoretical return <span className="font-black text-white/80">{e.theoreticalReturnPct != null ? `${e.theoreticalReturnPct}%` : "—"}</span> from Gamma prices (Σyes {e.sumYes.toFixed(3)}, {(e.distFromArbBps / 100).toFixed(2)}% off par). Not orderbook-confirmed.
        </div>
      )}

      {e.rejectedReasons.length > 0 && (
        <div className="text-[10px] text-white/35 font-mono mb-2 leading-relaxed">
          {e.rejectedReasons.map((r, i) => <div key={i}>· {r}</div>)}
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} className="text-[10px] text-white/40 hover:text-white/70 font-mono uppercase tracking-wider">
        {open ? "▾ Hide" : "▸ Show"} basket ({e.legCount} legs)
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {e.legs.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded bg-white/[0.02]">
              <span className="text-[8px] font-black px-1 rounded" style={{ color: l.side === "YES" ? "#10b981" : "#ef4444", background: l.side === "YES" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>{l.side}</span>
              <span className="text-white/55 truncate flex-1">{l.question}</span>
              {l.fillPrice != null && l.fillPrice > 0 && <span className="text-white/35">fill {cents(l.fillPrice)}</span>}
              <span className="text-white/45">{cents(l.displayPrice)}</span>
            </div>
          ))}
          <div className="text-[9px] text-white/30 font-mono text-right pt-1">basket Σ {legSum.toFixed(3)} · place each leg yourself on Polymarket</div>
        </div>
      )}
    </div>
  );
};

// ─── play action card (demoted browse board) ────────────────────────────────
const PlayRow = ({ m, onTake }: { m: PolyMarket; onTake: (m: PolyMarket, side: "YES" | "NO") => void }) => {
  const c = marketCopy(m);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.015] text-[10px] font-mono">
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ color: tagColor(m.edge), background: `${tagColor(m.edge)}14` }}>{m.edge}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white/65 truncate">{m.question}</div>
        <div className="text-white/30 truncate">{c.call}</div>
      </div>
      <span className="text-white/30 shrink-0">YES {cents(m.yesPrice)}</span>
      <button onClick={() => onTake(m, "YES")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>YES</button>
      <button onClick={() => onTake(m, "NO")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>NO</button>
    </div>
  );
};

// ─── main ────────────────────────────────────────────────────────────────────
const PolymarketScreen = () => {
  const navigate = useNavigate();
  const { markets, fetchedAt, loading, error } = usePolymarkets();
  const [plays, setPlays] = useState<Play[]>(getPlays);
  const [, setRecord] = useState<TrackEntry[]>(getRecord);
  const [showAll, setShowAll] = useState(false);
  const riskPct = getRiskPct();
  const stats = playStats(plays);

  const eng = useEdges(Math.round(stats.bankroll));

  // Log the read scoreboard + resolve plays as before.
  useEffect(() => {
    if (markets.length) {
      setRecord(logMarkets(markets.map((m) => ({ id: m.id, question: m.question, edge: m.edge, yesPrice: m.yesPrice, daysLeft: m.daysLeft }))));
    }
    const pending = Array.from(new Set([
      ...getRecord().filter((e) => e.resolved == null && !e.id.startsWith("seed-")).map((e) => e.id),
      ...getPlays().filter((p) => p.resolved == null).map((p) => p.marketId),
    ])).slice(0, 30);
    if (pending.length) {
      fetch(`/api/resolve?ids=${pending.join(",")}`).then((r) => r.json()).then((d) => {
        if (d.results?.length) { setRecord(applyResolutions(d.results)); setPlays(resolvePlays(d.results)); }
      }).catch(() => { /* ignore */ });
    }
  }, [markets]);

  // Start the edge-observation cache the moment edges arrive (the proof dataset).
  useEffect(() => { if (eng.edges.length || eng.closest.length) observeEdges([...eng.edges, ...eng.closest]); }, [eng.fetchedAt]);

  const take = (m: PolyMarket, side: "YES" | "NO") => {
    const stake = Math.max(1, Math.round((stats.bankroll * riskPct) / 100 * 100) / 100);
    setPlays(logPlay(m, side, stake));
  };

  const openPlays = plays.filter((p) => p.resolved == null).slice().reverse();
  const donePlays = plays.filter((p) => p.resolved).slice().reverse();
  const age = fetchedAt ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000)) : null;
  const pnlColor = stats.realizedPnl > 0 ? "#10b981" : stats.realizedPnl < 0 ? "#ef4444" : "rgba(255,255,255,0.6)";

  const realEdges = eng.edges.filter((e) => e.status === "LIVE_EDGE" || e.status === "EXECUTABLE_EDGE");
  const pendingEdges = eng.edges.filter((e) => e.status === "THEORETICAL_EDGE" || e.status === "INSUFFICIENT_DEPTH" || e.status === "STALE_DATA");
  const hasLive = realEdges.length > 0;
  const sc = eng.scanned;

  const agentSystem = `You are NEXUS-P, the EXA Polymarket Edge analyst. The Arb Engine is the truth machine: math finds baskets, CLOB orderbook depth confirms them, fees/slippage/freshness decide LIVE. You NEVER declare an edge yourself — you explain why the engine classified one LIVE, THEORETICAL, or REJECTED, and flag resolution/augmented risk. Never say "guaranteed". The operator runs a £100 bankroll, read-only, placing real bets himself.
Scan now: ${sc ? `${sc.events} events, ${sc.negRiskEvents} negRisk, ${sc.live} live, ${sc.executable} executable, ${sc.theoretical} theoretical.` : "loading."}`;
  const top = eng.edges[0];
  const autoPrompt = top
    ? `The engine's top basket is "${top.eventTitle}" — status ${top.status}, ${top.arbType}, ${top.legCount} legs${top.netReturnPct != null ? `, net ${top.netReturnPct}%` : ""}. In plain English: explain why it's classified ${top.status}, and what resolution/execution risk I should check before placing each leg myself.`
    : "No basket is on the board. Explain, plainly, why mechanical edges are rare on Polymarket and what categories of event tend to produce them.";

  return (
    <div className="fixed inset-0 bg-[#060411] text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] shrink-0 bg-[#06041188]">
        <button onClick={() => navigate("/")} className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-mono">← NEXUS</button>
        <div className="w-px h-4 bg-white/10" />
        <div className="text-[11px] font-black text-violet-400 uppercase tracking-widest">POLYMARKET EDGE ENGINE</div>
        <div className="text-[9px] text-white/20 font-mono">mechanical arbitrage · read-only</div>
        <div className="ml-auto flex items-center gap-3">
          {eng.dataMode && <span className="text-[9px] font-mono uppercase" style={{ color: eng.dataMode === "clob_verified" ? "#10b981" : "#a855f7" }}>{eng.dataMode === "clob_verified" ? "CLOB-VERIFIED" : "GAMMA-ONLY"}</span>}
          {eng.refreshing && <span className="text-[9px] text-violet-400/60 font-mono animate-pulse">SCANNING…</span>}
          {eng.stale && <span className="text-[9px] text-amber-400/70 font-mono">SCANNER STALE</span>}
          {sc && <span className="text-[9px] text-white/25 font-mono">{sc.negRiskEvents} negRisk / {sc.events} events</span>}
        </div>
      </div>

      {/* Bankroll header */}
      <div className="shrink-0 px-6 py-3 border-b border-white/[0.07] bg-white/[0.015] flex items-center gap-8 flex-wrap">
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider font-mono">Bankroll</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: pnlColor }}>{money(stats.bankroll)}</div>
        </div>
        {([
          ["P&L", `${stats.realizedPnl >= 0 ? "+" : ""}${money(stats.realizedPnl)}`, pnlColor],
          ["Plays", `${stats.resolved}/${stats.taken}`, "rgba(255,255,255,0.7)"],
          ["Win rate", stats.winRate != null ? `${stats.winRate}%` : "—", stats.winRate != null && stats.winRate >= 50 ? "#10b981" : "rgba(255,255,255,0.7)"],
          ["Live edges", hasLive ? String(realEdges.length) : "0", hasLive ? "#10b981" : "rgba(255,255,255,0.5)"],
        ] as const).map(([l, v, c]) => (
          <div key={l}>
            <div className="text-[9px] text-white/30 uppercase tracking-wider font-mono">{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-white/35 font-mono max-w-[360px] leading-tight">
          The engine finds a basket or tells you to sit out. <span className="text-white/50">Math finds it · the orderbook proves it · you place it.</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
          {/* LIVE / EXECUTABLE */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono">Live Mechanical Edges</div>
            <div className="text-[9px] text-white/25 font-mono">CLOB-verified · net after fees/slippage · fresh</div>
          </div>

          {hasLive ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {realEdges.map((e, i) => <EdgeCard key={e.eventId} e={e} hero={i === 0} />)}
            </div>
          ) : (
            /* NO-EDGE STATE — as loud as an edge would be */
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6">
              <div className="text-base font-black text-white/80 mb-1">NO MECHANICAL EDGE RIGHT NOW</div>
              <div className="text-[11px] text-white/45 font-mono leading-relaxed mb-3">
                {eng.loading ? "Scanning negRisk events and walking orderbooks…" : "The board is priced efficiently after fees, spread and depth. Sit out — patience is a position. Forcing a trade here is how bankrolls die."}
              </div>
              {sc && (
                <div className="text-[10px] text-white/35 font-mono flex flex-wrap gap-x-5 gap-y-1">
                  <span>scanned <b className="text-white/60">{sc.events}</b> events</span>
                  <span><b className="text-white/60">{sc.negRiskEvents}</b> negRisk</span>
                  <span><b className="text-white/60">{sc.candidates}</b> candidates</span>
                  <span><b className="text-white/60">{sc.theoretical}</b> theoretical</span>
                  {eng.rejectedSummary && <span><b className="text-white/60">{eng.rejectedSummary.augmented}</b> augmented · <b className="text-white/60">{eng.rejectedSummary.insufficientDepth}</b> too-thin · <b className="text-white/60">{eng.rejectedSummary.staleBook}</b> stale</span>}
                </div>
              )}
              {eng.closest[0] && (
                <div className="text-[10px] text-white/40 font-mono mt-3">
                  Closest basket: <span className="text-white/65">{eng.closest[0].eventTitle}</span> — {(eng.closest[0].distFromArbBps / 100).toFixed(2)}% off par.
                </div>
              )}
            </div>
          )}

          {/* Needs confirmation / theoretical */}
          {pendingEdges.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono mt-8 mb-3">Candidates — Need Confirmation</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {pendingEdges.slice(0, 6).map((e) => <EdgeCard key={e.eventId} e={e} />)}
              </div>
            </>
          )}

          {/* Your plays */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono mt-8 mb-3">Your Plays</div>
          {plays.length === 0 ? (
            <div className="text-[11px] text-white/25 font-mono py-6 text-center border border-white/[0.05] rounded-2xl">
              No plays logged yet. Log single reads from the browse board, or place a verified basket on Polymarket and track it here.
            </div>
          ) : (
            <div className="space-y-1.5">
              {openPlays.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-[11px] font-mono">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>OPEN</span>
                  <span className="text-white/60 truncate flex-1">{p.question}</span>
                  <span className="text-white/40">{p.side} @ {cents(p.entryPrice)}</span>
                  <span className="text-white/70 font-black">{money(p.stake)}</span>
                </div>
              ))}
              {donePlays.map((p) => {
                const won = p.resolved === "WON";
                const c = won ? "#10b981" : "#ef4444";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[11px] font-mono" style={{ borderColor: `${c}22`, background: `${c}0a` }}>
                    <span className="font-black" style={{ color: c }}>{won ? "✓" : "✗"}</span>
                    <span className="text-white/55 truncate flex-1">{p.question}</span>
                    <span className="text-white/40">{p.side} @ {cents(p.entryPrice)}</span>
                    <span className="font-black" style={{ color: c }}>{p.pnl >= 0 ? "+" : ""}{money(p.pnl)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Browse all markets — informational, NOT mechanical edge */}
          <button onClick={() => setShowAll((s) => !s)} className="text-[10px] text-white/35 hover:text-white/60 font-mono uppercase tracking-wider mt-8 mb-2">
            {showAll ? "▾ Hide" : "▸ Browse"} all {markets.length} markets — informational, not edge
          </button>
          {showAll && (
            <div className="space-y-1">
              {loading && <div className="text-[10px] text-white/25 font-mono">loading…</div>}
              {error && <div className="text-[10px] text-red-400/60 font-mono">market feed error</div>}
              {[...markets].sort((a, b) => b.score - a.score).map((m) => <PlayRow key={m.id} m={m} onTake={take} />)}
            </div>
          )}

          <div className="mt-8 text-[9px] text-white/15 font-mono text-center leading-relaxed">
            Read-only intelligence. The engine finds mechanical baskets and tells you when there are none — it never auto-executes and holds no keys.<br />
            "Guaranteed" is earned, not assumed: only a fresh, CLOB-verified, net-positive basket is LIVE. You place every leg yourself on Polymarket.
          </div>
        </div>

        {/* Right rail */}
        <div className="w-[300px] border-l border-white/[0.06] shrink-0 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono">Macro Context</div>
            <div className="text-[8px] text-white/20 font-mono">live market indicators</div>
          </div>
          <div className="px-3 py-3 border-b border-white/[0.06] shrink-0 overflow-y-auto" style={{ maxHeight: "300px" }}>
            <MacroContextPanel />
          </div>
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono">NEXUS-P AGENT</div>
            <div className="text-[8px] text-white/20 font-mono">interprets the engine — never overrides math</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScreenAgent
              key={eng.fetchedAt ? "ready" : "wait"}
              agentId="NEXUS-P"
              agentRole="Edge Analyst"
              glowColor="#a855f7"
              systemContext={agentSystem}
              autoPrompt={autoPrompt}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolymarketScreen;
