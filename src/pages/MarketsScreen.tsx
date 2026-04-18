import { useState, useEffect, useRef } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { usePrices } from "@/hooks/usePrices";
import marketsTexture from "@/assets/textures/markets-realistic.jpg";

const WATCHLIST = [
  { key: "GBPUSD", label: "GBP/USD", category: "Forex", dec: 4 },
  { key: "EURUSD", label: "EUR/USD", category: "Forex", dec: 4 },
  { key: "USDJPY", label: "USD/JPY", category: "Forex", dec: 3 },
  { key: "XAUUSD", label: "XAU/USD", category: "Commodity", dec: 2 },
  { key: "BTCUSD", label: "BTC/USD", category: "Crypto", dec: 0 },
  { key: "SPX",    label: "SPX500",  category: "Index", dec: 0 },
];

const TIMEFRAMES = ["1m","5m","15m","1h","4h","1D","1W"];

function getSession() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10)  return { label: "LONDON OPEN",    color: "#10b981" };
  if (h >= 12 && h < 15) return { label: "NEW YORK OPEN",  color: "#0099ff" };
  if (h >= 0 && h < 7)   return { label: "ASIAN SESSION",  color: "#aa44ff" };
  return { label: "INTER-SESSION", color: "rgba(255,255,255,0.4)" };
}

