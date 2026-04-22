import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePolymarkets, PolyMarket } from "@/hooks/usePolymarkets";
import { useWorldMonitorMarkets } from "@/hooks/useWorldMonitorMarkets";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroContextPanel } from "@/components/MacroContextPanel";

// ─── Prediction-market Kelly Criterion ───────────────────────────────────────
// We don't know true prob, so we estimate it as halfway between market price
// and 50% — conservative assumption that the crowd is partially right.
function pmKelly(marketPrice: number, side: "yes" | "no"): number {
  const p = side === "yes" ? marketPrice : 1 - marketPrice;
  if (p >= 0.88) return 0; // near-certain, no edge
  const trueProbEst = (p + 0.5) / 2; // conservative edge estimate
  const b = (1 - p) / p; // prediction market decimal odds
  const k = (b * trueProbEst - (1 - trueProbEst)) / b;
  return Math.max(0, Math.min(k * 0.5, 0.10)) * 100; // half-Kelly, cap 10%
}

// ─── Edge helpers ─────────────────────────────────────────────────────────────
function edgeColor(edge: string): string {
  if (edge === "YES EDGE") return "#10b981";
  if (edge === "NO EDGE")  return "#ef4444";
  return "#f59e0b";
}

function edgeShort(edge: string): string {
  if (edge === "YES EDGE") return "YES";
  if (edge === "NO EDGE")  return "NO";
  return "NEU";
}

// ─── Market row ───────────────────────────────────────────────────────────────
const MarketRow = ({
  market, selected, onClick,
}: { market: PolyMarket; selected: boolean; onClick: () => void }) => {
  const ec  = edgeColor(market.edge);
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
        <div className="shrink-0 flex items-center gap-1.5">
          <div className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ color: ec, background: `${ec}18`, border: `1px solid ${ec}30` }}>
            {edgeShort(market.edge)}
          </div>
          <div className="text-[8px] text-white/20 font-mono">
            Score: {Math.round(market.score)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 font-mono">YES</span>
          <span className="text-[10px] font-black text-emerald-400 font-mono">{(market.yesPrice * 100).toFixed(1)}¢</span>
          <span className="text-white/15 text-[8px]">·</span>
          <span className="text-[9px] text-white/30 font-mono">NO</span>
          <span className="text-[10px] font-black text-red-400 font-mono">{(market.noPrice * 100).toFixed(1)}¢</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-white/25 font-mono">Vol:</span>
            <span className="text-[9px] text-white/60 font-mono">
              ${market.volume24h >= 1_000_000
                ? `${(market.volume24h / 1_000_000).toFixed(2)}M`
                : `${(market.volume24h / 1000).toFixed(0)}K`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-white/25 font-mono">Liq:</span>
            <span className="text-[9px] text-white/60 font-mono">
              ${market.liquidity >= 1_000_000
                ? `${(market.liquidity / 1_000_000).toFixed(2)}M`
                : `${(market.liquidity / 1000).toFixed(0)}K`}
            </span>
          </div>
        </div>
      </div>
      {market.daysLeft !== null && (
        <div className="text-[8px] text-white/20 font-mono mt-0.5">{market.daysLeft}d left</div>
      )}
    </div>
  );
};

