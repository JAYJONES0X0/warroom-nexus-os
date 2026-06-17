import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { useEdges } from "@/hooks/useEdges";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroContextPanel } from "@/components/MacroContextPanel";
import { marketCopy, type MarketCategory } from "@/lib/marketCopy";
import { observeEdges } from "@/lib/edgeJournal";
import { getWatch, toggleWatch } from "@/lib/watchlist";
import type { ArbEdge } from "@/lib/arb";
import {
  getRecord, logMarkets, applyResolutions, computeStats,
  getPlays, logPlay, resolvePlays, playStats,
  type TrackEntry, type Play,
} from "@/lib/trackRecord";

// ─── design tokens ───────────────────────────────────────────────────────────
const FLOW_COLOR = { IN: "#10b981", OUT: "#ef4444", FLAT: "#6b7280" } as const;
const CATEGORY_COLOR: Record<MarketCategory, string> = {
  GEOPOLITICAL: "#f43f5e", SPORTS: "#38bdf8", MACRO: "#f59e0b", CRYPTO: "#a78bfa", EVENTS: "#64748b",
};
const TAG_COLOR: Record<string, string> = {
  ARB: "#22d3ee", CONTESTED: "#f59e0b", CONSENSUS: "#94a3b8", LONGSHOT: "#a855f7", THIN: "#6b7280", OPEN: "#64748b",
};
const flowColor = (f: string) => FLOW_COLOR[f as keyof typeof FLOW_COLOR] ?? FLOW_COLOR.FLAT;
const flowLabel = (f: string) => f === "IN" ? "MONEY IN" : f === "OUT" ? "MONEY OUT" : "QUIET";
const tagColor = (t: string) => TAG_COLOR[t] ?? TAG_COLOR.OPEN;
const money = (n: number) => `£${n.toFixed(2)}`;
const cents = (p: number) => `${Math.round(p * 100)}¢`;
const kfmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
const whenStr = (d: number | null) => d == null ? "—" : d === 0 ? "today" : d === 1 ? "tomorrow" : `${d}d`;

function getRiskPct(): number {
  try {
    const s = localStorage.getItem("warroom.prefs");
    if (s) { const r = parseFloat(JSON.parse(s).risk); if (r > 0 && r <= 20) return r; }
  } catch { /**/ }
  return 4;
}

