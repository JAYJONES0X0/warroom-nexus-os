import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePrices } from "@/hooks/usePrices";
import { usePriceTick } from "@/hooks/usePriceTick";
import { useEXAScores } from "@/hooks/useEXAScores";
import { ScreenAgent } from "@/components/ScreenAgent";
import { MacroCalendar } from "@/components/MacroCalendar";

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

const TF_MAP: Record<string, string> = {
  "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1D": "D", "1W": "W",
};
const TV_SYM: Record<string, string> = {
  EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY", GBPJPY: "FX:GBPJPY",
  AUDUSD: "FX:AUDUSD", NZDUSD: "FX:NZDUSD", XAUUSD: "TVC:GOLD",
  BTCUSD: "BITSTAMP:BTCUSD", NAS100: "CAPITALCOM:US100", SPX: "SP:SPX", DXY: "TVC:DXY",
};

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

// ─── TradingView ─────────────────────────────────────────────────────────────
const TradingViewChart = ({ symbol, tf }: { symbol: string; tf: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize: true, symbol: TV_SYM[symbol] || "FX:EURUSD",
      interval: TF_MAP[tf] || "60", timezone: "Etc/UTC",
      theme: "dark", style: "1", locale: "en",
      gridColor: "rgba(255,255,255,0.03)", backgroundColor: "rgba(0,0,0,0)",
      hide_top_toolbar: false, hide_legend: false, save_image: false, hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    ref.current.appendChild(s);
  }, [symbol, tf]);
  return (
    <div ref={ref} className="tradingview-widget-container w-full h-full">
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
};

// ─── Order Book ───────────────────────────────────────────────────────────────
const OrderBook = ({ mid, dec }: { mid: number; dec: number }) => {
  const step = dec >= 4 ? 0.0001 : dec === 3 ? 0.001 : dec === 2 ? 0.1 : 1;
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: (mid + step * (i + 1)).toFixed(dec),
    size: (Math.random() * 3 + 0.2).toFixed(2),
    pct: Math.random() * 0.7 + 0.05,
  }));
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: (mid - step * i).toFixed(dec),
    size: (Math.random() * 3 + 0.2).toFixed(2),
    pct: Math.random() * 0.7 + 0.05,
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
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const MarketsScreen = () => {
  const navigate   = useNavigate();
  const { prices, source } = usePrices();
  const [selected, setSelected]  = useState("XAUUSD");
  const [tf, setTf]              = useState("1h");
  const [alertSent, setAlertSent] = useState(false);
  const [showMacro, setShowMacro] = useState(false);
  const [clock, setClock]        = useState(new Date());

  const tick = usePriceTick(selected);   // real-time WS tick (selected pair)
  const exa  = useEXAScores(selected);

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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#020508]" style={{ fontFamily: "monospace" }}>
      <div className="absolute inset-0 z-10 flex flex-col">

        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 px-3 h-9 border-b shrink-0"
          style={{ borderColor: "rgba(255,68,68,0.12)", background: "rgba(0,0,0,0.3)" }}>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/70 transition-colors pr-4 border-r border-white/[0.06] mr-3 h-full uppercase tracking-[0.15em]">
            ← NEXUS
          </button>

          <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: "#ff4444", boxShadow: "0 0 8px #ff4444" }} />
          <span className="text-[11px] font-black tracking-[0.2em] text-red-400 mr-4">GLOBAL MARKETS</span>

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

            {/* Chart */}
            <div className="flex-1 min-h-0">
              <TradingViewChart symbol={selected} tf={tf} />
            </div>

            {/* Bottom stats */}
            <div className="flex items-center gap-6 px-4 py-2 border-t border-white/[0.05] bg-black/40 shrink-0 text-[10px]">
              {[
                ["Session WR", session.label.includes("LONDON") ? "67%" : session.label.includes("NY") ? "64%" : session.label.includes("ASIA") ? "72%" : "—", session.color],
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
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/25">Order Book</span>
                <span className="text-[9px] text-white/15">{asset.label}</span>
              </div>
              <div className="px-2 py-2">
                <OrderBook mid={livePrice || 1} dec={asset.dec} />
              </div>
            </div>

            {/* EXA Signal Intelligence — brain only, no execution */}
            <div className="shrink-0 px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/25">EXA Signal</div>
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

              <div className="grid grid-cols-3 gap-1 mb-2 text-[9px]">
                {[
                  ["Entry", livePrice ? (livePrice * 0.9998).toFixed(asset.dec) : "—", "text-white/50"],
                  ["Stop",  livePrice ? (livePrice * 0.9985).toFixed(asset.dec) : "—", "text-red-400/70"],
                  ["Target",livePrice ? (livePrice * 1.003 ).toFixed(asset.dec) : "—", "text-emerald-400/70"],
                ].map(([l, v, c]) => (
                  <div key={l} className="text-center p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-white/20 mb-0.5 font-mono uppercase">{l}</div>
                    <div className={`font-black tabular-nums ${c}`}>{v}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={async () => {
                  if (alertSent) return;
                  try {
                    await fetch("/api/alert", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        signal: {
                          signal: exa.verdict === "AUTHORIZED" ? "DEPLOY" : exa.verdict === "DELAY" ? "MONITOR" : "DENIED",
                          pair: selected, bias: "NEUTRAL",
                          confluence: exa.composite, locks: exa.locks,
                          entry:  livePrice ? (livePrice * 0.9998).toFixed(asset.dec) : null,
                          sl:     livePrice ? (livePrice * 0.9985).toFixed(asset.dec) : null,
                          tp:     livePrice ? (livePrice * 1.003 ).toFixed(asset.dec) : null,
                          rr: "2.0",
                          reasoning: `${asset.label} EXA confluence ${exa.composite}/100. Locks: ${exa.locks.filter(Boolean).length}/4.`,
                          session_note: getSession().label,
                        },
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