// ─── Macro context helper ───────────────────────────────────────────────────
function getRelevantMacroIndicators(question: string, marketQuotes: any[], cryptoQuotes: any[]) {
  const lowerQ = question.toLowerCase();
  const indicators: { label: string; value: string; change: string; color: string }[] = [];
  
  const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  const getColor = (n: number) => n >= 0 ? 'text-green-400' : 'text-red-400';
  
  // Crypto markets
  if (lowerQ.includes('bitcoin') || lowerQ.includes('btc') || lowerQ.includes('crypto')) {
    const btc = cryptoQuotes.find(c => c.id === 'bitcoin');
    if (btc) {
      indicators.push({
        label: 'Bitcoin',
        value: `$${(btc.price / 1000).toFixed(1)}K`,
        change: formatPct(btc.changePercent24h),
        color: getColor(btc.changePercent24h)
      });
    }
  }
  
  // Equity markets
  if (lowerQ.includes('s&p') || lowerQ.includes('stock') || lowerQ.includes('market')) {
    const spx = marketQuotes.find(m => m.symbol === 'SPX');
    if (spx) {
      indicators.push({
        label: 'S&P 500',
        value: spx.price.toFixed(0),
        change: formatPct(spx.changePercent),
        color: getColor(spx.changePercent)
      });
    }
  }
  
  // Gold/commodities
  if (lowerQ.includes('gold') || lowerQ.includes('commodity')) {
    const gold = marketQuotes.find(m => m.symbol === 'GC');
    if (gold) {
      indicators.push({
        label: 'Gold',
        value: `$${gold.price.toFixed(0)}`,
        change: formatPct(gold.changePercent),
        color: getColor(gold.changePercent)
      });
    }
  }
  
  // Oil/energy
  if (lowerQ.includes('oil') || lowerQ.includes('crude') || lowerQ.includes('energy')) {
    const oil = marketQuotes.find(m => m.symbol === 'CL');
    if (oil) {
      indicators.push({
        label: 'WTI Oil',
        value: `$${oil.price.toFixed(2)}`,
        change: formatPct(oil.changePercent),
        color: getColor(oil.changePercent)
      });
    }
  }
  
  return indicators;
}

