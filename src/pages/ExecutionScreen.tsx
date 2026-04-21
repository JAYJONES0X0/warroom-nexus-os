import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useEXAScores } from "@/hooks/useEXAScores";
import { usePrices } from "@/hooks/usePrices";
import executionTexture from "@/assets/textures/execution-realistic.jpg";

const PAIRS = ["EURUSD","XAUUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","NAS100","BTCUSD"];

const LOCKS_META = [
  { id:1, name:"Structure",      desc:"HTF trend aligned with bias. Weekly/Daily confirms direction." },
  { id:2, name:"Liquidity",      desc:"Liquidity pool swept or price at institutional draw." },
  { id:3, name:"Session Timing", desc:"London or NY killzone active. Dead zone = no signal." },
  { id:4, name:"Confirmation",   desc:"LTF CHoCH + BOS confirmed. Displacement present." },
];

const EXALocksGate = ({ liveLocks }: { liveLocks: boolean[] }) => {
  const [locks, setLocks] = useState(liveLocks);
  const count   = locks.filter(Boolean).length;
  const verdict = count === 4 ? "DEPLOY" : count >= 3 ? "MONITOR" : "DENIED";
  const vc      = verdict === "DEPLOY" ? "#10b981" : verdict === "MONITOR" ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono">EXA 4-LOCKS GATE</div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-white/25 font-mono uppercase tracking-wider">Execute on MT4/MT5 when:</div>
          <div className="text-sm font-black uppercase tracking-wider px-3 py-1 rounded-lg"
            style={{ color:vc, background:`${vc}15`, border:`1px solid ${vc}30` }}>
            {count}/4 — {verdict}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {LOCKS_META.map((lock, i) => (
          <div key={lock.id}
            onClick={() => setLocks(p => { const n=[...p]; n[i]=!n[i]; return n; })}
            className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border"
            style={{
              background:   locks[i] ? "rgba(255,221,0,0.05)" : "rgba(255,255,255,0.02)",
              borderColor:  locks[i] ? "rgba(255,221,0,0.2)"  : "rgba(255,255,255,0.04)",
            }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: locks[i] ? "rgba(255,221,0,0.15)" : "rgba(255,255,255,0.04)", color: locks[i] ? "#ffdd00" : "rgba(255,255,255,0.2)" }}>
              {locks[i] ? "✓" : "✗"}
            </div>
            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-wider" style={{ color: locks[i] ? "#ffdd00cc" : "rgba(255,255,255,0.3)" }}>
                LOCK {lock.id}: {lock.name}
              </div>
              <div className="text-[10px] text-white/25 font-mono">{lock.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {count === 4 && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06]">
          <div className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-1">✓ ALL LOCKS CONFIRMED — SETUP AUTHORIZED</div>
          <div className="text-[11px] text-white/40 font-mono">
            Take this signal to MT4/MT5/cTrader. Enter at structure, stop below swept level, target drawn liquidity.
          </div>
        </div>
      )}
    </div>
  );
};

