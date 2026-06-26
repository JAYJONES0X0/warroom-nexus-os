import { useState, useMemo, useEffect } from "react";
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

// ─── tokens ──────────────────────────────────────────────────────────────────
const FLOW_COLOR = { IN: "#10b981", OUT: "#ef4444", FLAT: "#6b7280" } as const;
const CATEGORY_COLOR: Record<MarketCategory, string> = {
  GEOPOLITICAL: "#f43f5e", SPORTS: "#38bdf8", MACRO: "#f59e0b", CRYPTO: "#a78bfa", EVENTS: "#64748b",
};
const TAG_COLOR: Record<string, string> = {
  ARB: "#22d3ee", CONTESTED: "#f59e0b", CONSENSUS: "#94a3b8", LONGSHOT: "#a855f7", THIN: "#6b7280", OPEN: "#64748b",
};
const flowColor = (f: string) => FLOW_COLOR[f as keyof typeof FLOW_COLOR] ?? FLOW_COLOR.FLAT;
const flowLabel = (f: string) => f === "IN" ? "MONEY IN" : f === "OUT" ? "MONEY OUT" : "QUIET";
const tagColor  = (t: string) => TAG_COLOR[t] ?? TAG_COLOR.OPEN;
const money  = (n: number) => `£${n.toFixed(2)}`;
const cents  = (p: number) => `${Math.round(p * 100)}¢`;
const kfmt   = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
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
  const hue  = Math.round((yes / 100) * 120);
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
        style={{ width: `${yes}%`, background: `hsl(${hue},80%,52%)` }}
      />
      {Math.abs(pts) >= 3 && (
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${from}%`, background: "rgba(255,255,255,0.45)" }} />
      )}
    </div>
  );
}

// ─── Hero card ───────────────────────────────────────────────────────────────
const HeroCard = ({ m, watched, onWatch, onTake }: {
  m: PolyMarket; watched: boolean;
  onWatch: (id: string) => void; onTake: (m: PolyMarket, side: "YES" | "NO") => void;
}) => {
  const c   = marketCopy(m);
  const col = flowColor(c.flow);
  const catCol = CATEGORY_COLOR[c.category];
  const pts = Math.round((m.move24h ?? 0) * 100);
  const yes = Math.round(m.yesPrice * 100);
  const [taken, setTaken] = useState<"YES" | "NO" | null>(null);
  const take = (s: "YES" | "NO") => { onTake(m, s); setTaken(s); setTimeout(() => setTaken(null), 2200); };
  const urgencyColor = c.urgency === "HOT" ? "#ef4444" : "#f59e0b";

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${col}10 0%, rgba(6,4,17,0.97) 55%)`,
        border: `1px solid ${col}22`,
        borderLeft: `3px solid ${col}`,
        boxShadow: `0 0 80px ${col}0d, 0 24px 64px rgba(0,0,0,0.7)`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, ${col}90, ${col}20 40%, transparent)` }} />

      <div className="p-5">
        {/* Badge row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ color: col, background: `${col}18`, border: `1px solid ${col}38` }}>
            {flowLabel(c.flow)}
          </span>
          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ color: catCol, background: `${catCol}15`, border: `1px solid ${catCol}28` }}>
            {c.category}
          </span>
          {c.urgency !== "COLD" && (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
              style={{ color: urgencyColor, background: `${urgencyColor}15`, border: `1px solid ${urgencyColor}30` }}>
              {c.urgency === "HOT" ? "⚡ URGENT" : "SETTLING SOON"}
            </span>
          )}
          <button onClick={() => onWatch(m.id)} className="ml-auto text-lg leading-none transition-all hover:scale-125"
            style={{ color: watched ? "#fbbf24" : "rgba(255,255,255,0.18)", filter: watched ? "drop-shadow(0 0 4px #fbbf2488)" : "none" }}>
            {watched ? "★" : "☆"}
          </button>
        </div>

        {/* Split: big number + content */}
        <div className="flex gap-6 items-start mb-4">
          {/* THE NUMBER */}
          <div className="shrink-0 flex flex-col items-center pt-1" style={{ minWidth: 110 }}>
            <div
              className="font-black tabular-nums leading-none"
              style={{ fontSize: "4rem", color: col, textShadow: `0 0 48px ${col}55, 0 0 80px ${col}22` }}
            >
              {pts > 0 ? "+" : ""}{pts}¢
            </div>
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/25 mt-1.5">24h move</div>
            <div
              className="mt-2 text-[9px] font-black px-2 py-0.5 rounded-full"
              style={{ color: col, background: `${col}14`, border: `1px solid ${col}22` }}
            >
              {yes}¢ now
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-black text-white leading-snug mb-1.5">{c.call}</div>
            <div className="text-[11px] text-white/35 font-mono leading-relaxed mb-3">{m.question}</div>
            <PriceBar yes={yes} pts={pts} />
            <div className="text-[9px] text-white/30 font-mono mt-2 flex items-center gap-2 flex-wrap">
              <span>{kfmt(m.volume24h)} vol</span>
              <span className="text-white/15">·</span>
              <span>settles {whenStr(m.daysLeft)}</span>
              <span className="text-white/15">·</span>
              <span style={{ color: tagColor(m.edge) }}>{m.edge}</span>
            </div>
          </div>
        </div>

        {/* Why */}
        <div className="text-[11px] text-white/45 font-mono leading-relaxed mb-4 pl-3 border-l"
          style={{ borderColor: `${col}30` }}>
          {c.why}
        </div>

        {/* Actions */}
        {taken ? (
          <div className="text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
            style={{ background: "rgba(16,185,129,0.07)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)" }}>
            ✓ Logged {taken} — place it on Polymarket
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => take("YES")}
              className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)", color: "#10b981" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16,185,129,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(16,185,129,0.07)")}>
              YES · {cents(m.yesPrice)}
            </button>
            <button onClick={() => take("NO")}
              className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", color: "#ef4444" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.07)")}>
              NO · {cents(m.noPrice)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Compact card ─────────────────────────────────────────────────────────────
const CompactCard = ({ m, watched, onWatch, onTake }: {
  m: PolyMarket; watched: boolean;
  onWatch: (id: string) => void; onTake: (m: PolyMarket, side: "YES" | "NO") => void;
}) => {
  const c   = marketCopy(m);
  const col = flowColor(c.flow);
  const pts = Math.round((m.move24h ?? 0) * 100);
  const yes = Math.round(m.yesPrice * 100);
  const [taken, setTaken] = useState<"YES" | "NO" | null>(null);
  const take = (s: "YES" | "NO") => { onTake(m, s); setTaken(s); setTimeout(() => setTaken(null), 2000); };

  return (
    <div
      className="rounded-xl overflow-hidden glass-card-accent"
      style={{
        borderLeft: `3px solid ${col}55`,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3 mb-2.5">
          {/* Compact number */}
          <div className="shrink-0 text-center pt-0.5" style={{ minWidth: 54 }}>
            <div className="font-black tabular-nums leading-none" style={{ fontSize: "1.6rem", color: col }}>
              {pts > 0 ? "+" : ""}{pts}¢
            </div>
            <div className="text-[8px] text-white/22 uppercase tracking-wider mt-0.5">24h</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                style={{ color: col, background: `${col}14` }}>{flowLabel(c.flow)}</span>
              <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded"
                style={{ color: CATEGORY_COLOR[c.category], background: `${CATEGORY_COLOR[c.category]}12` }}>
                {c.category}
              </span>
              <button onClick={() => onWatch(m.id)} className="ml-auto text-sm leading-none"
                style={{ color: watched ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>
                {watched ? "★" : "☆"}
              </button>
            </div>
            <div className="text-[12px] font-black text-white/85 leading-snug">{c.call}</div>
            <div className="text-[9px] text-white/28 font-mono mt-0.5 truncate">{m.question}</div>
          </div>
        </div>
        <PriceBar yes={yes} pts={pts} />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-white/28 font-mono">
            YES {yes}¢ · {kfmt(m.volume24h)} · {whenStr(m.daysLeft)}
          </span>
          {taken ? (
            <span className="text-[9px] font-black text-emerald-400">✓ {taken}</span>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={() => take("YES")} className="text-[9px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(16,185,129,0.09)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>YES</button>
              <button onClick={() => take("NO")} className="text-[9px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(239,68,68,0.09)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>NO</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Arb row ──────────────────────────────────────────────────────────────────
const ArbRow = ({ e }: { e: ArbEdge }) => {
  const live = e.status === "LIVE_EDGE" || e.status === "EXECUTABLE_EDGE";
  const col = live ? "#10b981" : e.status === "INSUFFICIENT_DEPTH" || e.status === "STALE_DATA" ? "#f59e0b" : "#a855f7";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card text-[10px] font-mono">
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ color: col, background: `${col}14` }}>
        {e.status.replace("_", " ")}
      </span>
      <span className="text-white/55 truncate flex-1">{e.eventTitle}</span>
      <span className="text-white/30 shrink-0">{e.arbType === "BUY_ALL_YES" ? "ALL YES" : "ALL NO"} · {e.legCount}legs</span>
      <span className="shrink-0" style={{ color: col }}>
        {live && e.netReturnPct != null ? `net ${e.netReturnPct}%` : `theo ${e.theoreticalReturnPct ?? 0}%`}
      </span>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const PolymarketScreen = () => {
  const { markets, fetchedAt, loading, error } = usePolymarkets();
  const eng = useEdges(100);
  const [plays, setPlays]       = useState<Play[]>(getPlays);
  const [record, setRecord]     = useState<TrackEntry[]>(getRecord);
  const [watch, setWatch]       = useState<string[]>(getWatch);
  const [showArb, setShowArb]   = useState(false);
  const [showAll, setShowAll]   = useState(false);
  const [shownCount, setShownCount] = useState(9);
  const [sortKey, setSortKey]   = useState<"move" | "volume" | "score">("move");
  const riskPct   = getRiskPct();
  const stats     = playStats(plays);
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

  const take    = (m: PolyMarket, side: "YES" | "NO") => {
    const stake = Math.max(1, Math.round((stats.bankroll * riskPct) / 100 * 100) / 100);
    setPlays(logPlay(m, side, stake));
  };
  const onWatch = (id: string) => setWatch(toggleWatch(id));

  const movers = useMemo(
    () => [...markets].sort((a, b) => Math.abs(b.move24h ?? 0) - Math.abs(a.move24h ?? 0)).slice(0, shownCount),
    [markets, shownCount],
  );
  const activeMovers = markets.filter((m) => Math.abs((m.move24h ?? 0) * 100) >= 5).length;
  const watched = useMemo(() => markets.filter((m) => watch.includes(m.id)), [markets, watch]);

  const openPlays = plays.filter((p) => p.resolved == null).slice().reverse();
  const donePlays = plays.filter((p) => p.resolved).slice().reverse();
  const age       = fetchedAt ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000)) : null;
  const pnlColor  = stats.realizedPnl > 0 ? "#10b981" : stats.realizedPnl < 0 ? "#ef4444" : "rgba(255,255,255,0.6)";
  const liveArb   = eng.scanned?.live ?? 0;
  const heroFlow  = movers[0] ? flowColor(marketCopy(movers[0]).flow) : "#6b7280";

  const sortedMarkets = useMemo(() => {
    const sorted = [...markets];
    if (sortKey === "move") sorted.sort((a, b) => Math.abs(b.move24h ?? 0) - Math.abs(a.move24h ?? 0));
    else if (sortKey === "volume") sorted.sort((a, b) => b.volume24h - a.volume24h);
    else sorted.sort((a, b) => b.score - a.score);
    return sorted;
  }, [markets, sortKey]);

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
      className="fixed text-white flex flex-col"
      style={{
        top: 44, left: 52, right: 0, bottom: 0,
        fontFamily: "monospace",
        background: `radial-gradient(ellipse at 20% 0%, ${heroFlow}14 0%, #060411 48%), #060411`,
      }}
    >
      {/* ── STATS STRIP ───────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-5 px-5 border-b"
        style={{ height: 52, borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
      >
        {/* Bankroll — star */}
        <div className="flex items-baseline gap-2 mr-1">
          <span className="text-[26px] font-black tabular-nums" style={{ color: pnlColor, textShadow: `0 0 24px ${pnlColor}40` }}>
            {money(stats.bankroll)}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-white/22">bankroll</span>
        </div>

        <div className="w-px h-5 bg-white/[0.07]" />

        {/* Secondary stats */}
        <div className="flex items-center gap-4">
          {([
            ["P&L",   `${stats.realizedPnl >= 0 ? "+" : ""}${money(stats.realizedPnl)}`, pnlColor],
            ["PLAYS", `${stats.resolved}/${stats.taken}`, "rgba(255,255,255,0.55)"],
            ["WIN%",  stats.winRate != null ? `${stats.winRate}%` : "—", stats.winRate != null && stats.winRate >= 50 ? "#10b981" : "rgba(255,255,255,0.45)"],
            ["READS", `${readStats.resolved}/${readStats.tracked}`, "rgba(255,255,255,0.45)"],
            ["HIT%",  readStats.favHitRate != null ? `${readStats.favHitRate}%` : "—", "rgba(255,255,255,0.45)"],
          ] as [string, string, string][]).map(([l, v, c]) => (
            <div key={l} className="flex items-baseline gap-1">
              <span className="text-[8px] text-white/22 tracking-wider">{l}</span>
              <span className="text-[13px] font-black tabular-nums" style={{ color: c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Far right: status */}
        <div className="ml-auto flex items-center gap-3 text-[9px]">
          {age !== null && <span className="text-white/18">{age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago</span>}
          {loading && <span className="text-violet-400/50 animate-pulse">scanning</span>}
          {error && <span className="text-red-400/50">err</span>}
          <span className="text-white/18">{markets.length} mkts</span>
          {liveArb > 0 && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ color: "#10b981", background: "rgba(16,185,129,0.1)" }}>
              {liveArb} ARB
            </span>
          )}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main scroll area */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#a855f728 transparent" }}>

          {/* ── Scanner Process Log ──────────────────────────────── */}
          {(() => {
            const sc = eng.scanned;
            const rj = eng.rejectedSummary;
            const edgeAge = eng.fetchedAt ? Math.max(0, Math.floor((Date.now() - eng.fetchedAt) / 1000)) : null;
            const scanColor = eng.stale ? "#f59e0b" : eng.error ? "#ef4444" : sc ? "#a855f7" : "#6b7280";
            const scanLabel = eng.loading ? "SCANNING…" : eng.error ? "ERR" : eng.stale ? "STALE" : sc ? "OK" : "—";
            return (
              <div className="mb-5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] mb-1 glass-card"
                  style={{ border: `1px solid ${scanColor}1a`, background: `${scanColor}05` }}>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ color: scanColor, background: `${scanColor}18`, border: `1px solid ${scanColor}28` }}>
                    SCANNER
                  </span>
                  <span className="text-white/40">
                    {sc
                      ? `${sc.events} events · ${sc.candidates} cands · ${sc.live} live · ${sc.rejected} rejected`
                      : eng.loading ? "scanning…" : eng.error ? eng.error : "awaiting scan"}
                  </span>
                  <span className="text-[8px] font-black ml-1 px-1.5 py-0.5 rounded"
                    style={{ color: scanColor, background: `${scanColor}12` }}>{scanLabel}</span>
                  {edgeAge !== null && <span className="text-white/18 text-[8px] ml-auto mr-1">{edgeAge < 60 ? `${edgeAge}s` : `${Math.floor(edgeAge / 60)}m`} ago</span>}
                </div>
                <div className="px-4 py-3 glass-card" style={{ borderColor: `${scanColor}22` }}>
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 mb-3">
                    {([
                      ["Markets", markets.length, "#a855f7"],
                      ["Events", sc?.events ?? "—", "#a855f7"],
                      ["NegRisk", sc?.negRiskEvents ?? "—", "#a855f7"],
                      ["Candidates", sc?.candidates ?? "—", "#a855f7"],
                      ["Theoretical", sc?.theoretical ?? "—", "#6b7280"],
                      ["Executable", sc?.executable ?? "—", "#38bdf8"],
                      ["Live edges", sc?.live ?? "—", sc?.live ? "#10b981" : "#6b7280"],
                      ["Rejected", sc?.rejected ?? "—", (sc?.rejected ?? 0) > 0 ? "#f59e0b" : "#6b7280"],
                    ] as [string, number | string, string][]).map(([label, val, col]) => (
                      <div key={label}>
                        <div className="text-[8px] text-white/22 uppercase tracking-wider mb-0.5">{label}</div>
                        <div className="text-[15px] font-black tabular-nums" style={{ color: col }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {rj && (sc?.rejected ?? 0) > 0 && (
                    <div className="pt-2 border-t border-white/[0.05] mb-2">
                      <div className="text-[8px] text-white/22 uppercase tracking-wider mb-1.5">Rejection breakdown</div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ["Insuff. depth", rj.insufficientDepth, "#f59e0b"],
                          ["Stale book",    rj.staleBook,         "#ef4444"],
                          ["Augmented",     rj.augmented,         "#6b7280"],
                          ["Theoretical",   rj.theoreticalOnly,   "#6b7280"],
                        ] as [string, number, string][]).filter(([,n]) => n > 0).map(([label, n, col]) => (
                          <span key={label} className="text-[8px] font-black px-2 py-0.5 rounded"
                            style={{ color: col, background: `${col}10`, border: `1px solid ${col}22` }}>
                            {label} · {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[8px] text-white/22">
                    <span>Mode: <span className="text-white/45 font-black uppercase">{eng.dataMode ?? "—"}</span></span>
                    {eng.stale && eng.lastGoodAt && (
                      <span>Last good: <span className="text-amber-400/60">{Math.floor((Date.now() - eng.lastGoodAt) / 1000 / 60)}m ago</span></span>
                    )}
                    {eng.error && <span className="text-red-400/60">{eng.error}</span>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Today's Biggest Moves ─────────────────────────────── */}
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Biggest Moves</div>
            {activeMovers > 0 && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                {activeMovers} moved {">"} 5¢
              </span>
            )}
            <div className="ml-auto text-[8px] text-white/20">{movers.length} tracked</div>
          </div>

          {movers.length === 0 ? (
            <div className="text-[11px] text-white/22 py-12 text-center rounded-2xl glass-card">
              {loading ? "Reading the board…" : "No market data right now."}
            </div>
          ) : (
            <div className="space-y-3">
              <HeroCard m={movers[0]} watched={watch.includes(movers[0].id)} onWatch={onWatch} onTake={take} />
              {movers.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-1">
                  {movers.slice(1).map((m) => (
                    <CompactCard key={m.id} m={m} watched={watch.includes(m.id)} onWatch={onWatch} onTake={take} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mechanical arb strip ─────────────────────────────── */}
          <button
            onClick={() => setShowArb((s) => !s)}
            className="w-full mt-5 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] transition-all glass-card"
          >
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
              style={{ color: liveArb > 0 ? "#10b981" : "#6b7280", background: liveArb > 0 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)" }}>
              ARB SCAN
            </span>
            <span className="text-white/45">{liveArb > 0 ? `${liveArb} live mechanical edge(s)` : "0 live mechanical arbs"}</span>
            <span className="text-white/22">· {eng.scanned?.negRiskEvents ?? 0} negRisk · {eng.dataMode === "clob_verified" ? "CLOB-verified" : "scanning"}</span>
            <span className="ml-auto text-white/30">{showArb ? "▾" : "▸"}</span>
          </button>
          {showArb && (
            <div className="space-y-1 mt-2">
              {eng.edges.length === 0
                ? <div className="text-[10px] text-white/22 px-1">No candidates — board priced efficiently after fees & depth.</div>
                : eng.edges.slice(0, 8).map((e) => <ArbRow key={e.eventId} e={e} />)}
            </div>
          )}

          {/* ── Watchlist ────────────────────────────────────────── */}
          {watched.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mt-7 mb-2">★ Watching</div>
              <div className="space-y-1">
                {watched.map((m) => {
                  const pts = Math.round((m.move24h ?? 0) * 100);
                  const col = flowColor(marketCopy(m).flow);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] glass-card">
                      <button onClick={() => onWatch(m.id)} className="text-amber-400 text-sm leading-none">★</button>
                      <span className="text-white/55 truncate flex-1">{m.question}</span>
                      <span className="tabular-nums font-black" style={{ color: col }}>{pts > 0 ? "+" : ""}{pts}¢</span>
                      <span className="text-white/45">{cents(m.yesPrice)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Plays ────────────────────────────────────────────── */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mt-7 mb-2">Plays · Receipts</div>
          {plays.length === 0 ? (
            <div className="text-[11px] text-white/22 py-6 text-center rounded-2xl glass-card">
              No plays yet — take one above.
            </div>
          ) : (
            <div className="space-y-1">
              {openPlays.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] glass-card">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>OPEN</span>
                  <span className="text-white/55 truncate flex-1">{p.question}</span>
                  <span className="text-white/35">{p.side} @ {cents(p.entryPrice)}</span>
                  <span className="text-white/65 font-black">{money(p.stake)}</span>
                </div>
              ))}
              {donePlays.map((p) => {
                const won = p.resolved === "WON"; const c = won ? "#10b981" : "#ef4444";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] glass-card"
                    style={{ border: `1px solid ${c}20`, background: `${c}08` }}>
                    <span className="font-black" style={{ color: c }}>{won ? "✓" : "✗"}</span>
                    <span className="text-white/50 truncate flex-1">{p.question}</span>
                    <span className="text-white/35">{p.side} @ {cents(p.entryPrice)}</span>
                    <span className="font-black" style={{ color: c }}>{p.pnl >= 0 ? "+" : ""}{money(p.pnl)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Browse all ───────────────────────────────────────── */}
          <button onClick={() => setShowAll((s) => !s)}
            className="text-[9px] text-white/28 hover:text-white/55 uppercase tracking-wider mt-7 mb-2">
            {showAll ? "▾ Hide" : "▸ Browse"} all {markets.length} markets
          </button>
          {showAll && (
            <div className="space-y-1">
              {[...markets].sort((a, b) => b.score - a.score).map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] glass-card">
                  <button onClick={() => onWatch(m.id)} className="text-sm leading-none shrink-0"
                    style={{ color: watch.includes(m.id) ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>
                    {watch.includes(m.id) ? "★" : "☆"}
                  </button>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: tagColor(m.edge), background: `${tagColor(m.edge)}12` }}>{m.edge}</span>
                  <span className="text-white/50 truncate flex-1">{m.question}</span>
                  <span className="text-white/28 shrink-0">YES {cents(m.yesPrice)}</span>
                  <button onClick={() => take(m, "YES")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: "rgba(16,185,129,0.09)", color: "#10b981" }}>YES</button>
                  <button onClick={() => take(m, "NO")} className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: "rgba(239,68,68,0.09)", color: "#ef4444" }}>NO</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-[8px] text-white/10 text-center leading-relaxed pb-4">
            Read-only intelligence. Every read scored against real resolution.<br />
            You place every bet yourself on Polymarket.
          </div>
        </div>

        {/* ── Right rail ───────────────────────────────────────────── */}
        <div
          className="w-[288px] shrink-0 flex flex-col overflow-hidden"
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(6,4,17,0.65)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Macro Context */}
          <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="text-[8px] text-violet-400/55 uppercase tracking-wider font-black">Macro Context</div>
            <div className="text-[8px] text-white/18 mt-0.5">live indicators · 60s refresh</div>
          </div>
          <div className="px-3 py-3 shrink-0 overflow-y-auto" style={{ maxHeight: "290px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <MacroContextPanel />
          </div>

          {/* Agent */}
          <div className="px-3.5 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="text-[8px] text-violet-400/55 uppercase tracking-wider font-black">NEXUS-P AGENT</div>
            <div className="text-[8px] text-white/18 mt-0.5">reads top movers · ask before you stake</div>
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