// ─── Market detail / signal panel ────────────────────────────────────────────
const MarketDetail = ({ market }: { market: PolyMarket }) => {
  const ec        = edgeColor(market.edge);
  const isYes     = market.edge === "YES EDGE";
  const isNo      = market.edge === "NO EDGE";
  const betSide   = isYes ? "YES" : isNo ? "NO" : "—";
  const betKelly  = isYes ? pmKelly(market.yesPrice, "yes") : isNo ? pmKelly(market.yesPrice, "no") : 0;
  const composite = Math.round(market.score);
  const { marketQuotes, cryptoQuotes } = useWorldMonitorMarkets();
  const macroIndicators = useMemo(() => 
    getRelevantMacroIndicators(market.question, marketQuotes, cryptoQuotes),
    [market.question, marketQuotes, cryptoQuotes]
  );

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
            style={{ color: ec, background: `${ec}15`, borderColor: `${ec}35` }}>
            {market.edge}
          </div>
        </div>

        {/* Score + Breakdown */}
        <div className="flex flex-col items-center gap-4 mb-5">
          <div className="text-center">
            <div className="text-6xl font-black tabular-nums leading-none"
              style={{ color: ec, textShadow: `0 0 30px ${ec}60` }}>
              {composite}
            </div>
            <div className="text-[10px] text-white/30 font-mono mt-1">COMPOSITE EDGE SCORE / 100</div>
          </div>
          <div className="w-full space-y-2">
            <div className="text-[9px] text-white/40 uppercase font-mono mb-1">Signal Breakdown</div>
            {[
              ["Volume Influence",    Math.min(100, (market.volume24h / 1_000_000) * 60 + 20)],
              ["Liquidity Strength",  Math.min(100, (market.liquidity  / 500_000)  * 50 + 15)],
              ["Price Discrepancy", Math.abs(market.yesPrice - 0.5) < 0.38 ? Math.abs(market.yesPrice - 0.5) * 200 : 10],
              ["Time Horizon Risk", market.daysLeft ? Math.min(100, (30 / market.daysLeft) * 60 + 20) : 50],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="flex justify-between text-[8px] font-mono mb-0.5">
                  <span className="text-white/30 uppercase">{label}</span>
                  <span className="text-white/40">{Math.round(val as number)}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(val as number)}%`, background: ec, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kelly sizing — only show relevant side */}
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl mt-4">
          {market.edge === "NEUTRAL" ? (
            <div className="text-center text-[10px] text-white/25 font-mono leading-relaxed">
              No clear edge detected. Consider standing aside or awaiting further price action.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-[9px] text-white/30 font-mono uppercase mb-1">
                  OPTIMAL BET SIDE & KELLY SIZE
                </div>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-3xl font-black" style={{ color: ec }}>
                    {betKelly.toFixed(1)}%
                  </span>
                  <span className="text-xl font-bold" style={{ color: ec }}>
                    {betSide}
                  </span>
                </div>
                <div className="text-[8px] text-white/20 font-mono">of bankroll (conservative half-Kelly)</div>
              </div>
              <div className="text-[9px] text-white/30 font-mono leading-relaxed text-center border-t border-white/[0.06] pt-3 w-full">
                {isYes
                  ? `Thesis: YES at ${(market.yesPrice * 100).toFixed(0)}¢ appears undervalued. The crowd is likely over-weighting the NO outcome. Significant edge on the upside.`
                  : `Thesis: NO at ${(market.noPrice * 100).toFixed(0)}¢ appears undervalued. The crowd is likely over-weighting the YES outcome. Strong edge fading the perceived favorite.`}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 text-[9px] text-white/15 font-mono text-center">
          All probabilities are conservatively estimated. Independent thesis verification is crucial.
        </div>
      </div>

      {/* Macro Context — worldmonitor integration */}
      {macroIndicators.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-[0.2em] font-mono">Macro Context</div>
            <div className="flex-1 h-px bg-white/[0.06]" />
            <div className="text-[8px] text-white/20 font-mono">worldmonitor</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {macroIndicators.map((ind) => (
              <div key={ind.label} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.05]">
                <div className="text-[8px] text-white/30 font-mono uppercase mb-1">{ind.label}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/80">{ind.value}</span>
                  <span className={`text-[9px] font-medium ${ind.color}`}>{ind.change}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[8px] text-white/20 font-mono text-center">
            Relevant macro indicators for this market context
          </div>
        </div>
      )}

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
  const marketsLoaded = markets.length > 0;

  const agentSystem = `You are NEXUS-P, the EXA Polymarket Intelligence agent. Institutional-grade prediction market analysis.

Framework:
- YES EDGE = market price undervalues YES probability (crowd wrong on the downside)
- NO EDGE = market price overvalues YES probability (crowd wrong on the upside)
- NEUTRAL = no clear mispricing, stand aside
- Kelly sizing is conservative (half-Kelly, capped at 10% bankroll)

Live market data: ${markets.length} active markets tracked.
${markets.slice(0, 5).map(m => `"${m.question.slice(0, 60)}..." YES:${(m.yesPrice*100).toFixed(0)}¢ Edge:${m.edge} Score:${Math.round(m.score)}`).join('\n')}

Be sharp. State the thesis. Quantify the edge. No fluff.`;

  const autoPrompt = activeMarket
    ? `Analyze: "${activeMarket.question}". Market: YES ${(activeMarket.yesPrice * 100).toFixed(0)}¢ / NO ${(activeMarket.noPrice * 100).toFixed(0)}¢. Volume: $${activeMarket.volume24h >= 1_000_000 ? (activeMarket.volume24h/1_000_000).toFixed(1)+'M' : (activeMarket.volume24h/1000).toFixed(0)+'K'}. Days left: ${activeMarket.daysLeft ?? 'unknown'}. Signal: ${activeMarket.edge}. What's the edge and what's your thesis?`
    : "Scan the top prediction markets and identify the strongest edge opportunity right now.";

  const age = fetchedAt ? Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000)) : null;

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
              <span className="text-[9px] text-white/30 font-mono">
                {age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`}
              </span>
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
              {loading ? "Loading markets..." : "No markets with edge found"}
            </div>
          )}
        </div>

        {/* Right: NEXUS-P agent + Macro Context — remounts when markets load so autoPrompt has real data */}
        <div className="w-[280px] border-l border-white/[0.06] shrink-0 flex flex-col overflow-hidden">
          {/* Macro Context Panel */}
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono">Macro Context</div>
            <div className="text-[8px] text-white/20 font-mono">Live market indicators</div>
          </div>
          <div className="px-3 py-3 border-b border-white/[0.06] shrink-0 overflow-y-auto" style={{ maxHeight: '320px' }}>
            <MacroContextPanel />
          </div>
          
          {/* Agent Panel */}
          <div className="px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono">NEXUS-P AGENT</div>
            <div className="text-[8px] text-white/20 font-mono">Prediction market intelligence</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ScreenAgent
              key={marketsLoaded ? "ready" : "wait"}
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
