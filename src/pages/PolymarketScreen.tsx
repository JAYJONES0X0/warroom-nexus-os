import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { ScreenAgent } from "@/components/ScreenAgent";

// ─── Kelly Criterion sizing ───────────────────────────────────────────────────
function kelly(p: number, b = 1): number {
  const q = 1 - p;
  const k = (b * p - q) / b;
  return Math.max(0, Math.min(k * 0.5, 0.12)); // half-Kelly, cap 12%
}

// ─── Market row ───────────────────────────────────────────────────────────────
const MarketRow = ({
  market, selected, onClick,
}: { market: PolyMarket; selected: boolean; onClick: () => void }) => {
  const edgeColor = market.edge === "YES EDGE" ? "#10b981" : market.edge === "NO EDGE" ? "#ef4444" : "#f59e0b";
  const bar = Math.min(100, (market.volume24h / 500_000) * 100);

  return (
    <div
      onClick={onClick}
      className="px-3 py-2.5 cursor-pointer border-b transition-all"
      style={{
        borderColor: "rgba(255,255,255,0.04)",
        background: selected ? "rgba(147,51,234,0.08)" : "transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-[10px] font-mono leading-tight text-white/70 line-clamp-2 flex-1"
          style={{ color: selected ? "rgba(255,255,255,0.85)" : undefined }}>
          {market.question}
        </div>
        <div className="shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
          style={{ color: edgeColor, background: `${edgeColor}18`, border: `1px solid ${edgeColor}30` }}>
          {market.edge.split(" ")[0]}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 font-mono">YES</span>
          <span className="text-[10px] font-black text-emerald-400">{(market.yesPrice * 100).toFixed(0)}¢</span>
          <span className="text-white/15 text-[8px]">·</span>
          <span className="text-[9px] text-white/30 font-mono">NO</span>
          <span className="text-[10px] font-black text-red-400">{(market.noPrice * 100).toFixed(0)}¢</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-violet-500/40" style={{ width: `${bar}%` }} />
          </div>
          <span className="text-[8px] text-white/25 font-mono">
            ${market.volume24h >= 1_000_000
              ? `${(market.volume24h / 1_000_000).toFixed(1)}M`
              : `${(market.volume24h / 1000).toFixed(0)}K`}
          </span>
        </div>
      </div>
      {market.daysLeft !== null && (
        <div className="text-[8px] text-white/20 font-mono mt-0.5">{market.daysLeft}d left</div>
      )}
    </div>
  );
};

// ─── Market detail / signal panel ────────────────────────────────────────────
const MarketDetail = ({ market }: { market: PolyMarket }) => {
  const edgeColor = market.edge === "YES EDGE" ? "#10b981" : market.edge === "NO EDGE" ? "#ef4444" : "#f59e0b";
  const yesKelly = kelly(market.yesPrice) * 100;
  const noKelly  = kelly(market.noPrice)  * 100;
  const isYes    = market.edge === "YES EDGE";
  const signalColor = isYes ? "#10b981" : "#ef4444";
  const signalBias  = isYes ? "YES" : market.edge === "NO EDGE" ? "NO" : "NEUTRAL";
  const composite   = Math.round(market.score);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Question */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <div className="text-[9px] text-violet-400/60 uppercase tracking-[0.2em] font-mono mb-2">ACTIVE MARKET</div>
        <div className="text-sm font-bold text-white/85 leading-snug mb-4">{market.question}</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["YES Price", `${(market.yesPrice * 100).toFixed(1)}¢`, "#10b981"],
            ["NO Price",  `${(market.noPrice  * 100).toFixed(1)}¢`, "#ef4444"],
            ["24h Volume", market.volume24h >= 1_000_000
              ? `$${(market.volume24h / 1_000_000).toFixed(2)}M`
              : `$${(market.volume24h / 1000).toFixed(0)}K`, "rgba(255,255,255,0.6)"],
            ["Liquidity", market.liquidity >= 1_000_000
              ? `$${(market.liquidity / 1_000_000).toFixed(2)}M`
              : `$${(market.liquidity / 1000).toFixed(0)}K`, "rgba(255,255,255,0.6)"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.05]">
              <div className="text-[9px] text-white/25 font-mono uppercase mb-1">{l}</div>
              <div className="text-sm font-black" style={{ color: c as string }}>{v}</div>
            </div>
          ))}
        </div>
        {market.daysLeft !== null && (
          <div className="mt-3 text-[10px] text-white/30 font-mono">
            ⏱ {market.daysLeft} days until resolution
          </div>
        )}
      </div>

      {/* EXA-POLY signal */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[9px] text-violet-400/60 uppercase tracking-[0.2em] font-mono">EXA-POLY SIGNAL</div>
          <div className="text-xs font-black uppercase px-3 py-1 rounded-lg border"
            style={{ color: signalColor, background: `${signalColor}15`, borderColor: `${signalColor}35` }}>
            {signalBias} BIAS
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-6 mb-5">
          <div className="text-center">
            <div className="text-5xl font-black tabular-nums"
              style={{ color: edgeColor, textShadow: `0 0 25px ${edgeColor}50` }}>
              {composite}
            </div>
            <div className="text-[9px] text-white/25 font-mono mt-0.5">edge score / 100</div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              ["Volume rank",  Math.min(100, (market.volume24h / 1_000_000) * 60 + 20)],
              ["Liquidity",    Math.min(100, (market.liquidity  / 500_000)  * 50 + 15)],
              ["Edge clarity", Math.abs(market.yesPrice - 0.5) * 200],
              ["Time risk",    market.daysLeft ? Math.min(100, (30 / market.daysLeft) * 60 + 20) : 50],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="flex justify-between text-[8px] font-mono mb-0.5">
                  <span className="text-white/30 uppercase">{label}</span>
                  <span className="text-white/40">{Math.round(val as number)}</span>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(val as number)}%`, background: edgeColor, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kelly sizing */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="text-center">
            <div className="text-[9px] text-white/25 font-mono uppercase mb-1">YES Kelly</div>
            <div className="text-lg font-black text-emerald-400">{yesKelly.toFixed(1)}%</div>
            <div className="text-[8px] text-white/20 font-mono">of bankroll</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/25 font-mono uppercase mb-1">NO Kelly</div>
            <div className="text-lg font-black text-red-400">{noKelly.toFixed(1)}%</div>
            <div className="text-[8px] text-white/20 font-mono">of bankroll</div>
          </div>
        </div>
        <div className="mt-3 text-[9px] text-white/20 font-mono text-center">
          Half-Kelly sizing — verify thesis before entering position
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
        <div className="text-[9px] text-white/15 font-mono leading-relaxed text-center">
          EXA-POLY is an intelligence layer only. All signals are for informational purposes.<br />
          Execute positions through your own Polymarket account. You are responsible for all decisions.
        </div>
      </div>
    </div>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const PolymarketScreen = () => {
  const navigate   = useNavigate();
  const { markets, fetchedAt, loading, error } = usePolymarkets();
  const [selected, setSelected]  = useState<PolyMarket | null>(null);
  const [sortBy,   setSortBy]    = useState<"score" | "volume" | "liquidity">("score");
  const [filter,   setFilter]    = useState<"all" | "yes" | "no" | "neutral">("all");

  const sorted = useMemo(() => {
    let m = [...markets];
    if (filter === "yes")     m = m.filter(x => x.edge === "YES EDGE");
    if (filter === "no")      m = m.filter(x => x.edge === "NO EDGE");
    if (filter === "neutral") m = m.filter(x => x.edge === "NEUTRAL");
    m.sort((a, b) => sortBy === "score" ? b.score - a.score : sortBy === "volume" ? b.volume24h - a.volume24h : b.liquidity - a.liquidity);
    return m;
  }, [markets, sortBy, filter]);

  const activeMarket = selected ?? sorted[0] ?? null;

  const agentSystem = `You are NEXUS-P, the EXA Polymarket Intelligence agent. You analyze prediction markets with institutional discipline.