// ─── Price bar ───────────────────────────────────────────────────────────────
function PriceBar({ yes, pts }: { yes: number; pts: number }) {
  const from = Math.max(0, Math.min(100, yes - pts));
  const hue = Math.round((yes / 100) * 120); // 0=red, 60=yellow, 120=green
  return (
    <div className="relative h-1.5 rounded-full my-3 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
        style={{ width: `${yes}%`, background: `hsl(${hue}, 80%, 52%)` }}
      />
      {Math.abs(pts) >= 3 && (
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${from}%`, background: "rgba(255,255,255,0.45)" }}
          title={`Was ${from}¢ 24h ago`}
        />
      )}
    </div>
  );
}

// ─── Mover card ──────────────────────────────────────────────────────────────
const MoverCard = ({ m, watched, onWatch, onTake, hero }: {
  m: PolyMarket; watched: boolean; onWatch: (id: string) => void;
  onTake: (m: PolyMarket, side: "YES" | "NO") => void; hero?: boolean;
}) => {
  const c = marketCopy(m);
  const col = flowColor(c.flow);
  const catCol = CATEGORY_COLOR[c.category];
  const pts = Math.round((m.move24h ?? 0) * 100);
  const yes = Math.round(m.yesPrice * 100);
  const [taken, setTaken] = useState<"YES" | "NO" | null>(null);
  const take = (s: "YES" | "NO") => { onTake(m, s); setTaken(s); setTimeout(() => setTaken(null), 2200); };

  const urgencyColor = c.urgency === "HOT" ? "#ef4444" : "#f59e0b";

  const cardStyle: React.CSSProperties = {
    background: hero
      ? `linear-gradient(135deg, ${col}16 0%, rgba(6,4,17,0.92) 55%, ${catCol}0a 100%)`
      : `linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(6,4,17,0.88) 100%)`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${hero ? `${col}30` : "rgba(255,255,255,0.07)"}`,
    borderLeft: `3px solid ${col}${hero ? "cc" : "70"}`,
    boxShadow: hero
      ? `0 0 60px ${col}14, 0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px ${catCol}0a`
      : `0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 12px ${col}08`,
  };

  return (
    <div className="rounded-2xl relative overflow-hidden" style={cardStyle}>
      {/* Top flow intensity bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, ${col}cc 0%, ${col}44 ${Math.min(90, Math.abs(pts) * 1.3)}%, transparent 100%)`,
        }}
      />

      <div className={hero ? "p-6" : "p-4"}>
        {/* Badge row */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest"
            style={{ color: col, background: `${col}18`, border: `1px solid ${col}35` }}
          >
            {flowLabel(c.flow)}
          </span>
          {/* Big pts on hero, small on rest */}
          {hero && pts !== 0 ? (
            <span className="text-4xl font-black tabular-nums ml-1" style={{ color: col }}>
              {pts > 0 ? "+" : ""}{pts}¢
            </span>
          ) : pts !== 0 ? (
            <span className="text-[15px] font-black tabular-nums" style={{ color: col }}>
              {pts > 0 ? "+" : ""}{pts}¢ <span className="text-[10px] text-white/30 font-normal">24h</span>
            </span>
          ) : null}
          <span
            className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ml-1"
            style={{ color: catCol, background: `${catCol}18`, border: `1px solid ${catCol}25` }}
          >
            {c.category}
          </span>
          {c.urgency !== "COLD" && (
            <span
              className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider"
              style={{ color: urgencyColor, background: `${urgencyColor}18`, border: `1px solid ${urgencyColor}30` }}
            >
              {c.urgency === "HOT" ? "⚡ URGENT" : "SETTLING SOON"}
            </span>
          )}
          <button
            onClick={() => onWatch(m.id)}
            className="ml-auto text-base leading-none transition-all hover:scale-125"
            style={{ color: watched ? "#fbbf24" : "rgba(255,255,255,0.2)", filter: watched ? "drop-shadow(0 0 4px #fbbf2488)" : "none" }}
          >
            {watched ? "★" : "☆"}
          </button>
        </div>

        {/* Headline */}
        <div className={`${hero ? "text-xl" : "text-[15px]"} font-black text-white leading-snug mb-1`}>
          {c.call}
        </div>

        {/* Market question */}
        <div className="text-[11px] text-white/35 font-mono leading-relaxed mb-0.5">{m.question}</div>

        {/* Price bar — visual representation */}
        <PriceBar yes={yes} pts={pts} />

        {/* Why body */}
        <div className="text-[11px] text-white/55 font-mono leading-relaxed mb-2">{c.why}</div>

        {/* Discipline — the rule that governs the play */}
        <div
          className="text-[10px] font-mono leading-relaxed mb-3 pl-3 py-1 italic"
          style={{
            color: "rgba(255,255,255,0.32)",
            borderLeft: `2px solid ${col}30`,
            background: `${col}06`,
            borderRadius: "0 4px 4px 0",
          }}
        >
          {c.discipline}
        </div>

        {/* Meta row */}
        <div
          className="flex items-center gap-3 text-[10px] text-white/35 font-mono pt-2.5 mb-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span>YES <span className="text-white/70 font-black text-sm">{yes}¢</span></span>
          <span>·</span>
          <span>{kfmt(m.volume24h)} vol</span>
          <span>·</span>
          <span>settles {whenStr(m.daysLeft)}</span>
          <span className="ml-auto text-[9px] font-black uppercase" style={{ color: tagColor(m.edge) }}>{m.edge}</span>
        </div>

        {/* Action buttons */}
        {taken ? (
          <div
            className="text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
            style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            ✓ Logged {taken} — place it on Polymarket
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => take("YES")}
              className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.28)",
                color: "#10b981",
                boxShadow: "0 0 0 0 transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(16,185,129,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}
            >
              Take YES · {cents(m.yesPrice)}
            </button>
            <button
              onClick={() => take("NO")}
              className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.28)",
                color: "#ef4444",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(239,68,68,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}
            >
              Take NO · {cents(m.noPrice)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── arb row ─────────────────────────────────────────────────────────────────
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
      }).catch(() => { /**/ });
    }
  }, [markets]);

  useEffect(() => { if (eng.edges.length) observeEdges(eng.edges); }, [eng.fetchedAt]);

  const take = (m: PolyMarket, side: "YES" | "NO") => {
    const stake = Math.max(1, Math.round((stats.bankroll * riskPct) / 100 * 100) / 100);
    setPlays(logPlay(m, side, stake));
  };
  const onWatch = (id: string) => setWatch(toggleWatch(id));

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

  // Background glow from top mover's flow direction
  const heroFlow = movers[0] ? flowColor(marketCopy(movers[0]).flow) : "#6b7280";

  const topMovers = movers.slice(0, 3);
  const moverSummary = topMovers.map((m, i) =>
    `${i + 1}. "${m.question}" — ${Math.round((m.move24h ?? 0) * 100) > 0 ? "+" : ""}${Math.round((m.move24h ?? 0) * 100)}¢, now ${Math.round(m.yesPrice * 100)}¢, settles ${m.daysLeft != null ? `in ${m.daysLeft}d` : "soon"}`
  ).join("\n");

  const agentSystem = `You are NEXUS-P, the EXA prediction-market analyst. Sharp, honest takes — what moved, where money went, and whether the repricing looks justified or overdone. You NEVER claim a guaranteed edge. Every call is scored against real resolution — be accountable.
Right now: ${activeMovers} markets moved >5c in 24h. Mechanical arb live: ${liveArb}.`;

  const autoPrompt = topMovers.length > 0
    ? `Today's top ${topMovers.length} movers:\n${moverSummary}\n\nFor each: what likely drove the move, is it justified/overdone/fair, and the one risk that would change your read? Be specific.`
    : "The board is quiet today. What kind of event or news usually creates sharp repricings worth acting on?";

  return (
    <div
      className="fixed inset-0 text-white flex flex-col"
      style={{
        fontFamily: "monospace",
        background: `radial-gradient(ellipse at 25% 0%, ${heroFlow}12 0%, #060411 45%), radial-gradient(ellipse at 75% 100%, ${heroFlow}08 0%, transparent 50%), #060411`,
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(6,4,17,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <button onClick={() => navigate("/")} className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">← NEXUS</button>
        <div className="w-px h-4 bg-white/10" />
        <div className="text-[11px] font-black text-violet-400 uppercase tracking-widest">POLYMARKET PULSE</div>
        <div className="text-[9px] text-white/20">live money flow · accountable reads</div>
        <div className="ml-auto flex items-center gap-3">
          {age !== null && <span className="text-[9px] text-white/25">{age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago</span>}
          {loading && <span className="text-[9px] text-violet-400/60 animate-pulse">LOADING…</span>}
          {error && <span className="text-[9px] text-red-400/70">API ERR</span>}
          <span className="text-[9px] text-white/20">{markets.length} MARKETS</span>
        </div>
      </div>

      {/* Stats header */}
      <div
        className="shrink-0 px-6 py-3 border-b flex items-center gap-8 flex-wrap"
        style={{
          borderColor: "rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.018)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Bankroll</div>
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
            <div className="text-[9px] text-white/30 uppercase tracking-wider">{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-white/30 max-w-[300px] leading-tight">
          The price is the crowd's truth. <span className="text-white/45">We read where it MOVED and why — then reality scores us.</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70">Today's Biggest Moves</div>
            <div className="text-[9px] text-white/30">{activeMovers > 0 ? `${activeMovers} markets moved >5¢ in 24h` : "quiet board"}</div>
          </div>

          {movers.length === 0 ? (
            <div
              className="text-[11px] text-white/25 py-12 text-center rounded-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
            >
              {loading ? "Reading the board…" : "No market data right now."}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Hero card — full width, max drama */}
              <MoverCard
                key={movers[0].id}
                m={movers[0]}
                watched={watch.includes(movers[0].id)}
                onWatch={onWatch}
                onTake={take}
                hero
              />
              {/* Remaining in 2-col grid */}
              {movers.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {movers.slice(1).map((m) => (
                    <MoverCard key={m.id} m={m} watched={watch.includes(m.id)} onWatch={onWatch} onTake={take} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mechanical arb strip */}
          <button
            onClick={() => setShowArb((s) => !s)}
            className="w-full mt-5 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ color: liveArb > 0 ? "#10b981" : "#6b7280", background: liveArb > 0 ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)" }}>ARB SCAN</span>
            <span className="text-white/50">{liveArb > 0 ? `${liveArb} live mechanical edge(s)` : "0 live mechanical arbs"}</span>
            <span className="text-white/25">· {eng.scanned?.negRiskEvents ?? 0} negRisk events walked · {eng.dataMode === "clob_verified" ? "CLOB-verified" : "scanning"}</span>
            <span className="ml-auto text-white/35">{showArb ? "▾" : "▸"}</span>
          </button>
          {showArb && (
            <div className="space-y-1 mt-2">
              {eng.edges.length === 0
                ? <div className="text-[10px] text-white/25 px-1">No candidates — board priced efficiently after fees & depth.</div>
                : eng.edges.slice(0, 8).map((e) => <ArbRow key={e.eventId} e={e} />)}
            </div>
          )}

          {/* Watchlist */}
          {watched.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 mt-8 mb-3">★ Watching</div>
              <div className="space-y-1.5">
                {watched.map((m) => {
                  const pts = Math.round((m.move24h ?? 0) * 100);
                  const col = flowColor(marketCopy(m).flow);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px]"
                      style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}
                    >
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

          {/* Plays / Receipts */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 mt-8 mb-3">Your Plays — Receipts</div>
          {plays.length === 0 ? (
            <div
              className="text-[11px] text-white/25 py-6 text-center rounded-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}
            >
              No plays yet — take one above. Logged here, scored against real resolution.
            </div>
          ) : (
            <div className="space-y-1.5">
              {openPlays.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px]" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>OPEN</span>
                  <span className="text-white/60 truncate flex-1">{p.question}</span>
                  <span className="text-white/40">{p.side} @ {cents(p.entryPrice)}</span>
                  <span className="text-white/70 font-black">{money(p.stake)}</span>
                </div>
              ))}
              {donePlays.map((p) => {
                const won = p.resolved === "WON"; const c = won ? "#10b981" : "#ef4444";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px]" style={{ borderColor: `${c}22`, border: `1px solid ${c}22`, background: `${c}0a` }}>
                    <span className="font-black" style={{ color: c }}>{won ? "✓" : "✗"}</span>
                    <span className="text-white/55 truncate flex-1">{p.question}</span>
                    <span className="text-white/40">{p.side} @ {cents(p.entryPrice)}</span>
                    <span className="font-black" style={{ color: c }}>{p.pnl >= 0 ? "+" : ""}{money(p.pnl)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Browse all */}
          <button onClick={() => setShowAll((s) => !s)} className="text-[10px] text-white/35 hover:text-white/60 uppercase tracking-wider mt-8 mb-2">
            {showAll ? "▾ Hide" : "▸ Browse"} all {markets.length} markets
          </button>
          {showAll && (
            <div className="space-y-1">
              {[...markets].sort((a, b) => b.score - a.score).map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
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

          <div className="mt-8 text-[9px] text-white/12 text-center leading-relaxed pb-4">
            Read-only intelligence. We surface where money moved and a take on why — never a guaranteed edge.<br />
            Every read and play is scored against real resolution. You place every bet yourself on Polymarket.
          </div>
        </div>

        {/* Right rail — glass panel */}
        <div
          className="w-[300px] shrink-0 flex flex-col overflow-hidden"
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(6,4,17,0.6)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider">Macro Context</div>
            <div className="text-[8px] text-white/20">live market indicators · updates every 60s</div>
          </div>
          <div className="px-3 py-3 shrink-0 overflow-y-auto" style={{ maxHeight: "300px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <MacroContextPanel />
          </div>
          <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider">NEXUS-P AGENT</div>
            <div className="text-[8px] text-white/20">reads top 3 movers — ask before you stake</div>
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
