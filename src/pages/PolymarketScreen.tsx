import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { useEdges } from "@/hooks/useEdges";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroContextPanel } from "@/components/MacroContextPanel";
import { marketCopy } from "@/lib/marketCopy";
import { observeEdges } from "@/lib/edgeJournal";
import { getWatch, toggleWatch } from "@/lib/watchlist";
import type { ArbEdge } from "@/lib/arb";
import {
  getRecord, logMarkets, applyResolutions, computeStats,
  getPlays, logPlay, resolvePlays, playStats,
  type TrackEntry, type Play,
} from "@/lib/trackRecord";

// ─── helpers ───────────────────────────────────────────────────────────────
const TAG_COLOR: Record<string, string> = {
  ARB: "#22d3ee", CONTESTED: "#f59e0b", CONSENSUS: "#94a3b8", LONGSHOT: "#a855f7", THIN: "#6b7280", OPEN: "#64748b",
};
const tagColor = (t: string) => TAG_COLOR[t] ?? TAG_COLOR.OPEN;
const money = (n: number) => `£${n.toFixed(2)}`;
const cents = (p: number) => `${Math.round(p * 100)}¢`;
const kfmt = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
const whenStr = (d: number | null) => (d == null ? "—" : d === 0 ? "today" : d === 1 ? "tomorrow" : `${d}d`);

function getRiskPct(): number {
  try {
    const s = localStorage.getItem("warroom.prefs");
    if (s) { const r = parseFloat(JSON.parse(s).risk); if (r > 0 && r <= 20) return r; }
  } catch { /* ignore */ }
  return 4;
}

const flowColor = (f: string) => (f === "IN" ? "#10b981" : f === "OUT" ? "#ef4444" : "#6b7280");
const flowLabel = (f: string) => (f === "IN" ? "MONEY IN" : f === "OUT" ? "MONEY OUT" : "QUIET");

// ─── mover card — the live pulse ────────────────────────────────────────────
const MoverCard = ({ m, watched, onWatch, onTake, hero }: {
  m: PolyMarket; watched: boolean; onWatch: (id: string) => void;
  onTake: (m: PolyMarket, side: "YES" | "NO") => void; hero?: boolean;
}) => {
  const c = marketCopy(m);
  const col = flowColor(c.flow);
  const pts = Math.round((m.move24h ?? 0) * 100);
  const [taken, setTaken] = useState<"YES" | "NO" | null>(null);
  const take = (s: "YES" | "NO") => { onTake(m, s); setTaken(s); setTimeout(() => setTaken(null), 2000); };

  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: `${col}3a`, background: hero ? `${col}0e` : "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide" style={{ color: col, background: `${col}1a`, border: `1px solid ${col}40` }}>{flowLabel(c.flow)}</span>
        {pts !== 0 && <span className="text-[13px] font-black tabular-nums" style={{ color: col }}>{pts > 0 ? "+" : ""}{pts}¢ <span className="text-white/30 font-normal">24h</span></span>}
        <button onClick={() => onWatch(m.id)} title="Track this market" className="ml-auto text-base leading-none transition-transform hover:scale-110" style={{ color: watched ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>{watched ? "★" : "☆"}</button>
      </div>

      <div className={`${hero ? "text-lg" : "text-[15px]"} font-black text-white leading-snug mb-1`}>{c.call}</div>
      <div className="text-[11px] text-white/45 font-mono leading-relaxed mb-1">{m.question}</div>
      <div className="text-[11px] text-white/55 font-mono leading-relaxed mb-3">{c.why}</div>

      <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono border-t border-white/[0.06] pt-2.5 mb-3">
        <span>now <span className="text-white/70 font-black">{cents(m.yesPrice)}</span></span>
        <span>· {kfmt(m.volume24h)} vol</span>
        <span>· settles {whenStr(m.daysLeft)}</span>
        <span className="ml-auto text-white/30 uppercase">{m.edge}</span>
      </div>

      {taken ? (
        <div className="text-center py-2 rounded-xl text-xs font-black uppercase tracking-wider" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
          ✓ Logged {taken} — place it on Polymarket
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => take("YES")} className="py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:-translate-y-0.5" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>Take YES · {cents(m.yesPrice)}</button>
          <button onClick={() => take("NO")} className="py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:-translate-y-0.5" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>Take NO · {cents(m.noPrice)}</button>
        </div>
      )}
    </div>
  );
};

