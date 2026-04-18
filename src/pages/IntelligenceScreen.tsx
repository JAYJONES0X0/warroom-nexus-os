import { useState } from "react";
import { PlanetOrb } from "@/components/PlanetOrb";
import { NexusTerminal } from "@/components/NexusTerminal";
import intelligenceTexture from "@/assets/textures/intelligence-realistic.jpg";

const PATTERNS = [
  { id: 1, name: "BOS + FVG Confluence", asset: "EUR/USD", bias: "BULLISH", confidence: 82, timeframe: "H4", status: "ACTIVE" },
  { id: 2, name: "Liquidity Sweep Reversal", asset: "XAU/USD", bias: "BEARISH", confidence: 71, timeframe: "H1", status: "FORMING" },
  { id: 3, name: "Asian Range Breakout", asset: "GBP/USD", bias: "BULLISH", confidence: 65, timeframe: "M15", status: "WATCH" },
  { id: 4, name: "ICT Order Block Retest", asset: "NAS100", bias: "BEARISH", confidence: 78, timeframe: "H1", status: "ACTIVE" },
  { id: 5, name: "Kill Zone Accumulation", asset: "USD/JPY", bias: "BULLISH", confidence: 58, timeframe: "H4", status: "WATCH" },
];

const ARCHON_SIGNALS = [
  { time: "09:14", signal: "DEPLOY — EUR/USD BUY at 1.0847, SL 1.0810, TP 1.0965 (R:R 3.2)", urgency: "HIGH" },
  { time: "08:45", signal: "MONITOR — XAU/USD structure bearish. Wait for NY open liquidity grab.", urgency: "MED" },
  { time: "07:30", signal: "DENIED — GBP/USD setup invalidated. Structure shifted bearish on H4.", urgency: "LOW" },
  { time: "06:00", signal: "SESSION OPEN — London killzone active. High-probability window 09:00-11:00 UTC.", urgency: "INFO" },
];

const PREDICTIONS = [
  { asset: "EUR/USD", direction: "UP", prob: 74, target: "1.0965", timeframe: "24h", basis: "BOS + liquidity sweep + FVG fill" },
  { asset: "XAU/USD", direction: "DOWN", prob: 68, target: "2,285", timeframe: "12h", basis: "Bearish structure + order block retest" },
  { asset: "BTC/USD", direction: "UP", prob: 61, target: "71,400", timeframe: "48h", basis: "Weekly demand zone + confluence" },
];

const TAB_CONTENT: Record<string, React.ReactNode> = {};

