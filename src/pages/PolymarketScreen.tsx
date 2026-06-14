import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroContextPanel } from "@/components/MacroContextPanel";
import { marketCopy } from "@/lib/marketCopy";
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
const cents = (p: number) => `${Math.round(p * 100)}¢`;

// Stake = bankroll × your risk % (set in Settings, default 4%).
function getRiskPct(): number {
  try {
    const s = localStorage.getItem("warroom.prefs");
    if (s) { const r = parseFloat(JSON.parse(s).risk); if (r > 0 && r <= 20) return r; }
  } catch { /* ignore */ }
  return 4;
}

// "This week's plays" — markets that fit the game: real toss-ups + true arbs,
// enough liquidity to fill, resolving soon. Ranked by tradeability score.
function pickPlays(markets: PolyMarket[]): PolyMarket[] {
  return markets
    .filter((m) => (m.edge === "CONTESTED" || m.edge === "ARB") && m.liquidity >= 100_000 && (m.daysLeft == null || m.daysLeft <= 14))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// ─── play action card ────────────────────────────────────────────────────────
const PlayCard = ({ m, stake, onTake }: { m: PolyMarket; stake: number; onTake: (m: PolyMarket, side: "YES" | "NO") => void }) => {
  const c = marketCopy(m);
  const col = tagColor(m.edge);
  const [taken, setTaken] = useState<"YES" | "NO" | null>(null);
  const take = (side: "YES" | "NO") => { onTake(m, side); setTaken(side); setTimeout(() => setTaken(null), 2200); };

  return (
    <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[15px] font-black text-white leading-snug">{c.call}</div>
        <span className="shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded" style={{ color: col, background: `${col}1a`, border: `1px solid ${col}33` }}>{m.edge}</span>
      </div>
      <div className="text-[11px] text-white/45 font-mono leading-relaxed mb-1">{m.question}</div>
      <div className="text-[11px] text-white/55 font-mono leading-relaxed mb-3">{c.why}</div>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mb-3">
        <div>
          <div className="text-[9px] text-white/30 uppercase font-mono">Suggested stake</div>
          <div className="text-xl font-black text-white">{money(stake)}</div>
        </div>
        <div className="text-right max-w-[60%]">
          <div className="text-[9px] text-white/30 uppercase font-mono mb-0.5">Discipline</div>
          <div className="text-[10px] text-white/40 font-mono leading-tight">{c.discipline}</div>
        </div>
      </div>

      {taken ? (
        <div className="text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-wider" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
          ✓ Logged {taken} · {money(stake)} — place it on Polymarket
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => take("YES")} className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:-translate-y-0.5" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>
            Take YES · {cents(m.yesPrice)}
          </button>
          <button onClick={() => take("NO")} className="py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all hover:-translate-y-0.5" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
            Take NO · {cents(m.noPrice)}
          </button>
        </div>
      )}
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

  // Log every classified market, and resolve both reads and plays as they settle.
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

  const stats = playStats(plays);
  const stake = Math.max(1, Math.round((stats.bankroll * riskPct) / 100 * 100) / 100);
  const weekPlays = useMemo(() => pickPlays(markets), [markets]);
  const take = (m: PolyMarket, side: "YES" | "NO") => setPlays(logPlay(m, side, stake));

  const openPlays = plays.filter((p) => p.resolved == null).slice().reverse();
  const donePlays = plays.filter((p) => p.resolved).slice().reverse();
  const age = fetchedAt ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000)) : null;
  const pnlColor = stats.realizedPnl > 0 ? "#10b981" : stats.realizedPnl < 0 ? "#ef4444" : "rgba(255,255,255,0.6)";

  const agentSystem = `You are NEXUS-P, the EXA Polymarket Intelligence agent — a disciplined, honest prediction-market analyst.
CORE TRUTH: the market price IS the consensus probability. Never call a side "undervalued" without a SPECIFIC, evidenced reason the market is wrong (breaking news, base rate, whale flow). Otherwise the honest answer is "priced fairly — no edge."
The operator runs a £100 bankroll with disciplined small stakes (${riskPct}% per play), process over outcome.
Live markets tracked: ${markets.length}.
Be sharp and plain. Help pick where a disciplined stake has the best shot. No fabricated edges.`;
  const autoPrompt = weekPlays[0]
    ? `My top play right now is "${weekPlays[0].question}" (${weekPlays[0].edge}, implied YES ${Math.round(weekPlays[0].yesPrice * 100)}%). In plain English: is there a concrete reason to lean a side, or is it a pure coin-flip I size small and hold?`
    : "Scan the board. Where does a disciplined small stake have the best shot this week, and where is there genuinely no edge?";

  return (
    <div className="fixed inset-0 bg-[#060411] text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] shrink-0 bg-[#06041188]">
        <button onClick={() => navigate("/")} className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-mono">← NEXUS</button>
        <div className="w-px h-4 bg-white/10" />
        <div className="text-[11px] font-black text-violet-400 uppercase tracking-widest">POLYMARKET NEXUS</div>
        <div className="text-[9px] text-white/20 font-mono">Your £100 play desk</div>
        <div className="ml-auto flex items-center gap-3">
          {age !== null && <span className="text-[9px] text-white/30 font-mono">{age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`}</span>}
          {loading && <span className="text-[9px] text-violet-400/60 font-mono animate-pulse">LOADING…</span>}
          {error && <span className="text-[9px] text-red-400/70 font-mono">API ERR</span>}
          <span className="text-[9px] text-white/20 font-mono">{markets.length} MARKETS</span>
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
          ["Open", money(stats.openExposure), "rgba(255,255,255,0.7)"],
          ["Plays", `${stats.resolved}/${stats.taken}`, "rgba(255,255,255,0.7)"],
          ["Win rate", stats.winRate != null ? `${stats.winRate}%` : "—", stats.winRate != null && stats.winRate >= 50 ? "#10b981" : "rgba(255,255,255,0.7)"],
        ] as const).map(([l, v, c]) => (
          <div key={l}>
            <div className="text-[9px] text-white/30 uppercase tracking-wider font-mono">{l}</div>
            <div className="text-lg font-black tabular-nums" style={{ color: c }}>{v}</div>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-white/35 font-mono max-w-[360px] leading-tight">
          Outcome isn't yours to set — your action is. <span className="text-white/50">Max {riskPct}% a play · never chase · hold the process.</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main column */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
          {/* This week's plays */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono">This Week's Plays</div>
            <div className="text-[9px] text-white/25 font-mono">toss-ups & arbs · deep · resolving soon · {money(stake)} each</div>
          </div>
          {weekPlays.length === 0 ? (
            <div className="text-[11px] text-white/25 font-mono py-8 text-center border border-white/[0.05] rounded-2xl">
              {loading ? "Scanning the board…" : "No clean plays on the board right now — patience is a position. Check back next refresh."}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {weekPlays.map((m) => <PlayCard key={m.id} m={m} stake={stake} onTake={take} />)}
            </div>
          )}

          {/* Your plays */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400/70 font-mono mt-8 mb-3">Your Plays</div>
          {plays.length === 0 ? (
            <div className="text-[11px] text-white/25 font-mono py-6 text-center border border-white/[0.05] rounded-2xl">
              No plays yet — take one above to start your £100 run. Log it here, place the real bet on Polymarket.
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

          {/* All markets (browse) */}
          <button onClick={() => setShowAll((s) => !s)} className="text-[10px] text-white/35 hover:text-white/60 font-mono uppercase tracking-wider mt-8 mb-2">
            {showAll ? "▾ Hide" : "▸ Browse"} all {markets.length} markets
          </button>
          {showAll && (
            <div className="space-y-1">
              {[...markets].sort((a, b) => b.score - a.score).map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.015] text-[10px] font-mono">
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
            Intelligence layer only. The market price is the consensus probability — we make the play clear, we don't beat the market.<br />
            Place real bets on your own Polymarket account. You own every decision.
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
            <div className="text-[8px] text-white/20 font-mono">ask before you stake</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScreenAgent
              key={markets.length > 0 ? "ready" : "wait"}
              agentId="NEXUS-P"
              agentRole="Prediction Analyst"
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