// ─── arb candidate row (demoted, honest) ─────────────────────────────────────
const ArbRow = ({ e }: { e: ArbEdge }) => {
  const live = e.status === "LIVE_EDGE" || e.status === "EXECUTABLE_EDGE";
  const col = live ? "#10b981" : e.status === "INSUFFICIENT_DEPTH" || e.status === "STALE_DATA" ? "#f59e0b" : "#a855f7";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.015] text-[10px] font-mono">
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ color: col, background: `${col}14` }}>{e.status.replace("_", " ")}</span>
      <span className="text-white/55 truncate flex-1">{e.eventTitle}</span>
      <span className="text-white/30 shrink-0">{e.arbType === "BUY_ALL_YES" ? "ALL YES" : "ALL NO"} · {e.legCount}legs</span>
      <span className="shrink-0" style={{ color: col }}>{live && e.netReturnPct != null ? `net ${e.netReturnPct}%` : `theo ${e.theoreticalReturnPct ?? 0}%`}</span>
    </div>
  );
};

// ─── main ────────────────────────────────────────────────────────────────────
const PolymarketScreen = () => {
  const navigate = useNavigate();
  const { markets, fetchedAt, loading, error } = usePolymarkets();
  const eng = useEdges(100);
  const [plays, setPlays] = useState<Play[]>(getPlays);
  const [record, setRecord] = useState<TrackEntry[]>(getRecord);
  const [watch, setWatch] = useState<string[]>(getWatch);
  const [showArb, setShowArb] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const riskPct = getRiskPct();
  const stats = playStats(plays);
  const readStats = computeStats(record);

  useEffect(() => {
    if (markets.length) {
      setRecord(logMarkets(markets.map((m) => ({ id: m.id, question: m.question, edge: m.edge, yesPrice: m.yesPrice, daysLeft: m.daysLeft }))));
    }
    const pending = Array.from(new Set([
      ...getRecord().filter((e) => e.resolved == null && !e.id.startsWith("seed-")).map((e) => e.id),
      ...getPlays().filter((p) => p.resolved == null).map((p) => p.marketId),
    ])).slice(0, 30);
    if (pending.length) {
      fetch(`/api/polymarket?ids=${pending.join(",")}`).then((r) => r.json()).then((d) => {
        if (d.results?.length) { setRecord(applyResolutions(d.results)); setPlays(resolvePlays(d.results)); }
      }).catch(() => { /* ignore */ });
    }
  }, [markets]);

  useEffect(() => { if (eng.edges.length) observeEdges(eng.edges); }, [eng.fetchedAt]);

  const take = (m: PolyMarket, side: "YES" | "NO") => {
    const stake = Math.max(1, Math.round((stats.bankroll * riskPct) / 100 * 100) / 100);
    setPlays(logPlay(m, side, stake));
  };
  const onWatch = (id: string) => setWatch(toggleWatch(id));

  // The pulse: markets ranked by how hard money moved in 24h.
  const movers = useMemo(
    () => [...markets].sort((a, b) => Math.abs(b.move24h ?? 0) - Math.abs(a.move24h ?? 0)).slice(0, 6),
    [markets],
  );
  const activeMovers = markets.filter((m) => Math.abs((m.move24h ?? 0) * 100) >= 5).length;
  const watched = useMemo(() => markets.filter((m) => watch.includes(m.id)), [markets, watch]);

  const openPlays = plays.filter((p) => p.resolved == null).slice().reverse();
  const donePlays = plays.filter((p) => p.resolved).slice().reverse();
  const age = fetchedAt ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000)) : null;
  const pnlColor = stats.realizedPnl > 0 ? "#10b981" : stats.realizedPnl < 0 ? "#ef4444" : "rgba(255,255,255,0.6)";
  const liveArb = eng.scanned?.live ?? 0;

  const agentSystem = `You are NEXUS-P, the EXA prediction-market analyst. You read the live money flow on Polymarket and give a sharp, honest take — what moved, where the money went, and whether the repricing looks justified or overdone. You NEVER claim a guaranteed edge: the price is the consensus; you flag where it MIGHT be wrong with a specific reason, else you say "priced fairly". Your calls are logged and scored against real resolution — be accountable.
Right now: ${activeMovers} markets moved >5c in 24h. Top mover: ${movers[0] ? `"${movers[0].question}" (${Math.round((movers[0].move24h ?? 0) * 100)}c)` : "none"}. Mechanical arb live: ${liveArb}.`;
  const autoPrompt = movers[0]
    ? `Today's biggest move is "${movers[0].question}" — ${Math.round((movers[0].move24h ?? 0) * 100)}¢ in 24h, now ${Math.round(movers[0].yesPrice * 100)}¢. In plain English: what likely drove this, and is the move justified, overdone, or a fair repricing? Give me the one risk that would change your read.`
    : "The board is quiet today. What kind of event or news usually creates the sharp repricings worth acting on here?";

  return (
    <div className="fixed inset-0 bg-[#060411] text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] shrink-0 bg-[#06041188]">
        <button onClick={() => navigate("/")} className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-mono">← NEXUS</button>
        <div className="w-px h-4 bg-white/10" />
        <div className="text-[11px] font-black text-violet-400 uppercase tracking-widest">POLYMARKET PULSE</div>
        <div className="text-[9px] text-white/20 font-mono">live money flow · accountable reads</div>
        <div className="ml-auto flex items-center gap-3">
          {age !== null && <span className="text-[9px] text-white/30 font-mono">{age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago</span>}
          {loading && <span className="text-[9px] text-violet-400/60 font-mono animate-pulse">LOADING…</span>}
          {error && <span className="text-[9px] text-red-400/70 font-mono">API ERR</span>}
          <span className="text-[9px] text-white/20 font-mono">{markets.length} MARKETS</span>
        </div>
      </div>

      {/* Bankroll + receipts header */}
      <div className="shrink-0 px-6 py-3 border-b border-white/[0.07] bg-white/[0.015] flex items-center gap-8 flex-wrap">
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider font-mono">Bankroll</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: pnlColor }}>{money(stats.bankroll)}</div>
        </div>
        {([
          ["P&L", `${stats.realizedPnl >= 0 ? "+" : ""}${money(stats.realizedPnl)}`, pnlColor],
          ["Plays", `${stats.resolved}/${stats.taken}`, "rgba(255,255,255,0.7)"],
          ["Play win%", stats.winRate != null ? `${stats.winRate}%` : "—", stats.winRate != null && stats.winRate >= 50 ? "#10b981" : "rgba(255,255,255,0.7)"],
          ["Reads scored", `${readStats.resolved}/${readStats.tracked}`, "rgba(255,255,255,0.7)"],
          ["Fav hit-rate", readStats.favHitRate != null ? `${readStats.favHitRate}%` : "—", "rgba(255,255,255,0.7)"],
        ] as const).map(([l, v, c]) => (
          <div key={l}>
            <div className="text-[9px] text-white/30 uppercase tracking-wider font-mono">{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-white/35 font-mono max-w-[320px] leading-tight">
          The price is the crowd's truth. <span className="text-white/50">We read where it MOVED and why — then reality scores us.</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
          {/* Today's biggest moves — the pulse */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono">Today's Biggest Moves</div>
            <div className="text-[9px] text-white/30 font-mono">{activeMovers > 0 ? `${activeMovers} markets moved >5¢ in 24h` : "quiet board — small moves only"}</div>
          </div>
          {movers.length === 0 ? (
            <div className="text-[11px] text-white/25 font-mono py-8 text-center border border-white/[0.05] rounded-2xl">{loading ? "Reading the board…" : "No market data right now."}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {movers.map((m, i) => <MoverCard key={m.id} m={m} watched={watch.includes(m.id)} onWatch={onWatch} onTake={take} hero={i === 0} />)}
            </div>
          )}

          {/* Mechanical arb — demoted to an honest one-line strip */}
          <button onClick={() => setShowArb((s) => !s)} className="w-full mt-5 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.015] text-[10px] font-mono hover:bg-white/[0.03] transition-colors">
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ color: liveArb > 0 ? "#10b981" : "#6b7280", background: liveArb > 0 ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)" }}>ARB SCAN</span>
            <span className="text-white/55">{liveArb > 0 ? `${liveArb} live mechanical edge(s)` : "0 live mechanical arbs"}</span>
            <span className="text-white/30">· {eng.scanned?.negRiskEvents ?? 0} negRisk events walked · {eng.dataMode === "clob_verified" ? "CLOB-verified" : "scanning"}</span>
            <span className="ml-auto text-white/40">{showArb ? "▾" : "▸"}</span>
          </button>
          {showArb && (
            <div className="space-y-1 mt-2">
              {eng.edges.length === 0 ? <div className="text-[10px] text-white/25 font-mono px-1">No candidates — board priced efficiently after fees & depth.</div>
                : eng.edges.slice(0, 8).map((e) => <ArbRow key={e.eventId} e={e} />)}
            </div>
          )}

          {/* Watchlist */}
          {watched.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono mt-8 mb-3">★ Watching</div>
              <div className="space-y-1.5">
                {watched.map((m) => {
                  const pts = Math.round((m.move24h ?? 0) * 100);
                  const col = flowColor(marketCopy(m).flow);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-[11px] font-mono">
                      <button onClick={() => onWatch(m.id)} className="text-amber-400 text-sm leading-none">★</button>
                      <span className="text-white/60 truncate flex-1">{m.question}</span>
                      <span className="tabular-nums" style={{ color: col }}>{pts > 0 ? "+" : ""}{pts}¢</span>
                      <span className="text-white/50">{cents(m.yesPrice)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Your plays — the receipts */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono mt-8 mb-3">Your Plays — Receipts</div>
          {plays.length === 0 ? (
            <div className="text-[11px] text-white/25 font-mono py-6 text-center border border-white/[0.05] rounded-2xl">No plays yet — take one above. Logged here, scored against real resolution.</div>
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
                const won = p.resolved === "WON"; const c = won ? "#10b981" : "#ef4444";
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

          {/* Browse */}
          <button onClick={() => setShowAll((s) => !s)} className="text-[10px] text-white/35 hover:text-white/60 font-mono uppercase tracking-wider mt-8 mb-2">
            {showAll ? "▾ Hide" : "▸ Browse"} all {markets.length} markets
          </button>
          {showAll && (
            <div className="space-y-1">
              {[...markets].sort((a, b) => b.score - a.score).map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.015] text-[10px] font-mono">
                  <button onClick={() => onWatch(m.id)} className="text-sm leading-none shrink-0" style={{ color: watch.includes(m.id) ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>{watch.includes(m.id) ? "★" : "☆"}</button>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ color: tagColor(m.edge), background: `${tagColor(m.edge)}14` }}>{m.edge}</span>
                  <span className="text-white/55 truncate flex-1">{m.question}</span>
                  <span className="text-white/30 shrink-0">YES {cents(m.yesPrice)}</span>
                  <button onClick={() => take(m, "YES")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>YES</button>
                  <button onClick={() => take(m, "NO")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>NO</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-[9px] text-white/15 font-mono text-center leading-relaxed">
            Read-only intelligence. We surface where the money moved and a take on why — never a guaranteed edge.<br />
            Every read and play is scored against real resolution. You place every bet yourself on Polymarket.
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
            <div className="text-[8px] text-white/20 font-mono">reads the top mover — ask before you stake</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScreenAgent
              key={fetchedAt ? "ready" : "wait"}
              agentId="NEXUS-P"
              agentRole="Pulse Analyst"
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
