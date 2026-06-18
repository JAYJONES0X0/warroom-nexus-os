import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { NexusTerminal } from "@/components/NexusTerminal";
import { MacroCalendar } from "@/components/MacroCalendar";
import { usePrices } from "@/hooks/usePrices";
import { useEXAScan, type EXAScores } from "@/hooks/useEXAScores";
import { useWorldMonitorMarkets } from "@/hooks/useWorldMonitorMarkets";
import { ASSET_BRAIN } from "@/lib/warroomBrain";
import intelligenceTexture from "@/assets/textures/real_neptune.jpg";

// Stable reference for the scan hook — every asset it ranks.
const SCAN_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "AUDUSD", "NZDUSD", "XAUUSD", "BTCUSD", "NAS100", "SPX", "DXY"];

const PAIRS_FOR_ARCHON = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "BTCUSD"];

const label = (pair: string) => ASSET_BRAIN[pair]?.label ?? pair;
const STATUS = (v: EXAScores["verdict"]) =>
  v === "AUTHORIZED" ? { word: "ACTIVE",  color: "#10b981" }
  : v === "DELAY"    ? { word: "FORMING", color: "#f59e0b" }
  :                    { word: "WATCH",   color: "rgba(255,255,255,0.3)" };

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
            {signal.pattern && signal.pattern !== "none" && (
              <div className="text-[10px] font-mono mb-2 px-2 py-1 rounded inline-block" style={{ background: "rgba(170,68,255,0.1)", color: "#c89aff", border: "1px solid rgba(170,68,255,0.25)" }}>
                ▣ {signal.pattern}
              </div>
            )}
            <p className="text-xs text-white/60 font-mono leading-relaxed mb-2">{signal.reasoning}</p>
            {signal.invalidation && (
              <p className="text-[10px] text-red-400/60 font-mono leading-relaxed mb-3">⚠ Invalidation: {signal.invalidation}</p>
            )}
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
  const [tab, setTab] = useState("Patterns");
  const { prices } = usePrices();
  const { fearGreed } = useWorldMonitorMarkets();
  const scan = useEXAScan(SCAN_PAIRS);
  const ranked = [...scan].sort((a, b) => b.scores.composite - a.scores.composite);
  const [selectedPair, setSelectedPair] = useState<string>("EURUSD");
  const sel = ranked.find((r) => r.pair === selectedPair) ?? ranked[0];

  return (
    <PlanetPageLayout
      texture={intelligenceTexture}
      glowColor="#aa44ff"
      bgColor="#05010e"
      screenName="INTELLIGENCE CORE"
      screenDesc="Pattern detection · ARCHON override protocol · EXA Terminal"
    >
      {/* Live scan — real EXA confluence across all assets, ranked */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-violet-400/60 font-mono">Live Scan</span>
          <span className="text-[9px] text-white/25 font-mono">{ranked.length} assets · ranked by confluence</span>
        </div>
        {ranked.length === 0 && <div className="text-[10px] text-white/25 font-mono py-6 text-center">scanning markets…</div>}
        {ranked.map(({ pair, scores }) => {
          const st = STATUS(scores.verdict);
          const isSel = sel?.pair === pair;
          const bc = scores.bias === "BULLISH" ? "#10b981" : scores.bias === "BEARISH" ? "#ef4444" : "rgba(255,255,255,0.35)";
          return (
            <div key={pair} onClick={() => setSelectedPair(pair)}
              className="p-4 rounded-xl cursor-pointer transition-all border"
              style={{ background: isSel ? "rgba(170,68,255,0.07)" : "rgba(255,255,255,0.02)", borderColor: isSel ? "rgba(170,68,255,0.35)" : "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-white uppercase tracking-wide">{label(pair)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/30 font-mono">{scores.locks.filter(Boolean).length}/4 locks</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: `${st.color}1f`, color: st.color }}>{st.word}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black" style={{ color: bc }}>{scores.bias}</span>
                <span className="text-[10px] text-white/30 font-mono truncate flex-1">{scores.factors[0]?.note}</span>
                <span className="text-[10px] font-mono text-white/40">{scores.composite}</span>
              </div>
              <div className="mt-2 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${scores.composite}%`, background: scores.composite >= 75 ? "#10b981" : scores.composite >= 60 ? "#f59e0b" : "#ef4444" }} />
              </div>
            </div>
          );
        })}
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
        {tab === "Patterns" && sel && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-black text-white mb-1">{label(sel.pair)}</div>
                <div className="text-sm text-white/40 font-mono">
                  {sel.scores.bias} · {sel.scores.verdict} · {sel.scores.locks.filter(Boolean).length}/4 locks
                  {sel.scores.winRate != null && <> · WR {sel.scores.winRate}%</>}
                </div>
              </div>
              <div className="text-3xl font-black tabular-nums" style={{ color: STATUS(sel.scores.verdict).color }}>{sel.scores.composite}</div>
            </div>
            <div className="space-y-2">
              {sel.scores.factors.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span className="text-white/40 uppercase">{f.label}</span>
                    <span className="text-white/30 truncate ml-2">{f.note}</span>
                  </div>
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${f.value}%`, background: "#aa44ff80" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-white/25 font-mono border-t border-white/[0.06] pt-2">{ASSET_BRAIN[sel.pair]?.edge}</div>
          </div>
        )}
        {tab === "Predictions" && (
          <div className="space-y-3">
            {ranked.slice(0, 6).map(({ pair, scores }) => {
              const up = scores.bias === "BULLISH";
              const flat = scores.bias === "NEUTRAL";
              const col = flat ? "rgba(255,255,255,0.4)" : up ? "#10b981" : "#ef4444";
              return (
                <div key={pair} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-white">{label(pair)}</span>
                      <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: `${col}1f`, color: col }}>
                        {flat ? "—" : up ? "▲ UP" : "▼ DOWN"}
                      </span>
                    </div>
                    <span className="text-sm font-black text-white/70">{scores.composite}%</span>
                  </div>
                  <div className="text-[9px] text-white/30 font-mono mb-2">{scores.factors[0]?.note}</div>
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${scores.composite}%`, background: `${col}99` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === "Sentiment" && (
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const appetite = sel?.scores.sentiment ?? 50;
              const bulls = ranked.filter((r) => r.scores.bias === "BULLISH").length;
              const bears = ranked.filter((r) => r.scores.bias === "BEARISH").length;
              const n = Math.max(1, ranked.length);
              const cards: [string, number, string][] = [
                ["Risk Appetite", appetite, appetite >= 55 ? "risk-on" : appetite <= 45 ? "risk-off" : "neutral"],
                ["Fear & Greed", fearGreed?.value ?? 50, fearGreed?.classification ?? "feed pending"],
                ["Assets Bullish", Math.round((bulls / n) * 100), `${bulls}/${ranked.length} pairs`],
                ["Assets Bearish", Math.round((bears / n) * 100), `${bears}/${ranked.length} pairs`],
              ];
              return cards.map(([l, v, note]) => (
                <div key={l} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="text-[10px] text-white/35 uppercase font-mono mb-2">{l}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: "#aa44ff80" }} />
                    </div>
                    <span className="text-xs font-black" style={{ color: "#aa44ff" }}>{v}</span>
                  </div>
                  <div className="text-[9px] text-white/25 font-mono">{note}</div>
                </div>
              ));
            })()}
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
