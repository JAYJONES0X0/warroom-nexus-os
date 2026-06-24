import { useState, useEffect } from "react";
import { usePrices } from "@/hooks/usePrices";
import { usePriceTick } from "@/hooks/usePriceTick";
import { useEXAScores } from "@/hooks/useEXAScores";
import { useKeyLevels } from "@/hooks/useKeyLevels";
import { ASSET_BRAIN } from "@/lib/warroomBrain";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroCalendar } from "@/components/MacroCalendar";
import { MarketsChart } from "@/components/MarketsChart";
import { DrawingTools } from "@/components/DrawingTools";

// ─── constants ───────────────────────────────────────────────────────────────
const ALL_ASSETS = [
  { key: "EURUSD", label: "EUR/USD", cat: "FX",     dec: 4 },
  { key: "GBPUSD", label: "GBP/USD", cat: "FX",     dec: 4 },
  { key: "USDJPY", label: "USD/JPY", cat: "FX",     dec: 3 },
  { key: "GBPJPY", label: "GBP/JPY", cat: "FX",     dec: 3 },
  { key: "AUDUSD", label: "AUD/USD", cat: "FX",     dec: 4 },
  { key: "NZDUSD", label: "NZD/USD", cat: "FX",     dec: 4 },
  { key: "XAUUSD", label: "XAU/USD", cat: "COMM",   dec: 2 },
  { key: "BTCUSD", label: "BTC/USD", cat: "CRYPTO", dec: 0 },
  { key: "NAS100", label: "NAS100",  cat: "INDEX",  dec: 0 },
  { key: "SPX",    label: "SPX500",  cat: "INDEX",  dec: 0 },
  { key: "DXY",    label: "DXY",     cat: "FX",     dec: 3 },
];

const MARKETS_AGENT_CONTEXT = `You are NEXUS-M, the Markets Agent for EXA WARROOM.
Monitor live prices across all 11 assets. Think like a senior institutional trader.
Use EXA 4-LOCKS: Structure, Liquidity, Session Timing, Confirmation.
Lead with the signal. Max 5 lines unless asked for detail.`;

const MARKETS_AUTO_PROMPT = `Opening briefing: (1) current session and what it means for FX, (2) top 1 setup right now with confluence, (3) one key level to watch, (4) one risk to be aware of. Specific prices. Max 5 lines.`;

function getSession() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7  && h < 10)  return { label: "LONDON KZ",   color: "#10b981" };
  if (h >= 12 && h < 15)  return { label: "NY KILLZONE", color: "#0099ff" };
  if (h >= 0  && h < 7)   return { label: "ASIA RANGE",  color: "#aa44ff" };
  return { label: "DEAD ZONE", color: "#ffffff30" };
}

