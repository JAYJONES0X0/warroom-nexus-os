import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useEXAScores } from "@/hooks/useEXAScores";
import executionTexture from "@/assets/textures/execution-realistic.jpg";

const LOCKS = [
  { id: 1, name: "Structure", desc: "Market structure aligned with bias" },
  { id: 2, name: "Liquidity", desc: "Liquidity pool in target zone" },
  { id: 3, name: "Session Timing", desc: "London or NY killzone active" },
  { id: 4, name: "Confirmation", desc: "Displacement or BOS confirmed" },
];

const EXALocks = ({ liveLocks }: { liveLocks: boolean[] }) => {
  const [locks, setLocks] = useState(liveLocks);
  const count = locks.filter(Boolean).length;
  const verdict = count === 4 ? "DEPLOY" : count >= 3 ? "MONITOR" : "DENIED";
  const vc = verdict === "DEPLOY" ? "#10b981" : verdict === "MONITOR" ? "#f59e0b" : "#ef4444";
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono">EXA 4-LOCKS</div>
        <div className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg" style={{ color: vc, background: `${vc}15`, border: `1px solid ${vc}30` }}>
          {count}/4 — {verdict}
        </div>
      </div>
      <div className="space-y-2">
        {LOCKS.map((lock, i) => (
          <div
            key={lock.id}
            onClick={() => setLocks((p) => { const n = [...p]; n[i] = !n[i]; return n; })}
            className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border"
            style={{
              background: locks[i] ? "rgba(255,221,0,0.05)" : "rgba(255,255,255,0.02)",
              borderColor: locks[i] ? "rgba(255,221,0,0.2)" : "rgba(255,255,255,0.04)",
            }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black" style={{
              background: locks[i] ? "rgba(255,221,0,0.15)" : "rgba(255,255,255,0.04)",
              color: locks[i] ? "#ffdd00" : "rgba(255,255,255,0.2)",
            }}>
              {locks[i] ? "✓" : "✗"}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider" style={{ color: locks[i] ? "#ffdd00cc" : "rgba(255,255,255,0.3)" }}>
                LOCK {lock.id}: {lock.name}
              </div>
              <div className="text-[10px] text-white/25 font-mono">{lock.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const OrderEntry = () => {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [pair, setPair] = useState("EUR/USD");
  const [lots, setLots] = useState("0.10");
  const [entry, setEntry] = useState("1.0847");
  const [sl, setSl] = useState("1.0810");
  const [tp, setTp] = useState("1.0965");
  const pip = pair.includes("JPY") ? 0.01 : 0.0001;
  const slPips = Math.abs((parseFloat(entry) - parseFloat(sl)) / pip) || 0;
  const tpPips = Math.abs((parseFloat(tp) - parseFloat(entry)) / pip) || 0;
  const rr = slPips > 0 ? (tpPips / slPips).toFixed(1) : "—";
  const risk = (slPips * parseFloat(lots) * 10).toFixed(2);
  const profit = (tpPips * parseFloat(lots) * 10).toFixed(2);
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mt-6">
      <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono mb-5">ORDER ENTRY</div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">Symbol</label>
          <select value={pair} onChange={(e) => setPair(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-yellow-500/50">
            {["EUR/USD","GBP/USD","USD/JPY","XAU/USD","BTC/USD","NAS100"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">Direction</label>
          <div className="flex gap-2">
            {(["BUY","SELL"] as const).map((s) => (
              <button key={s} onClick={() => setSide(s)}
                className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all border"
                style={side === s
                  ? { background: s === "BUY" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", borderColor: s === "BUY" ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)", color: s === "BUY" ? "#10b981" : "#ef4444" }
                  : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }
                }>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[["Lot Size", lots, setLots], ["Entry", entry, setEntry], ["Stop Loss", sl, setSl], ["Take Profit", tp, setTp]].map(([label, val, set]: any) => (
          <div key={label as string}>
            <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">{label as string}</label>
            <input value={val as string} onChange={(e) => set(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-yellow-500/50" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[["Risk","$" + risk,"#ef4444"],["Profit","$" + profit,"#10b981"],["R:R","1:"+rr,"#ffdd00"]].map(([l,v,c]: any) => (
          <div key={l} className="rounded-xl p-3 text-center border" style={{ background: `${c}08`, borderColor: `${c}20` }}>
            <div className="text-[10px] text-white/30 uppercase font-mono mb-1">{l}</div>
            <div className="text-base font-black" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <button className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-sm transition-all hover:-translate-y-0.5 border"
        style={side === "BUY"
          ? { background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.45)", color: "#10b981" }
          : { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.45)", color: "#ef4444" }}>
        PLACE {side} ORDER — {pair}
      </button>
    </div>
  );
};

const ExecutionScreen = () => {
  const exa = useEXAScores("EURUSD");
  const scores = { technical: exa.technical, risk: exa.risk, sentiment: exa.sentiment, volatility: exa.volatility, liquidity: exa.liquidity };
  const composite = exa.composite;
  const verdict = exa.verdict;
  const vc = verdict === "AUTHORIZED" ? "#10b981" : verdict === "DELAY" ? "#f59e0b" : "#ef4444";
  return (
    <PlanetPageLayout
      texture={executionTexture}
      glowColor="#ffdd00"
      bgColor="#0a0800"
      screenName="EXECUTION CENTER"
      screenDesc="EXA Analysis scoring · Order Entry with live R:R · 4-LOCKS gate"
    >
      {/* EXA Analysis gauges */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono">EXA ANALYSIS</div>
          <div className="text-[10px] text-white/20 font-mono">Multi-factor confluence</div>
        </div>
        <div className="flex items-end justify-around mb-8">
          <ScoreGauge score={scores.technical} label="Technical" weight="25%" />
          <ScoreGauge score={scores.risk} label="Risk" weight="30%" />
          <ScoreGauge score={scores.sentiment} label="Sentiment" weight="15%" />
          <ScoreGauge score={scores.volatility} label="Volatility" weight="15%" />
          <ScoreGauge score={scores.liquidity} label="Liquidity" weight="15%" />
        </div>
        <div className="flex items-center justify-center gap-10 pt-5 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2">Composite</div>
            <div className="text-6xl font-black tabular-nums" style={{ color: vc, textShadow: `0 0 30px ${vc}60` }}>{composite}</div>
            <div className="text-xs text-white/20 font-mono mt-1">/ 100</div>
          </div>
          <div className="w-px h-16 bg-white/[0.06]" />
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-2">Verdict</div>
            <div className="text-xl font-black uppercase tracking-widest px-5 py-2 rounded-xl border"
              style={{ color: vc, borderColor: `${vc}40`, background: `${vc}12`, textShadow: `0 0 15px ${vc}50` }}>
              {verdict}
            </div>
          </div>
        </div>
      </div>
      <OrderEntry />
      <EXALocks liveLocks={exa.locks} />
    </PlanetPageLayout>
  );
};

export default ExecutionScreen;