Your focus: identify markets where the crowd price deviates from your assessed true probability — that gap is edge.

Framework:
- YES edge = market underpricing YES (price < true probability)
- NO edge = market underpricing NO (price > true probability)
- Volume + liquidity = signal quality indicators
- Days left = time decay risk
- Kelly sizing: bet proportional to edge, never more than 12% bankroll

Available markets: ${markets.length} active markets tracked.
Top market: ${activeMarket ? `"${activeMarket.question}" — YES ${(activeMarket.yesPrice * 100).toFixed(0)}¢ / NO ${(activeMarket.noPrice * 100).toFixed(0)}¢, score ${Math.round(activeMarket.score)}/100` : "loading"}

Be concise. State your thesis. Give the edge. Size the bet. No fluff.`;

  const autoPrompt = activeMarket
    ? `Analyze this prediction market: "${activeMarket.question}". YES at ${(activeMarket.yesPrice * 100).toFixed(0)}¢, NO at ${(activeMarket.noPrice * 100).toFixed(0)}¢. Volume 24h: $${(activeMarket.volume24h / 1000).toFixed(0)}K. Edge score: ${Math.round(activeMarket.score)}/100. Is there a tradeable edge? What's your thesis?`
    : "What are the best prediction market opportunities right now based on volume and edge?";

  const age = fetchedAt ? Math.floor((Date.now() - fetchedAt) / 1000) : null;

  return (
    <div className="fixed inset-0 bg-[#060411] text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] shrink-0 bg-[#06041188]">
        <button onClick={() => navigate("/")}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-mono">
          ← NEXUS
        </button>
        <div className="w-px h-4 bg-white/10" />
        <div className="text-[11px] font-black text-violet-400 uppercase tracking-widest">POLYMARKET NEXUS</div>
        <div className="text-[9px] text-white/20 font-mono">Prediction Intelligence · EXA-POLY Engine</div>
        <div className="ml-auto flex items-center gap-3">
          {age !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 5px #a855f7" }} />
              <span className="text-[9px] text-white/30 font-mono">{age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago</span>
            </div>
          )}
          {loading && <span className="text-[9px] text-violet-400/60 font-mono animate-pulse">LOADING...</span>}
          {error && <span className="text-[9px] text-red-400/70 font-mono">API ERR</span>}
          <div className="text-[9px] text-white/20 font-mono">{markets.length} MARKETS</div>
        </div>
      </div>

      {/* ── Body: left list | center detail | right agent ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: market list */}
        <div className="w-[300px] flex flex-col border-r border-white/[0.06] shrink-0">
          {/* Sort/filter controls */}
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="flex gap-1 mb-2">
              {(["score", "volume", "liquidity"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className="flex-1 text-[8px] font-black uppercase py-0.5 rounded transition-all"
                  style={sortBy === s
                    ? { background: "rgba(147,51,234,0.2)", color: "#a855f7", border: "1px solid rgba(147,51,234,0.3)" }
                    : { background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["all", "yes", "no", "neutral"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="flex-1 text-[8px] font-black uppercase py-0.5 rounded transition-all"
                  style={filter === f
                    ? { background: "rgba(147,51,234,0.15)", color: "#c084fc", border: "1px solid rgba(147,51,234,0.25)" }
                    : { background: "transparent", color: "rgba(255,255,255,0.2)", border: "1px solid transparent" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {loading && markets.length === 0 && (
              <div className="text-center text-white/20 font-mono text-[10px] py-12">
                Fetching markets...
              </div>
            )}
            {sorted.map(m => (
              <MarketRow
                key={m.id}
                market={m}
                selected={activeMarket?.id === m.id}
                onClick={() => setSelected(m)}
              />
            ))}
          </div>
        </div>

        {/* Center: market detail */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col">
          {activeMarket ? (
            <MarketDetail market={activeMarket} />
          ) : (
            <div className="flex items-center justify-center h-full text-white/15 font-mono text-sm">
              Select a market
            </div>
          )}
        </div>

        {/* Right: NEXUS-P agent */}
        <div className="w-[280px] border-l border-white/[0.06] shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono">NEXUS-P AGENT</div>
            <div className="text-[8px] text-white/20 font-mono">Prediction market intelligence</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScreenAgent
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