// ─── Order Book ───────────────────────────────────────────────────────────────
const OrderBook = ({ mid, dec }: { mid: number; dec: number }) => {
  const step = dec >= 4 ? 0.0001 : dec === 3 ? 0.001 : dec === 2 ? 0.1 : 1;
  // Deterministic seed from mid price — no Math.random(), no flickering on re-render
  // Depth is SIMULATED until broker connection (MetaTrader/cTrader) is wired
  const seed = Math.round(mid * 100) % 997;
  const stable = (i: number, salt: number) => {
    const n = ((seed * (i + 1) * 17 + salt * 31) % 100 + 100) % 100;
    return 0.2 + (n / 100) * 2.8;
  };
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: (mid + step * (i + 1)).toFixed(dec),
    size: stable(i, 1).toFixed(2),
    pct: 0.05 + (stable(i, 7) / 3) * 0.6,
  }));
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: (mid - step * i).toFixed(dec),
    size: stable(i, 3).toFixed(2),
    pct: 0.05 + (stable(i, 11) / 3) * 0.6,
  }));
  return (
    <div className="text-[10px] font-mono">
      <div className="grid grid-cols-3 text-[9px] text-white/20 uppercase px-1 mb-1">
        <span>Price</span><span className="text-center">Size</span><span className="text-right">Depth</span>
      </div>
      {asks.slice().reverse().map((a, i) => (
        <div key={i} className="relative grid grid-cols-3 px-1 py-[2px]">
          <div className="absolute right-0 top-0 h-full rounded-l opacity-20" style={{ width: `${a.pct * 100}%`, background: "#ef4444" }} />
          <span className="relative text-red-400">{a.price}</span>
          <span className="relative text-center text-white/40">{a.size}</span>
          <span className="relative text-right text-white/30">{(parseFloat(a.size) * 1.4).toFixed(1)}</span>
        </div>
      ))}
      <div className="text-center font-black text-white text-xs py-1 my-0.5 border-y border-white/[0.06]">
        {mid.toFixed(dec)}
      </div>
      {bids.map((b, i) => (
        <div key={i} className="relative grid grid-cols-3 px-1 py-[2px]">
          <div className="absolute right-0 top-0 h-full rounded-l opacity-20" style={{ width: `${b.pct * 100}%`, background: "#10b981" }} />
          <span className="relative text-emerald-400">{b.price}</span>
          <span className="relative text-center text-white/40">{b.size}</span>
          <span className="relative text-right text-white/30">{(parseFloat(b.size) * 1.4).toFixed(1)}</span>
        </div>
      ))}
      <div className="mt-1.5 px-1 text-[7.5px] text-white/15 font-mono tracking-wide">
        DEPTH SIMULATED · broker connection required
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const MarketsScreen = () => {
  const { prices, source } = usePrices();
  const [selected, setSelected]  = useState("XAUUSD");
  const [tf, setTf]              = useState("1h");
  const [alertSent, setAlertSent] = useState(false);
  const [showMacro, setShowMacro] = useState(false);
  const [drawingTool, setDrawingTool] = useState<string | null>(null);
  const [clock, setClock]        = useState(new Date());

  const tick = usePriceTick(selected);   // real-time WS tick (selected pair)
  const exa  = useEXAScores(selected);
  const { levels } = useKeyLevels();
  const lv = levels[selected];

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const session = getSession();
  const asset   = ALL_ASSETS.find(a => a.key === selected)!;
  const p       = prices[selected];

  // Use live WS tick if available, else fall back to REST price
  const livePrice = tick?.price ?? p?.price ?? 0;
  const liveBid   = tick?.bid   ?? livePrice;
  const liveAsk   = tick?.ask   ?? (livePrice + (selected.includes("JPY") ? 0.008 : selected === "XAUUSD" ? 0.25 : 0.00007));
  const connected = !!tick?.connected;

  const maxChange = Math.max(...Object.values(prices).map((x: any) => Math.abs(x.changePct ?? 0)), 0.01);

  return (
    <div className="fixed flex flex-col overflow-hidden bg-[#020508]" style={{ fontFamily: "monospace", top: 44, left: 52, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 z-10 flex flex-col">

        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 px-3 h-9 border-b shrink-0"
          style={{ borderColor: "rgba(255,68,68,0.12)", background: "rgba(0,0,0,0.3)" }}>
          <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: "#ff4444", boxShadow: "0 0 8px #ff4444" }} />
          <span className="text-[11px] font-black tracking-[0.2em] text-red-400 mr-4">GLOBAL MARKETS</span>
          <span className="text-[6px] font-mono tracking-[0.18em] px-1 py-0.5 rounded border mr-4"
            style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)" }}>
            VIEWER LIVE · TERMINAL BUILDING
          </span>

          {/* Selected pair live display */}
          <div className="flex items-center gap-3 pr-4 border-r border-white/[0.06] mr-3">
            <span className="text-[11px] font-black text-white">{asset.label}</span>
            <span className="text-[13px] font-black text-white tabular-nums">{livePrice ? livePrice.toFixed(asset.dec) : "—"}</span>
            {p && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.changePct >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
                {p.changePct >= 0 ? "+" : ""}{p.changePct.toFixed(2)}%
              </span>
            )}
            {/* WS live indicator */}
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full" style={{ background: connected ? "#10b981" : "#ffffff20", boxShadow: connected ? "0 0 4px #10b981" : "none" }} />
              <span className="text-[8px] text-white/20 font-mono">{connected ? "LIVE" : source === 'twelvedata' ? "5s" : "30s"}</span>
            </div>
          </div>

          {/* Mini ticker strip */}
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            {ALL_ASSETS.slice(0, 8).map(a => {
              const pr = prices[a.key];
              if (!pr) return null;
              const up = pr.changePct >= 0;
              return (
                <button key={a.key} onClick={() => setSelected(a.key)}
                  className={`flex items-center gap-1.5 transition-opacity shrink-0 ${selected === a.key ? "opacity-100" : "opacity-40 hover:opacity-70"}`}>
                  <span className="text-[9px] text-white/50">{a.label}</span>
                  <span className={`text-[9px] font-black tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? "+" : ""}{pr.changePct.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Session + clock + macro toggle */}
          <div className="flex items-center gap-3 pl-3 border-l border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: session.color }} />
            <span className="text-[10px] font-black uppercase" style={{ color: session.color }}>{session.label}</span>
            <span className="text-[10px] text-white/25 tabular-nums">{clock.toUTCString().slice(17, 25)} UTC</span>
            <button onClick={() => setShowMacro(v => !v)}
              className="text-[9px] font-black px-2 py-0.5 rounded border transition-all"
              style={showMacro
                ? { color: "#f59e0b", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)" }
                : { color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.08)", background: "transparent" }}>
              MACRO
            </button>
          </div>
        </div>

        {/* ── MACRO CALENDAR DROPDOWN ──────────────────────────────── */}
        {showMacro && (
          <div className="px-4 py-3 border-b border-white/[0.05] bg-black/60 shrink-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
            <MacroCalendar activePair={selected} />
          </div>
        )}

        {/* ── MAIN BODY ────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: WATCHLIST ─────────────────────────────────────── */}
          <div className="w-[168px] shrink-0 flex flex-col border-r border-white/[0.05] bg-black/30">
            <div className="px-3 py-2 border-b border-white/[0.05]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">Watchlist</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ALL_ASSETS.map(a => {
                const pr = prices[a.key];
                const up = (pr?.changePct ?? 0) >= 0;
                const isSelected = selected === a.key;
                const barW = pr ? Math.abs(pr.changePct) / maxChange : 0;
                return (
                  <button key={a.key} onClick={() => setSelected(a.key)}
                    className="w-full text-left px-3 py-2 transition-all border-l-2 hover:bg-white/[0.03]"
                    style={{
                      background: isSelected ? "rgba(255,68,68,0.06)" : "transparent",
                      borderLeftColor: isSelected ? "#ff4444" : "transparent",
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-white">{a.label}</span>
                      <span className={`text-[10px] font-black tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {pr ? `${up ? "+" : ""}${pr.changePct.toFixed(2)}%` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-white/30 tabular-nums">
                        {/* show WS price for selected, REST for others */}
                        {isSelected && tick ? tick.price.toFixed(a.dec) : (pr ? pr.price.toFixed(a.dec) : "—")}
                      </span>
                      <span className="text-[9px] text-white/15">{a.cat}</span>
                    </div>
                    <div className="mt-1 h-px bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barW * 100}%`, background: up ? "#10b981" : "#ef4444", opacity: 0.6 }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Correlations snapshot */}
            <div className="border-t border-white/[0.05] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-1.5">Correlations</div>
              {[
                { a: "DXY", b: "XAU", rel: prices["DXY"] && prices["XAUUSD"] ? (prices["DXY"].changePct * prices["XAUUSD"].changePct < 0 ? "✓ INV" : "⚠ BREAK") : "—" },
                { a: "NAS", b: "DXY", rel: prices["NAS100"] && prices["DXY"] ? (prices["NAS100"].changePct * prices["DXY"].changePct < 0 ? "✓ INV" : "⚠ BREAK") : "—" },
              ].map(c => (
                <div key={c.a + c.b} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/25">{c.a}↔{c.b}</span>
                  <span className={`text-[9px] font-black ${c.rel.startsWith("✓") ? "text-emerald-400" : "text-yellow-400"}`}>{c.rel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CENTER: CHART ────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chart header */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.05] shrink-0 bg-black/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white">{asset.label}</span>
                <span className="text-lg font-black text-white tabular-nums">{livePrice ? livePrice.toFixed(asset.dec) : "—"}</span>
                {p && (
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black ${p.changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.changePct >= 0 ? "▲" : "▼"} {Math.abs(p.changePct).toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-white/20">24h</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-white/20">Bid</span>
                <span className="font-black text-emerald-400">{liveBid.toFixed(asset.dec)}</span>
                <span className="text-white/20">Ask</span>
                <span className="font-black text-red-400">{liveAsk.toFixed(asset.dec)}</span>
              </div>
              <div className="ml-auto flex gap-0.5">
                {["1m","5m","15m","1h","4h","1D","1W"].map(t => (
                  <button key={t} onClick={() => setTf(t)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                    style={tf === t
                      ? { background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid rgba(255,68,68,0.3)" }
                      : { color: "rgba(255,255,255,0.25)", border: "1px solid transparent" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart + Drawing Tools */}
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                <MarketsChart symbol={selected} timeframe={tf} selectedTool={drawingTool} />
              </div>
              <DrawingTools symbol={selected} onToolChange={setDrawingTool} />
            </div>

            {/* Bottom stats */}
            <div className="flex items-center gap-6 px-4 py-2 border-t border-white/[0.05] bg-black/40 shrink-0 text-[10px]">
              {[
                ["Win Rate", exa.winRate != null ? `${exa.winRate}%` : "—", exa.winRate != null && exa.winRate >= 70 ? "#10b981" : "#f59e0b"],
                ["EXA Locks", `${exa.locks.filter(Boolean).length}/4`, exa.locks.filter(Boolean).length >= 3 ? "#10b981" : "#f59e0b"],
                ["Confluence", `${exa.composite}/100`, exa.composite >= 70 ? "#10b981" : exa.composite >= 50 ? "#f59e0b" : "#ef4444"],
                ["24h Gainers", `${Object.values(prices).filter((x: any) => x.changePct > 0).length}/${ALL_ASSETS.length}`, "#10b981"],
                ["Feed", source ?? "…", source === 'twelvedata' ? "#10b981" : "#f59e0b"],
              ].map(([l, v, c]: any) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="text-white/20 uppercase tracking-[0.1em]">{l}</span>
                  <span className="font-black" style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
          <div className="w-[260px] shrink-0 flex flex-col border-l border-white/[0.05] bg-black/30">

            {/* NEXUS-M Agent */}
            <div className="flex-1 flex flex-col border-b border-white/[0.05] min-h-0">
              <div className="px-3 pt-2 pb-1 border-b border-white/[0.04] shrink-0">
                <span className="text-[9px] uppercase tracking-[0.2em] text-red-400/60">AI Agent</span>
              </div>
              <div className="flex-1 min-h-0">
                <ScreenAgent agentId="NEXUS-M" agentRole="Markets Agent" glowColor="#ff4444"
                  systemContext={MARKETS_AGENT_CONTEXT} autoPrompt={MARKETS_AUTO_PROMPT} />
              </div>
            </div>

            {/* Order Book */}
            <div className="shrink-0 border-b border-white/[0.05]">
              <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">Order Book</span>
                  <span className="text-[6px] font-mono tracking-[0.15em] px-1 py-0.5 rounded border"
                    style={{ color: "#a855f7", borderColor: "rgba(168,85,247,0.35)", background: "rgba(168,85,247,0.1)" }}>
                    SIMULATED
                  </span>
                </div>
                <span className="text-[9px] text-white/15">{asset.label}</span>
              </div>
              <div className="px-2 py-2">
                <OrderBook mid={livePrice || 1} dec={asset.dec} />
              </div>
            </div>

            {/* EXA Signal Intelligence — brain only, no execution */}
            <div className="shrink-0 px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/25">EXA Signal</div>
                  <span className="text-[6px] font-mono tracking-[0.15em] px-1 py-0.5 rounded border"
                    style={{ color: "#8b5cf6", borderColor: "rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.1)" }}>
                    MODEL
                  </span>
                </div>
                {(() => {
                  const vc = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";
                  return (
                    <div className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase"
                      style={{ color: vc, borderColor: `${vc}40`, background: `${vc}10` }}>
                      {exa.verdict}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                {(() => {
                  const vc = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";
                  return (
                    <>
                      <div className="text-3xl font-black tabular-nums" style={{ color: vc }}>{exa.composite}</div>
                      <div><div className="text-[9px] text-white/20 font-mono">confluence</div><div className="text-[9px] text-white/20 font-mono">/ 100</div></div>
                      <div className="ml-auto flex flex-col gap-0.5">
                        {exa.locks.map((locked, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: locked ? "#10b981" : "#ef444440" }} />
                            <span className="text-[8px] text-white/25 font-mono">L{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Bias + lead evidence — the "why" behind the score */}
              <div className="flex items-center gap-1.5 mb-2 text-[9px] font-mono">
                <span className="px-1.5 py-0.5 rounded font-black uppercase tracking-wide"
                  style={{
                    color: exa.bias === "BULLISH" ? "#10b981" : exa.bias === "BEARISH" ? "#ef4444" : "rgba(255,255,255,0.4)",
                    background: exa.bias === "BULLISH" ? "rgba(16,185,129,0.12)" : exa.bias === "BEARISH" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                  }}>
                  {exa.bias}
                </span>
                <span className="text-white/30 truncate">{exa.factors[0]?.note ?? "warming up"}</span>
              </div>

              {(() => {
                // Direction-aware, volatility-scaled bracket. No levels when there's no edge.
                const dir = exa.bias === "BULLISH" ? 1 : exa.bias === "BEARISH" ? -1 : 0;
                const stopDist = 0.0012 * (0.6 + exa.volatility / 100); // wider in higher vol
                const tgtDist  = stopDist * 2;                          // fixed 2R
                const fmt = (x: number) => x.toFixed(asset.dec);
                return (
                  <div className="grid grid-cols-3 gap-1 mb-2 text-[9px]">
                    {[
                      ["Entry",  livePrice && dir ? fmt(livePrice) : "—", "text-white/50"],
                      ["Stop",   livePrice && dir ? fmt(livePrice * (1 - dir * stopDist)) : "—", "text-red-400/70"],
                      ["Target", livePrice && dir ? fmt(livePrice * (1 + dir * tgtDist )) : "—", "text-emerald-400/70"],
                    ].map(([l, v, c]) => (
                      <div key={l} className="text-center p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                        <div className="text-white/20 mb-0.5 font-mono uppercase">{l}</div>
                        <div className={`font-black tabular-nums ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* WARROOM PLAYBOOK INTELLIGENCE — backtested edge + live correlation confirmation */}
              <div className="mb-2 p-2 rounded-lg bg-amber-500/[0.03] border border-amber-500/[0.12]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-amber-400/70">Playbook Edge</span>
                  {exa.winRate != null && (
                    <span className="text-[9px] font-mono text-white/40">
                      WR <b className="text-emerald-400">{exa.winRate}%</b> · {exa.expectancy}
                    </span>
                  )}
                </div>
                {(() => {
                  const c = exa.confirmation;
                  const cc = c.confidence === "HIGH" ? "#10b981" : c.confidence === "MODERATE" ? "#f59e0b" : "#ef4444";
                  return (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-white/30 font-mono uppercase tracking-wide">Correlation</span>
                        <span className="text-[9px] font-black" style={{ color: cc }}>
                          {c.confirms}/{Math.max(1, c.confirms + c.denies)} · {c.confidence}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.checks.map((chk) => {
                          const flat = chk.actual === 0 || Math.abs(chk.actual) < 0.03;
                          const col = flat ? "rgba(255,255,255,0.35)" : chk.ok ? "#10b981" : "#ef4444";
                          const bg  = flat ? "rgba(255,255,255,0.04)" : chk.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";
                          return (
                            <span key={chk.asset} className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ color: col, background: bg }}
                              title={`ρ=${chk.rho} · expected ${chk.expected} · actual ${chk.actual >= 0 ? "+" : ""}${chk.actual.toFixed(2)}%${chk.derived ? " (derived)" : ""}`}>
                              {flat ? "•" : chk.ok ? "✓" : "✗"} {chk.asset}
                            </span>
                          );
                        })}
                        {exa.confirmation.checks.length === 0 && (
                          <span className="text-[8px] text-white/20 font-mono">no directional bias to confirm</span>
                        )}
                      </div>
                    </>
                  );
                })()}
                <div className="text-[8px] text-white/25 font-mono mt-1.5 leading-tight">{ASSET_BRAIN[selected]?.edge}</div>
              </div>

              {/* Real swing levels — PDH/PWH resistance (red above) · PDL/PWL support (green below) */}
              {lv && (
                <div className="mb-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Key Levels · swing liquidity</div>
                  <div className="flex flex-wrap gap-1">
                    {([["PWH", lv.pwh], ["PDH", lv.pdh], ["PDL", lv.pdl], ["PWL", lv.pwl]] as const).map(([lab, val]) => {
                      const above = livePrice ? val > livePrice : false;
                      const dist = livePrice ? Math.abs(val - livePrice) / livePrice * 100 : 0;
                      const col = above ? "#ef4444" : "#10b981";
                      return (
                        <div key={lab} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${col}12`, color: col, border: `1px solid ${col}25` }}
                          title={`${lab} ${val.toFixed(asset.dec)} · ${dist.toFixed(2)}% ${above ? "above" : "below"} price`}>
                          {lab} {val.toFixed(asset.dec)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Broker Connection Status */}
              <div className="shrink-0 px-3 py-2 border-t border-white/[0.05]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">Broker Connection</span>
                  <span className="text-[6px] font-mono tracking-[0.15em] px-1 py-0.5 rounded border"
                    style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.1)" }}>
                    NOT CONNECTED
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" style={{ boxShadow: '0 0 4px rgba(239,68,68,0.3)' }} />
                    <span className="text-[9px] text-white/40 font-mono">MT4/MT5/cTrader</span>
                  </div>
                  <span className="text-[9px] text-white/20 font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06]">NOT CONNECTED</span>
                </div>
                <div className="text-[8px] text-white/15 font-mono mt-1">
                  Chart + signals are live. Execute on your broker platform.
                </div>
              </div>

              <button
                onClick={async () => {
                  if (alertSent) return;
                  try {
                    await fetch("/api/alert", {
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        signal: (() => {
                          const dir = exa.bias === "BULLISH" ? 1 : exa.bias === "BEARISH" ? -1 : 0;
                          const stopDist = 0.0012 * (0.6 + exa.volatility / 100);
                          const tgtDist  = stopDist * 2;
                          const fmt = (x: number) => x.toFixed(asset.dec);
                          return {
                            signal: exa.verdict === "AUTHORIZED" ? "DEPLOY" : exa.verdict === "DELAY" ? "MONITOR" : "DENIED",
                            pair: selected, bias: exa.bias,
                            confluence: exa.composite, locks: exa.locks,
                            entry: livePrice && dir ? fmt(livePrice) : null,
                            sl:    livePrice && dir ? fmt(livePrice * (1 - dir * stopDist)) : null,
                            tp:    livePrice && dir ? fmt(livePrice * (1 + dir * tgtDist )) : null,
                            rr: "2.0",
                            reasoning: `${asset.label} ${exa.bias} · confluence ${exa.composite}/100, ${exa.locks.filter(Boolean).length}/4 locks. ${exa.factors[0]?.label}: ${exa.factors[0]?.note}.`,
                            session_note: getSession().label,
                          };
                        })(),
                      }),
                    });
                    setAlertSent(true);
                    setTimeout(() => setAlertSent(false), 4000);
                  } catch { /* silent */ }
                }}
                className="w-full py-1.5 rounded text-[10px] font-black uppercase tracking-wider border transition-all"
                style={alertSent
                  ? { background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }
                  : { background: "rgba(255,68,68,0.06)", borderColor: "rgba(255,68,68,0.2)", color: "rgba(255,68,68,0.7)" }}>
                {alertSent ? "✓ SENT TO TELEGRAM" : "⚡ DISPATCH TO TELEGRAM"}
              </button>
              <div className="text-[8px] text-white/15 font-mono text-center mt-1">
                Execute on MT4/MT5 — Nexus is brain only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketsScreen;