const PatternList = ({ selected, onSelect }: { selected: number | null; onSelect: (id: number) => void }) => (
  <div className="space-y-2">
    {PATTERNS.map((p) => (
      <div
        key={p.id}
        onClick={() => onSelect(p.id)}
        className={`p-4 rounded-xl cursor-pointer transition-all border ${
          selected === p.id
            ? "bg-emerald-500/10 border-emerald-500/40"
            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-black text-white uppercase tracking-wider">{p.name}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            p.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" :
            p.status === "FORMING" ? "bg-yellow-500/15 text-yellow-400" :
            "bg-white/[0.05] text-white/30"
          }`}>{p.status}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 font-mono">{p.asset}</span>
          <span className={`text-[10px] font-black ${p.bias === "BULLISH" ? "text-emerald-400" : "text-red-400"}`}>{p.bias}</span>
          <span className="text-[10px] text-white/30 font-mono">{p.timeframe}</span>
          <span className="ml-auto text-[10px] font-mono text-white/50">{p.confidence}%</span>
        </div>
        <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${p.confidence}%`,
              background: p.confidence >= 75 ? "#10b981" : p.confidence >= 60 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

const PatternsTab = ({ selected }: { selected: number | null }) => {
  const pattern = PATTERNS.find((p) => p.id === selected);
  if (!pattern) return (
    <div className="h-full flex items-center justify-center text-white/20 text-sm font-mono">
      Select a pattern to analyze
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
        <div className="text-xs text-emerald-400/70 uppercase tracking-wider font-mono mb-3">Pattern Detail</div>
        <div className="text-lg font-black text-white mb-1">{pattern.name}</div>
        <div className="text-sm text-white/50 font-mono">{pattern.asset} · {pattern.timeframe} · {pattern.bias}</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">Confidence</div>
          <div className="text-2xl font-black" style={{ color: pattern.confidence >= 75 ? "#10b981" : "#f59e0b" }}>{pattern.confidence}%</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">Timeframe</div>
          <div className="text-2xl font-black text-white">{pattern.timeframe}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">Status</div>
          <div className={`text-sm font-black uppercase ${pattern.status === "ACTIVE" ? "text-emerald-400" : "text-yellow-400"}`}>{pattern.status}</div>
        </div>
      </div>
    </div>
  );
};

const PredictionsTab = () => (
  <div className="space-y-3">
    {PREDICTIONS.map((p) => (
      <div key={p.asset} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="font-black text-white">{p.asset}</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded ${p.direction === "UP" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
              {p.direction === "UP" ? "▲" : "▼"} {p.direction}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-white">{p.prob}%</div>
            <div className="text-[10px] text-white/30 font-mono">{p.timeframe}</div>
          </div>
        </div>
        <div className="text-[10px] text-white/40 font-mono">Target: {p.target} · {p.basis}</div>
        <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${p.prob}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const SentimentTab = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Retail Sentiment", bull: 68, asset: "EUR/USD" },
        { label: "Institutional", bull: 42, asset: "XAU/USD" },
        { label: "Options Flow", bull: 75, asset: "SPX" },
        { label: "Fear & Greed", bull: 58, asset: "BTC" },
      ].map((s) => (
        <div key={s.label} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="text-[10px] text-white/40 uppercase font-mono mb-1">{s.label}</div>
          <div className="text-xs text-white/60 font-mono mb-2">{s.asset}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${s.bull}%` }} />
            </div>
            <span className="text-xs font-black text-emerald-400">{s.bull}%</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ArchonTab = () => (
  <div className="space-y-3">
    <div className="p-4 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl mb-4">
      <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-1">ARCHON PROTOCOL</div>
      <div className="text-xs text-white/50 font-mono">Override intelligence layer — autonomous signal generation based on 4-LOCKS + EXA composite scoring.</div>
    </div>
    {ARCHON_SIGNALS.map((s, i) => (
      <div key={i} className={`p-4 rounded-xl border ${
        s.urgency === "HIGH" ? "bg-emerald-500/[0.06] border-emerald-500/20" :
        s.urgency === "MED" ? "bg-yellow-500/[0.06] border-yellow-500/20" :
        "bg-white/[0.02] border-white/[0.05]"
      }`}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[10px] text-white/30 font-mono">{s.time}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
            s.urgency === "HIGH" ? "bg-emerald-500/20 text-emerald-400" :
            s.urgency === "MED" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-white/[0.05] text-white/30"
          }`}>{s.urgency}</span>
        </div>
        <div className="text-xs text-white/70 font-mono leading-relaxed">{s.signal}</div>
      </div>
    ))}
  </div>
);

const TABS = ["Patterns", "Predictions", "Sentiment", "ARCHON"];

const IntelligenceScreen = () => {
  const [selectedPattern, setSelectedPattern] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState("Patterns");

  const renderTab = () => {
    switch (activeTab) {
      case "Patterns": return <PatternsTab selected={selectedPattern} />;
      case "Predictions": return <PredictionsTab />;
      case "Sentiment": return <SentimentTab />;
      case "ARCHON": return <ArchonTab />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
      <PlanetOrb texture={intelligenceTexture} glowColor="#aa44ff" label="NEXUS" />

      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
        <div className="text-3xl font-black tracking-wider">INTELLIGENCE CORE</div>
        <div className="text-sm text-white/40 font-mono mt-1">Pattern Detection · ARCHON Override · EXA Terminal</div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-[320px,1fr] gap-6">
          {/* Left: pattern list */}
          <div>
            <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-4">ACTIVE PATTERNS</div>
            <PatternList selected={selectedPattern} onSelect={setSelectedPattern} />
          </div>

          {/* Right: tabs + content */}
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === tab
                      ? tab === "ARCHON"
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                        : "bg-white/[0.08] text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 min-h-[300px]">
              {renderTab()}
            </div>
          </div>
        </div>

        {/* NexusTerminal */}
        <div className="mt-6 h-[400px]">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-3">EXA TERMINAL</div>
          <NexusTerminal />
        </div>
      </div>
    </div>
  );
};

export default IntelligenceScreen;
