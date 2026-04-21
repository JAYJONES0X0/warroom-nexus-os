import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { NexusTerminal } from "@/components/NexusTerminal";
import { MacroCalendar } from "@/components/MacroCalendar";
import { usePrices } from "@/hooks/usePrices";
import intelligenceTexture from "@/assets/textures/intelligence-realistic.jpg";

const PATTERNS = [
  { id: 1, name: "BOS + FVG Confluence", asset: "EUR/USD", bias: "BULLISH", conf: 82, tf: "H4", status: "ACTIVE" },
  { id: 2, name: "Liquidity Sweep Reversal", asset: "XAU/USD", bias: "BEARISH", conf: 71, tf: "H1", status: "FORMING" },
  { id: 3, name: "Asian Range Breakout", asset: "GBP/USD", bias: "BULLISH", conf: 65, tf: "M15", status: "WATCH" },
  { id: 4, name: "ICT Order Block Retest", asset: "NAS100", bias: "BEARISH", conf: 78, tf: "H1", status: "ACTIVE" },
  { id: 5, name: "Kill Zone Accumulation", asset: "USD/JPY", bias: "BULLISH", conf: 58, tf: "H4", status: "WATCH" },
];

const PAIRS_FOR_ARCHON = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "BTCUSD"];

function getSession() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10) return "London Killzone";
  if (h >= 12 && h < 15) return "NY Killzone";
  if (h >= 0 && h < 7) return "Asian Session";
  return "Dead Zone";
}

const TABS = ["Patterns", "Predictions", "Sentiment", "ARCHON", "Macro"];

const ArchonTab = ({ prices }: { prices: Record<string, any> }) => {
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [signal, setSignal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runArchon = async () => {
    setLoading(true);
    setSignal(null);
    try {
      const res = await fetch("/api/archon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair: selectedPair, prices, session: getSession() }),
      });
      const data = await res.json();
      if (data.signal) setSignal(data.signal);
    } catch { /* silent */ }
    setLoading(false);
  };

  const signalColor = signal?.signal === "DEPLOY" ? "#10b981" : signal?.signal === "MONITOR" ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border" style={{ background: "rgba(170,68,255,0.06)", borderColor: "rgba(170,68,255,0.2)" }}>
        <div className="text-[10px] text-white/40 font-mono">ARCHON — autonomous override protocol powered by Groq + EXA 4-LOCKS</div>
      </div>

      <div className="flex gap-3">
        <select value={selectedPair} onChange={(e) => setSelectedPair(e.target.value)}
          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/40">
          {PAIRS_FOR_ARCHON.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button onClick={runArchon} disabled={loading}
          className="px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 border"
          style={{ background: "rgba(170,68,255,0.12)", borderColor: "rgba(170,68,255,0.4)", color: "#aa44ff" }}>
          {loading ? "ANALYZING..." : "RUN ARCHON →"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs text-white/40 font-mono">ARCHON analyzing {selectedPair} with live market data...</span>
        </div>
      )}

      {signal && (
        <div className="space-y-3">
          <div className="p-5 rounded-xl border" style={{ background: `${signalColor}08`, borderColor: `${signalColor}30` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black" style={{ color: signalColor }}>{signal.signal}</span>
                <span className="text-sm text-white/60 font-mono">{signal.pair}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded" style={{ color: signal.bias === "BULLISH" ? "#10b981" : signal.bias === "BEARISH" ? "#ef4444" : "#f59e0b", background: "rgba(255,255,255,0.05)" }}>{signal.bias}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: signalColor }}>{signal.confluence}</div>
                <div className="text-[10px] text-white/30 font-mono">confluence</div>
              </div>
            </div>
            <p className="text-xs text-white/60 font-mono leading-relaxed mb-3">{signal.reasoning}</p>
            {signal.entry && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[["Entry", signal.entry], ["Stop Loss", signal.sl], ["Take Profit", signal.tp], ["R:R", signal.rr ? `1:${signal.rr}` : "—"]].map(([l, v]: any) => (
                  <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                    <div className="text-[9px] text-white/30 uppercase font-mono mb-0.5">{l}</div>
                    <div className="text-xs font-black text-white">{v || "—"}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {signal.locks?.map((locked: boolean, i: number) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{
                  background: locked ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.08)",
                  color: locked ? "#10b981" : "#ef444460",
                  border: `1px solid ${locked ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.12)"}`,
                }}>
                  L{i + 1} {locked ? "✓" : "✗"}
                </span>
              ))}
              <span className="text-[10px] font-mono text-white/30 ml-2">{signal.session_note}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IntelligenceScreen = () => {
  const [selected, setSelected] = useState<number>(1);
  const [tab, setTab] = useState("Patterns");
  const { prices } = usePrices();
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
        {tab === "ARCHON" && <ArchonTab prices={prices} />}
        {tab === "Macro" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono">Economic Calendar</div>
              <div className="text-[9px] text-white/15 font-mono">ForexFactory · next 48h · High + Medium impact</div>
            </div>
            <MacroCalendar />
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
