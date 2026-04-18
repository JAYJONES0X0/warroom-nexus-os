import { useState, useEffect } from "react";
import { PlanetOrb } from "@/components/PlanetOrb";
import { ScoreGauge } from "@/components/ScoreGauge";
import executionTexture from "@/assets/textures/execution-realistic.jpg";

const LOCKS = [
  { id: 1, name: "Structure", desc: "Market structure aligned with bias" },
  { id: 2, name: "Liquidity", desc: "Liquidity pool in target zone" },
  { id: 3, name: "Session Timing", desc: "London or NY killzone active" },
  { id: 4, name: "Confirmation", desc: "Displacement or BOS confirmed" },
];

const useEXAScores = () => {
  const [scores, setScores] = useState({ technical: 0, risk: 0, sentiment: 0, volatility: 0, liquidity: 0 });
  useEffect(() => {
    setScores({ technical: 74, risk: 68, sentiment: 55, volatility: 81, liquidity: 72 });
  }, []);
  const composite = Math.round(
    scores.technical * 0.25 + scores.risk * 0.30 + scores.sentiment * 0.15 + scores.volatility * 0.15 + scores.liquidity * 0.15
  );
  return { scores, composite };
};

const OrderEntry = () => {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [pair, setPair] = useState("EUR/USD");
  const [lots, setLots] = useState("0.10");
  const [entry, setEntry] = useState("1.0847");
  const [sl, setSl] = useState("1.0810");
  const [tp, setTp] = useState("1.0965");

  const entryNum = parseFloat(entry) || 0;
  const slNum = parseFloat(sl) || 0;
  const tpNum = parseFloat(tp) || 0;
  const lotsNum = parseFloat(lots) || 0;
  const pipSize = pair.includes("JPY") ? 0.01 : 0.0001;
  const slPips = Math.abs((entryNum - slNum) / pipSize);
  const tpPips = Math.abs((tpNum - entryNum) / pipSize);
  const rr = slPips > 0 ? (tpPips / slPips).toFixed(2) : "—";
  const riskUsd = (slPips * lotsNum * 10).toFixed(2);
  const profitUsd = (tpPips * lotsNum * 10).toFixed(2);

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
      <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-5">ORDER ENTRY</div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Pair */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">Symbol</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
          >
            {["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "NAS100"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {/* Side */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">Direction</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
                side === "BUY" ? "bg-emerald-500/20 border border-emerald-500/60 text-emerald-400" : "bg-white/[0.03] border border-white/[0.06] text-white/30"
              }`}
            >BUY</button>
            <button
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
                side === "SELL" ? "bg-red-500/20 border border-red-500/60 text-red-400" : "bg-white/[0.03] border border-white/[0.06] text-white/30"
              }`}
            >SELL</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[{ label: "Lot Size", val: lots, set: setLots }, { label: "Entry Price", val: entry, set: setEntry },
          { label: "Stop Loss", val: sl, set: setSl }].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">{label}</label>
            <input
              value={val}
              onChange={(e) => set(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        ))}
      </div>

      <div className="mb-5">
        <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">Take Profit</label>
        <input
          value={tp}
          onChange={(e) => setTp(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Calculated metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-red-500/[0.08] border border-red-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">Risk</div>
          <div className="text-base font-black text-red-400">${riskUsd}</div>
        </div>
        <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">Profit</div>
          <div className="text-base font-black text-emerald-400">${profitUsd}</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">R:R</div>
          <div className="text-base font-black text-white">1:{rr}</div>
        </div>
      </div>

      <button
        className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm transition-all ${
          side === "BUY"
            ? "bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/25 hover:shadow-[0_8px_30px_rgba(16,185,129,0.25)]"
            : "bg-red-500/15 border border-red-500/50 text-red-400 hover:bg-red-500/25 hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]"
        } hover:-translate-y-0.5`}
      >
        PLACE {side} ORDER — {pair}
      </button>
    </div>
  );
};

const EXALocks = ({ composite }: { composite: number }) => {
  const [locks, setLocks] = useState([true, true, true, false]);
  const locksActive = locks.filter(Boolean).length;
  const verdict = locksActive === 4 ? "DEPLOY" : locksActive >= 3 ? "MONITOR" : "DENIED";
  const verdictColor = verdict === "DEPLOY" ? "text-emerald-400" : verdict === "MONITOR" ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono">EXA 4-LOCKS</div>
        <div className={`text-xs font-black uppercase tracking-wider ${verdictColor}`}>
          {locksActive}/4 — {verdict}
        </div>
      </div>
      <div className="space-y-2.5">
        {LOCKS.map((lock, i) => (
          <div
            key={lock.id}
            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
              locks[i] ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-white/[0.02] border border-white/[0.04]"
            }`}
            onClick={() => setLocks((prev) => { const n = [...prev]; n[i] = !n[i]; return n; })}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black transition-all ${
              locks[i] ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.04] text-white/20"
            }`}>
              {locks[i] ? "✓" : "✗"}
            </div>
            <div>
              <div className={`text-xs font-black uppercase tracking-wider ${locks[i] ? "text-emerald-400" : "text-white/30"}`}>
                LOCK {lock.id}: {lock.name}
              </div>
              <div className="text-[10px] text-white/30 font-mono">{lock.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExecutionScreen = () => {
  const { scores, composite } = useEXAScores();

  const verdict = composite >= 85 ? "AUTHORIZED" : composite >= 65 ? "DELAY" : "DENIED";
  const verdictColor = verdict === "AUTHORIZED" ? "#10b981" : verdict === "DELAY" ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
      <PlanetOrb texture={executionTexture} glowColor="#ffdd00" label="NEXUS" />

      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
        <div className="text-3xl font-black tracking-wider">EXECUTION CENTER</div>
        <div className="text-sm text-white/40 font-mono mt-1">EXA Analysis · Order Entry · 4-LOCKS Gate</div>
      </div>

      <div className="px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        {/* EXA Analysis section */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono">EXA ANALYSIS</div>
            <div className="text-xs text-white/30 font-mono">Multi-factor confluence scoring</div>
          </div>

          {/* 5 gauges */}
          <div className="flex items-end justify-around mb-8">
            <ScoreGauge score={scores.technical} label="Technical" weight="25%" />
            <ScoreGauge score={scores.risk} label="Risk" weight="30%" />
            <ScoreGauge score={scores.sentiment} label="Sentiment" weight="15%" />
            <ScoreGauge score={scores.volatility} label="Volatility" weight="15%" />
            <ScoreGauge score={scores.liquidity} label="Liquidity" weight="15%" />
          </div>

          {/* Composite score */}
          <div className="flex items-center justify-center gap-8 pt-5 border-t border-white/[0.06]">
            <div className="text-center">
              <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-2">Composite Score</div>
              <div
                className="text-6xl font-black tabular-nums"
                style={{ color: verdictColor, textShadow: `0 0 30px ${verdictColor}60` }}
              >
                {composite}
              </div>
              <div className="text-xs text-white/30 font-mono mt-1">/ 100</div>
            </div>
            <div className="w-px h-20 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-2">Verdict</div>
              <div
                className="text-2xl font-black uppercase tracking-widest px-6 py-2 rounded-xl border"
                style={{
                  color: verdictColor,
                  borderColor: `${verdictColor}40`,
                  background: `${verdictColor}12`,
                  textShadow: `0 0 15px ${verdictColor}60`,
                }}
              >
                {verdict}
              </div>
            </div>
          </div>
        </div>

        {/* Order Entry + 4-LOCKS side by side */}
        <div className="grid grid-cols-2 gap-6">
          <OrderEntry />
          <EXALocks composite={composite} />
        </div>
      </div>
    </div>
  );
};

export default ExecutionScreen;