const SignalPanel = ({ pair }: { pair: string }) => {
  const { prices } = usePrices();
  const exa = useEXAScores(pair);
  const p   = prices[pair];
  const dec = pair.includes("JPY") ? 3 : pair === "XAUUSD" ? 2 : pair === "NAS100" || pair === "BTCUSD" ? 0 : 4;
  const vc  = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-1">LIVE SIGNAL — {pair}</div>
          {p && (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white tabular-nums">{p.price.toFixed(dec)}</span>
              <span className={`text-sm font-black ${p.changePct>=0?"text-emerald-400":"text-red-400"}`}>
                {p.changePct>=0?"▲":"▼"} {Math.abs(p.changePct).toFixed(2)}%
              </span>
            </div>
          )}
          {!p && <div className="text-white/30 text-sm font-mono">Loading prices...</div>}
        </div>
        <div className="text-center">
          <div className="text-5xl font-black tabular-nums" style={{ color:vc, textShadow:`0 0 30px ${vc}60` }}>
            {exa.composite}
          </div>
          <div className="text-[10px] text-white/25 font-mono mt-0.5">confluence</div>
          <div className="text-sm font-black uppercase tracking-widest mt-1 px-3 py-0.5 rounded-lg border"
            style={{ color:vc, borderColor:`${vc}40`, background:`${vc}12` }}>
            {exa.verdict}
          </div>
        </div>
      </div>

      {/* Reference levels */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        {[
          ["Entry Zone", p ? (p.price*0.9998).toFixed(dec) : "—", "text-white/80",     "HTF OB area"],
          ["Stop Level", p ? (p.price*0.9985).toFixed(dec) : "—", "text-red-400/80",   "Below swept low"],
          ["Target Level",p? (p.price*1.003 ).toFixed(dec) : "—", "text-emerald-400/80","Draw on liquidity"],
        ].map(([l,v,c,sub]) => (
          <div key={l} className="text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">{l}</div>
            <div className={`text-sm font-black ${c} tabular-nums`}>{v}</div>
            <div className="text-[9px] text-white/20 font-mono">{sub}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-white/25 font-mono text-center border border-white/[0.05] rounded-lg py-2 bg-white/[0.01]">
        Reference levels only — confirm on your chart before executing on MT4/MT5
      </div>
    </div>
  );
};

const ExecutionScreen = () => {
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const exa = useEXAScores(selectedPair);
  const vc  = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";

  return (
    <PlanetPageLayout
      texture={executionTexture}
      glowColor="#ffdd00"
      bgColor="#0a0800"
      screenName="EXECUTION CENTER"
      screenDesc="Signal intelligence · EXA confluence scoring · 4-LOCKS gate · Reference levels for MT4/MT5"
    >
      {/* Pair selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {PAIRS.map(pair => (
          <button key={pair} onClick={() => setSelectedPair(pair)}
            className="px-3 py-1.5 rounded-lg text-xs font-black font-mono transition-all border"
            style={selectedPair === pair
              ? { background:"rgba(255,221,0,0.12)", borderColor:"rgba(255,221,0,0.4)", color:"#ffdd00" }
              : { background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.3)" }}>
            {pair}
          </button>
        ))}
      </div>

      {/* Live signal */}
      <SignalPanel pair={selectedPair} />

      {/* EXA multi-factor gauges */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono">EXA MULTI-FACTOR ANALYSIS</div>
          <div className="text-[10px] text-white/20 font-mono">5-dimension confluence model</div>
        </div>
        <div className="flex items-end justify-around mb-8">
          <ScoreGauge score={exa.technical}  label="Technical"  weight="25%" />
          <ScoreGauge score={exa.risk}       label="Risk"       weight="30%" />
          <ScoreGauge score={exa.sentiment}  label="Sentiment"  weight="15%" />
          <ScoreGauge score={exa.volatility} label="Volatility" weight="15%" />
          <ScoreGauge score={exa.liquidity}  label="Liquidity"  weight="15%" />
        </div>
        <div className="flex items-center justify-center gap-10 pt-5 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2">Composite Score</div>
            <div className="text-6xl font-black tabular-nums" style={{ color:vc, textShadow:`0 0 30px ${vc}60` }}>{exa.composite}</div>
            <div className="text-xs text-white/20 font-mono mt-1">/ 100</div>
          </div>
          <div className="w-px h-16 bg-white/[0.06]" />
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2">Signal</div>
            <div className="text-xl font-black uppercase tracking-widest px-5 py-2 rounded-xl border"
              style={{ color:vc, borderColor:`${vc}40`, background:`${vc}12`, textShadow:`0 0 15px ${vc}50` }}>
              {exa.verdict}
            </div>
          </div>
        </div>
      </div>

      {/* 4-LOCKS gate */}
      <EXALocksGate liveLocks={exa.locks} />

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        <div className="text-[10px] font-mono text-white/20 text-center leading-relaxed">
          WARROOM NEXUS is an intelligence layer. All signals are for informational purposes.<br />
          Execute trades through your own broker platform (MT4/MT5/cTrader). You are responsible for all trading decisions.
        </div>
      </div>
    </PlanetPageLayout>
  );
};

export default ExecutionScreen;
