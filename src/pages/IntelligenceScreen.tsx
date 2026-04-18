import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { NexusTerminal } from "@/components/NexusTerminal";
import intelligenceTexture from "@/assets/textures/intelligence-realistic.jpg";

const PATTERNS = [
  { id: 1, name: "BOS + FVG Confluence", asset: "EUR/USD", bias: "BULLISH", conf: 82, tf: "H4", status: "ACTIVE" },
  { id: 2, name: "Liquidity Sweep Reversal", asset: "XAU/USD", bias: "BEARISH", conf: 71, tf: "H1", status: "FORMING" },
  { id: 3, name: "Asian Range Breakout", asset: "GBP/USD", bias: "BULLISH", conf: 65, tf: "M15", status: "WATCH" },
  { id: 4, name: "ICT Order Block Retest", asset: "NAS100", bias: "BEARISH", conf: 78, tf: "H1", status: "ACTIVE" },
  { id: 5, name: "Kill Zone Accumulation", asset: "USD/JPY", bias: "BULLISH", conf: 58, tf: "H4", status: "WATCH" },
];

const ARCHON = [
  { time: "09:14", msg: "DEPLOY — EUR/USD BUY 1.0847 SL 1.0810 TP 1.0965 (R:R 3.2)", urgency: "HIGH" },
  { time: "08:45", msg: "MONITOR — XAU/USD bearish structure. Wait for NY liquidity grab.", urgency: "MED" },
  { time: "07:30", msg: "DENIED — GBP/USD setup invalidated. Structure shifted H4.", urgency: "LOW" },
  { time: "06:00", msg: "SESSION — London killzone open. High probability 09:00-11:00 UTC.", urgency: "INFO" },
];

const TABS = ["Patterns", "Predictions", "Sentiment", "ARCHON"];

const IntelligenceScreen = () => {
  const [selected, setSelected] = useState<number>(1);
  const [tab, setTab] = useState("Patterns");
  const pattern = PATTERNS.find((p) => p.id === selected);

  return (
    <PlanetPageLayout
      texture={intelligenceTexture}
      glowColor="#aa44ff"
      bgColor="#07000f"
      screenName="INTELLIGENCE CORE"
      screenDesc="Pattern detection · ARCHON override protocol · EXA Terminal"
    >
      {/* Pattern list */}
      <div className="space-y-2 mb-6">
        {PATTERNS.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="p-4 rounded-xl cursor-pointer transition-all border"
            style={{
              background: selected === p.id ? "rgba(170,68,255,0.07)" : "rgba(255,255,255,0.02)",
              borderColor: selected === p.id ? "rgba(170,68,255,0.35)" : "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-white uppercase tracking-wide">{p.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{
                background: p.status === "ACTIVE" ? "rgba(16,185,129,0.12)" : p.status === "FORMING" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                color: p.status === "ACTIVE" ? "#10b981" : p.status === "FORMING" ? "#f59e0b" : "rgba(255,255,255,0.3)",
              }}>{p.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/35 font-mono">{p.asset}</span>
              <span className="text-[10px] font-black" style={{ color: p.bias === "BULLISH" ? "#10b981" : "#ef4444" }}>{p.bias}</span>
              <span className="text-[10px] text-white/25 font-mono">{p.tf}</span>
              <span className="ml-auto text-[10px] font-mono text-white/40">{p.conf}%</span>
            </div>
            <div className="mt-2 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${p.conf}%`,
                background: p.conf >= 75 ? "#10b981" : p.conf >= 60 ? "#f59e0b" : "#ef4444",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
            style={tab === t
              ? { background: t === "ARCHON" ? "rgba(170,68,255,0.18)" : "rgba(255,255,255,0.08)", color: t === "ARCHON" ? "#aa44ff" : "#ffffff", border: "1px solid " + (t === "ARCHON" ? "rgba(170,68,255,0.4)" : "rgba(255,255,255,0.1)") }
              : { color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }
            }
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6 min-h-[200px]">
        {tab === "Patterns" && pattern && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-black text-white mb-1">{pattern.name}</div>
              <div className="text-sm text-white/40 font-mono">{pattern.asset} · {pattern.tf} · {pattern.bias}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["Confidence", pattern.conf + "%", pattern.conf >= 75 ? "#10b981" : "#f59e0b"],
                ["Timeframe", pattern.tf, "#ffffff"],
                ["Status", pattern.status, pattern.status === "ACTIVE" ? "#10b981" : "#f59e0b"]].map(([l, v, c]: any) => (
                <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-white/30 uppercase font-mono mb-1">{l}</div>
                  <div className="text-xl font-black" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "Predictions" && (
          <div className="space-y-3">
            {[{ a: "EUR/USD", d: "UP", p: 74, t: "1.0965" }, { a: "XAU/USD", d: "DOWN", p: 68, t: "2,285" }, { a: "BTC/USD", d: "UP", p: 61, t: "71,400" }].map((p) => (
              <div key={p.a} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white">{p.a}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: p.d === "UP" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: p.d === "UP" ? "#10b981" : "#ef4444" }}>
                      {p.d === "UP" ? "▲" : "▼"} {p.d}
                    </span>
                  </div>
                  <span className="text-sm font-black text-white/70">{p.p}%</span>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${p.p}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "Sentiment" && (
          <div className="grid grid-cols-2 gap-3">
            {[["Retail Long", 68], ["Institutional", 42], ["Options Flow", 75], ["Fear & Greed", 58]].map(([l, v]: any) => (
              <div key={l} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div className="text-[10px] text-white/35 uppercase font-mono mb-2">{l}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: "#aa44ff80" }} />
                  </div>
                  <span className="text-xs font-black" style={{ color: "#aa44ff" }}>{v}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "ARCHON" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border mb-4" style={{ background: "rgba(170,68,255,0.06)", borderColor: "rgba(170,68,255,0.2)" }}>
              <div className="text-[10px] text-white/30 font-mono">ARCHON PROTOCOL — autonomous signal generation via 4-LOCKS + EXA composite scoring</div>
            </div>
            {ARCHON.map((s, i) => (
              <div key={i} className="p-4 rounded-xl border" style={{
                background: s.urgency === "HIGH" ? "rgba(16,185,129,0.06)" : s.urgency === "MED" ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
                borderColor: s.urgency === "HIGH" ? "rgba(16,185,129,0.2)" : s.urgency === "MED" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-white/25 font-mono">{s.time}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{
                    color: s.urgency === "HIGH" ? "#10b981" : s.urgency === "MED" ? "#f59e0b" : "rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.04)",
                  }}>{s.urgency}</span>
                </div>
                <div className="text-xs text-white/60 font-mono leading-relaxed">{s.msg}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminal */}
      <div className="h-[380px]">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-3">EXA TERMINAL</div>
        <NexusTerminal />
      </div>
    </PlanetPageLayout>
  );
};

export default IntelligenceScreen;
