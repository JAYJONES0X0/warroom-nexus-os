import { useState, useEffect, useCallback } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useEXAScores } from "@/hooks/useEXAScores";
import { useKeyLevels } from "@/hooks/useKeyLevels";
import { usePrices } from "@/hooks/usePrices";
import executionTexture from "@/assets/textures/real_jupiter.jpg";

const PAIRS = ["EURUSD","XAUUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","NAS100","BTCUSD"];

const LOCKS_META = [
  { id:1, name:"Structure",      desc:"HTF trend aligned with bias. Weekly/Daily confirms direction." },
  { id:2, name:"Liquidity",      desc:"Liquidity pool swept or price at institutional draw." },
  { id:3, name:"Session Timing", desc:"London or NY killzone active. Dead zone = no signal." },
  { id:4, name:"Confirmation",   desc:"LTF CHoCH + BOS confirmed. Displacement present." },
];

interface PaperTrade {
  id: string;
  pair: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stop: number;
  target: number;
  size: number; // units
  openedAt: string;
  closedAt?: string;
  exitPrice?: number;
  pnl?: number;
  status: "OPEN" | "CLOSED";
}

const PAPER_KEY = "warroom.paper_trades";

function loadTrades(): PaperTrade[] {
  try {
    const s = localStorage.getItem(PAPER_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveTrades(trades: PaperTrade[]) {
  try { localStorage.setItem(PAPER_KEY, JSON.stringify(trades)); } catch {}
}

function PaperTradingPanel({ prices }: { prices: Record<string, { price: number }> }) {
  const [trades, setTrades] = useState<PaperTrade[]>(loadTrades);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pair: "EURUSD", direction: "LONG" as "LONG" | "SHORT", entry: "", stop: "", target: "", size: "1000" });

  const openTrades = trades.filter(t => t.status === "OPEN");
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closedTrades.length ? Math.round(closedTrades.filter(t => (t.pnl ?? 0) > 0).length / closedTrades.length * 100) : 0;

  useEffect(() => { saveTrades(trades); }, [trades]);

  const open = useCallback(() => {
    const entry = parseFloat(form.entry);
    const stop = parseFloat(form.stop);
    const target = parseFloat(form.target);
    const size = parseFloat(form.size);
    if (!entry || !stop || !target || !size) return;
    const trade: PaperTrade = {
      id: Date.now().toString(36),
      pair: form.pair,
      direction: form.direction,
      entry, stop, target, size,
      openedAt: new Date().toISOString(),
      status: "OPEN",
    };
    setTrades(prev => [trade, ...prev]);
    setShowForm(false);
    setForm({ pair: "EURUSD", direction: "LONG", entry: "", stop: "", target: "", size: "1000" });
  }, [form]);

  const close = useCallback((id: string) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id || t.status !== "OPEN") return t;
      const live = prices[t.pair]?.price;
      if (!live) return t;
      const dir = t.direction === "LONG" ? 1 : -1;
      const pnl = dir * (live - t.entry) / t.entry * t.size;
      return { ...t, status: "CLOSED" as const, exitPrice: live, pnl, closedAt: new Date().toISOString() };
    }));
  }, [prices]);

  const closeAll = useCallback(() => {
    setTrades(prev => prev.map(t => {
      if (t.status !== "OPEN") return t;
      const live = prices[t.pair]?.price;
      if (!live) return t;
      const dir = t.direction === "LONG" ? 1 : -1;
      const pnl = dir * (live - t.entry) / t.entry * t.size;
      return { ...t, status: "CLOSED" as const, exitPrice: live, pnl, closedAt: new Date().toISOString() };
    }));
  }, [prices]);

  const clearHistory = useCallback(() => {
    setTrades(prev => prev.filter(t => t.status === "OPEN"));
  }, []);

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs text-white/40 uppercase tracking-[0.2em] font-mono">PAPER TRADING</div>
        <div className="flex items-center gap-3">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1">
            <span className="text-[10px] text-white/30 font-mono">P&L </span>
            <span className={`text-xs font-black ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1">
            <span className="text-[10px] text-white/30 font-mono">WR </span>
            <span className="text-xs font-black text-white">{winRate}%</span>
          </div>
        </div>
      </div>

      {/* Open positions */}
      {openTrades.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-white/25 font-mono uppercase tracking-wider">OPEN POSITIONS ({openTrades.length})</div>
            <button onClick={closeAll} className="text-[9px] font-mono uppercase tracking-wider text-red-400/60 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-2 py-0.5 transition-all">
              CLOSE ALL
            </button>
          </div>
          <div className="space-y-1.5">
            {openTrades.map(t => {
              const live = prices[t.pair]?.price;
              const dir = t.direction === "LONG" ? 1 : -1;
              const pnl = live ? dir * (live - t.entry) / t.entry * t.size : 0;
              const pnlPct = live ? ((live - t.entry) / t.entry) * 100 * dir : 0;
              const dec = t.pair.includes("JPY") ? 3 : t.pair === "XAUUSD" ? 2 : t.pair === "NAS100" || t.pair === "BTCUSD" ? 0 : 4;
              return (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="text-xs font-black text-white/80">{t.pair}</span>
                    <span className={`text-[9px] font-black uppercase ${t.direction === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.direction === "LONG" ? "▲" : "▼"} {t.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-white/40 flex-1">
                    <span>Entry: {t.entry.toFixed(dec)}</span>
                    <span>Stop: {t.stop.toFixed(dec)}</span>
                    <span>Target: {t.target.toFixed(dec)}</span>
                    <span>Size: {t.size}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-xs font-black ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </div>
                      <div className={`text-[9px] font-mono ${pnlPct >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                      </div>
                    </div>
                    <button onClick={() => close(t.id)} className="text-[9px] font-mono text-white/30 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg px-2 py-1 transition-all">
                      CLOSE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed trades summary */}
      {closedTrades.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-white/25 font-mono uppercase tracking-wider">TRADE HISTORY ({closedTrades.length})</div>
            <button onClick={clearHistory} className="text-[9px] font-mono uppercase tracking-wider text-white/30 hover:text-white/60 rounded-lg px-2 py-0.5 transition-all">
              CLEAR
            </button>
          </div>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {closedTrades.slice(0, 20).map(t => {
              const live = prices[t.pair]?.price;
              const dec = t.pair.includes("JPY") ? 3 : t.pair === "XAUUSD" ? 2 : t.pair === "NAS100" || t.pair === "BTCUSD" ? 0 : 4;
              return (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                  <span className="text-[9px] font-black text-white/50 min-w-[50px]">{t.pair}</span>
                  <span className={`text-[9px] font-black ${(t.pnl ?? 0) >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>
                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toFixed(2)}
                  </span>
                  <span className="text-[9px] font-mono text-white/25">{t.direction}</span>
                  <span className="text-[9px] font-mono text-white/20">{t.entry.toFixed(dec)} → {t.exitPrice?.toFixed(dec)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New trade form */}
      {showForm ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider mb-2">NEW PAPER TRADE</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">PAIR</label>
              <select value={form.pair} onChange={e => setForm(f => ({ ...f, pair: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#D48A3C]/40">
                {PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">DIRECTION</label>
              <div className="flex gap-1">
                {["LONG", "SHORT"].map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, direction: d as "LONG" | "SHORT" }))}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                      form.direction === d
                        ? d === "LONG" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-red-500/15 border-red-500/30 text-red-400"
                        : "bg-white/[0.02] border-white/[0.06] text-white/30"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">SIZE (UNITS)</label>
              <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#D48A3C]/40" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">ENTRY PRICE</label>
              <input value={form.entry} onChange={e => setForm(f => ({ ...f, entry: e.target.value }))} placeholder="0.00"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#D48A3C]/40" />
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">STOP LOSS</label>
              <input value={form.stop} onChange={e => setForm(f => ({ ...f, stop: e.target.value }))} placeholder="0.00"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#D48A3C]/40" />
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono block mb-1">TAKE PROFIT</label>
              <input value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="0.00"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#D48A3C]/40" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={open} className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(212,138,60,0.12)", borderColor: "rgba(212,138,60,0.35)", color: "#D48A3C" }}>
              OPEN PAPER TRADE
            </button>
            <button onClick={() => setShowForm(false)} className="py-2 px-4 rounded-xl text-[10px] font-mono text-white/30 border border-white/[0.06] hover:bg-white/[0.03] transition-all">
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] border border-dashed transition-all hover:-translate-y-0.5"
          style={{ background: "rgba(212,138,60,0.06)", borderColor: "rgba(212,138,60,0.2)", color: "#D48A3C" }}>
          + OPEN PAPER TRADE
        </button>
      )}

      <div className="text-[9px] font-mono text-white/15 text-center mt-2">
        P&L calculated against live prices. All trades are simulated — no real capital involved.
      </div>
    </div>
  );
}

const EXALocksGate = ({ liveLocks }: { liveLocks: boolean[] }) => {
  const locks   = liveLocks;
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
            className="flex items-center gap-4 p-3 rounded-xl transition-all border"
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
  const { levels } = useKeyLevels();
  const lv  = levels[pair];
  const p   = prices[pair];
  const dec = pair.includes("JPY") ? 3 : pair === "XAUUSD" ? 2 : pair === "NAS100" || pair === "BTCUSD" ? 0 : 4;
  const vc  = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";

  const dir = exa.bias === "BULLISH" ? 1 : exa.bias === "BEARISH" ? -1 : 0;
  const fmt = (n: number) => n.toFixed(dec);
  let entry = "—", stop = "—", target = "—";
  let stopSub = "—", tgtSub = "—", entrySub = "no directional bias — stand aside";
  if (p && dir) {
    entry = fmt(p.price);
    entrySub = `${exa.bias} @ live`;
    if (lv) {
      stop   = dir > 0 ? fmt(lv.pdl) : fmt(lv.pdh);
      target = dir > 0 ? fmt(lv.pwh) : fmt(lv.pwl);
      stopSub = dir > 0 ? "prev-day low" : "prev-day high";
      tgtSub  = dir > 0 ? "prior-week high" : "prior-week low";
    } else {
      const sd = 0.0012 * (0.6 + exa.volatility / 100);
      stop   = fmt(p.price * (1 - dir * sd));
      target = fmt(p.price * (1 + dir * sd * 2));
      stopSub = tgtSub = "vol-scaled (levels loading)";
    }
  }

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

      <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        {([
          ["Entry Zone",  entry,  "text-white/80",      entrySub],
          ["Stop Level",  stop,   "text-red-400/80",    stopSub],
          ["Target Level",target, "text-emerald-400/80", tgtSub],
        ] as const).map(([l,v,c,sub]) => (
          <div key={l} className="text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">{l}</div>
            <div className={`text-sm font-black ${c} tabular-nums`}>{v}</div>
            <div className="text-[9px] text-white/20 font-mono">{sub}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-white/25 font-mono text-center border border-white/[0.05] rounded-lg py-2 bg-white/[0.01]">
        Levels from real prior-day/week swings — confirm on your chart before executing on MT4/MT5
      </div>
    </div>
  );
};

const ExecutionScreen = () => {
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const exa = useEXAScores(selectedPair);
  const vc  = exa.verdict === "AUTHORIZED" ? "#10b981" : exa.verdict === "DELAY" ? "#f59e0b" : "#ef4444";
  const { prices } = usePrices();

  return (
    <PlanetPageLayout
      texture={executionTexture}
      glowColor="#ffdd00"
      bgColor="#0d0a05"
      screenName="EXECUTION CENTER"
      screenDesc="Signal intelligence · EXA confluence scoring · 4-LOCKS gate · Paper trading · Reference levels"
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

      {/* Paper trading */}
      <PaperTradingPanel prices={prices} />

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
        <div className="text-[10px] font-mono text-white/20 text-center leading-relaxed">
          WARROOM NEXUS is an intelligence layer. All signals are for informational purposes.<br />
          Execute trades through your own broker platform (MT4/MT5/cTrader). Paper trades are simulated.
        </div>
      </div>
    </PlanetPageLayout>
  );
};

export default ExecutionScreen;