const TradingViewChart = ({ symbol, tf }: { symbol: string; tf: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLScriptElement | null>(null);

  const tvSymbol: Record<string, string> = {
    GBPUSD: "FX:GBPUSD", EURUSD: "FX:EURUSD", USDJPY: "FX:USDJPY",
    XAUUSD: "TVC:GOLD", BTCUSD: "BITSTAMP:BTCUSD", SPX: "SP:SPX",
  };

  const tvInterval: Record<string, string> = {
    "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1D": "D", "1W": "W",
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol[symbol] || "FX:GBPUSD",
      interval: tvInterval[tf] || "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      gridColor: "rgba(255,255,255,0.03)",
      backgroundColor: "rgba(0,0,0,0)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    containerRef.current.appendChild(script);
    widgetRef.current = script;
  }, [symbol, tf]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
};

const MarketDepth = ({ bid, spread }: { bid: number; spread: number }) => {
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: (bid + spread * (i + 1) * 0.0001).toFixed(4),
    amount: (Math.random() * 2 + 0.3).toFixed(1),
    total: (Math.random() * 3 + 0.5).toFixed(2),
    pct: Math.random() * 0.7 + 0.1,
  }));
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: (bid - i * 0.0001).toFixed(4),
    amount: (Math.random() * 2 + 0.3).toFixed(1),
    total: (Math.random() * 3 + 0.5).toFixed(2),
    pct: Math.random() * 0.7 + 0.1,
  }));
  return (
    <div className="mt-4">
      <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono mb-3">MARKET DEPTH</div>
      <div className="space-y-0.5 text-[11px] font-mono">
        <div className="grid grid-cols-3 text-[9px] text-white/25 uppercase mb-1 px-1">
          <span>PRICE</span><span className="text-center">AMOUNT</span><span className="text-right">TOTAL</span>
        </div>
        {asks.reverse().map((a, i) => (
          <div key={i} className="relative grid grid-cols-3 px-1 py-0.5 rounded">
            <div className="absolute inset-0 rounded" style={{ background: `rgba(239,68,68,${a.pct * 0.15})`, width: `${a.pct * 100}%` }} />
            <span className="relative text-red-400">{a.price}</span>
            <span className="relative text-center text-white/50">{a.amount}</span>
            <span className="relative text-right text-white/40">{a.total}</span>
          </div>
        ))}
        <div className="text-center text-white font-black py-1.5 text-sm border-y border-white/[0.06] my-1">
          {bid.toFixed(4)}
        </div>
        {bids.map((b, i) => (
          <div key={i} className="relative grid grid-cols-3 px-1 py-0.5 rounded">
            <div className="absolute inset-0 rounded" style={{ background: `rgba(16,185,129,${b.pct * 0.15})`, width: `${b.pct * 100}%` }} />
            <span className="relative text-emerald-400">{b.price}</span>
            <span className="relative text-center text-white/50">{b.amount}</span>
            <span className="relative text-right text-white/40">{b.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketsScreen = () => {
  const { prices, loading } = usePrices();
  const [selected, setSelected] = useState("GBPUSD");
  const [tf, setTf] = useState("1h");
  const [lots, setLots] = useState("0.10");
  const session = getSession();

  const selectedPair = WATCHLIST.find((w) => w.key === selected)!;
  const p = prices[selected];
  const spread = selected.includes("JPY") ? 0.2 : selected === "XAUUSD" ? 0.3 : 0.8;
  const bid = p?.price ?? 0;
  const ask = bid + spread * 0.0001;

  const gainers = Object.values(prices).filter((x) => x.changePct > 0).length;
  const losers  = Object.values(prices).filter((x) => x.changePct < 0).length;
  const maxVol  = Math.max(...Object.values(prices).map((x) => Math.abs(x.changePct)));

  const topMovers = [...WATCHLIST]
    .map((w) => ({ ...w, p: prices[w.key] }))
    .filter((w) => w.p)
    .sort((a, b) => Math.abs(b.p!.changePct) - Math.abs(a.p!.changePct))
    .slice(0, 3);

  return (
    <PlanetPageLayout
      texture={marketsTexture}
      glowColor="#ff4444"
      bgColor="#0f0000"
      screenName="GLOBAL MARKETS"
      screenDesc="Real-time market data · 24/5 Trading Sessions · Live Execution"
    >
      {/* Header stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Volume</div>
          <div className="text-xl font-black text-white">$12.4T</div>
          <div className="text-xs text-emerald-400 font-mono mt-0.5">+8.2% today</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Gainers</div>
          <div className="text-xl font-black text-white">{loading ? "—" : gainers}</div>
          <div className="text-xs text-white/30 font-mono mt-0.5">vs {loading ? "—" : losers} losers</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Active Pairs</div>
          <div className="text-xl font-black text-white">43</div>
          <div className="text-xs text-white/30 font-mono mt-0.5">across all sessions</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Spread Avg</div>
          <div className="text-xl font-black text-white">0.8 pips</div>
          <div className="text-xs text-emerald-400 font-mono mt-0.5">Low latency</div>
        </div>
      </div>

      {/* Session status bar */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: session.color, boxShadow: `0 0 6px ${session.color}` }} />
        <span className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: session.color }}>{session.label}</span>
        <div className="w-px h-4 bg-white/[0.08] mx-1" />
        <span className="text-[10px] text-white/30 font-mono">{new Date().toUTCString().slice(17, 22)} UTC</span>
        <div className="ml-auto">
          <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider">
            Volatility: <span className="text-white/60">{maxVol > 0 ? (maxVol * 20).toFixed(0) : "—"}/100</span>
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-[220px,1fr,220px] gap-4">
        {/* LEFT: Watchlist + Top Movers */}
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-black text-white/60 uppercase tracking-wider">Watchlist</span>
            </div>
            <input placeholder="Search symbols..." className="w-full bg-transparent px-4 py-2.5 text-xs font-mono text-white/50 border-b border-white/[0.05] focus:outline-none placeholder:text-white/20" />
            <div className="divide-y divide-white/[0.04]">
              {WATCHLIST.map((w) => {
                const pr = prices[w.key];
                const up = (pr?.changePct ?? 0) > 0;
                const flat = Math.abs(pr?.changePct ?? 0) < 0.02;
                const cc = flat ? "text-white/40" : up ? "text-emerald-400" : "text-red-400";
                const isSelected = selected === w.key;
                return (
                  <div
                    key={w.key}
                    onClick={() => setSelected(w.key)}
                    className="px-4 py-3 cursor-pointer transition-all"
                    style={{ background: isSelected ? "rgba(16,185,129,0.07)" : "transparent", borderLeft: isSelected ? "2px solid #10b981" : "2px solid transparent" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">{w.label}</span>
                      <span className={`text-xs font-black ${cc}`}>{pr ? `${up && !flat ? "+" : ""}${pr.changePct.toFixed(2)}%` : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs font-mono text-white/40">{pr ? pr.price.toFixed(w.dec) : "—"}</span>
                      <span className="text-[10px] text-white/20 font-mono">$2.4B</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Movers */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-black text-white/60 uppercase tracking-wider">Top Movers</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {topMovers.map((w, i) => (
                <div key={w.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-white">{w.label}</div>
                    <div className="text-[10px] text-white/30 font-mono">{w.category}</div>
                  </div>
                  <div className={`text-xs font-black ${(w.p?.changePct ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(w.p?.changePct ?? 0) > 0 ? "↗" : "↘"} {Math.abs(w.p?.changePct ?? 0).toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Chart */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
          {/* Chart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-4">
              <span className="text-lg font-black text-white">{selectedPair.label}</span>
              <span className="text-xl font-black text-white font-mono">{p ? p.price.toFixed(selectedPair.dec) : "—"}</span>
              {p && (
                <span className={`text-xs font-black px-2 py-0.5 rounded ${p.changePct > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                  {p.changePct > 0 ? "+" : ""}{p.changePct.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {TIMEFRAMES.map((t) => (
                <button key={t} onClick={() => setTf(t)}
                  className="px-2.5 py-1 rounded text-[11px] font-bold transition-all"
                  style={tf === t ? { background: "rgba(16,185,129,0.15)", color: "#10b981" } : { color: "rgba(255,255,255,0.35)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* TradingView chart */}
          <div className="flex-1 min-h-[420px]">
            <TradingViewChart symbol={selected} tf={tf} />
          </div>
        </div>

        {/* RIGHT: Quick Trade + Market Depth */}
        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="text-xs font-black text-white/60 uppercase tracking-wider mb-3">Quick Trade</div>
            <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Pair</div>
            <div className="text-base font-black text-white mb-4">{selectedPair.label}</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-[10px] text-white/30 uppercase font-mono mb-1">BID</div>
                <div className="text-lg font-black text-emerald-400 font-mono">{bid.toFixed(selectedPair.dec)}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/30 uppercase font-mono mb-1">ASK</div>
                <div className="text-lg font-black text-red-400 font-mono">{ask.toFixed(selectedPair.dec)}</div>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-[10px] text-white/30 uppercase font-mono mb-1">Lot Size</div>
              <input value={lots} onChange={(e) => setLots(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-3 rounded-xl font-black text-sm uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 transition-all">BUY</button>
              <button className="py-3 rounded-xl font-black text-sm uppercase tracking-wider bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all">SELL</button>
            </div>
          </div>

          <MarketDepth bid={bid} spread={spread} />
        </div>
      </div>
    </PlanetPageLayout>
  );
};

export default MarketsScreen;
