import { useState, useEffect, useCallback } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { usePrices } from "@/hooks/usePrices";
import { useEXAScores } from "@/hooks/useEXAScores";
import alertsTexture from "@/assets/textures/real_mars.jpg";

interface AlertRule {
  id: string;
  pair: string;
  type: "price_above" | "price_below" | "confluence_above" | "session_open" | "session_close";
  condition: string;
  label: string;
  status: "WATCHING" | "TRIGGERED" | "DISMISSED";
  priority: "HIGH" | "MED" | "LOW";
  triggeredAt?: number;
}

const ALERTS_KEY = "warroom.alerts";
const ALL_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "AUDUSD", "NZDUSD", "XAUUSD", "BTCUSD", "NAS100", "SPX", "DXY"];

function loadAlerts(): AlertRule[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const PAIR_LABELS: Record<string, string> = {
  EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", GBPJPY: "GBP/JPY",
  AUDUSD: "AUD/USD", NZDUSD: "NZD/USD", XAUUSD: "XAU/USD", BTCUSD: "BTC/USD",
  NAS100: "NAS100", SPX: "SPX500", DXY: "DXY",
};

function evaluateAlerts(rules: AlertRule[], prices: Record<string, { price: number }>, exaMap: Record<string, { composite: number }>): AlertRule[] {
  return rules.map(r => {
    if (r.status !== "WATCHING") return r;
    let triggered = false;
    switch (r.type) {
      case "price_above": {
        const p = prices[r.pair]?.price;
        if (p && parseFloat(r.condition) && p >= parseFloat(r.condition)) triggered = true;
        break;
      }
      case "price_below": {
        const p = prices[r.pair]?.price;
        if (p && parseFloat(r.condition) && p <= parseFloat(r.condition)) triggered = true;
        break;
      }
      case "confluence_above": {
        const c = exaMap[r.pair]?.composite;
        if (c && parseFloat(r.condition) && c >= parseFloat(r.condition)) triggered = true;
        break;
      }
      case "session_open": {
        const h = new Date().getUTCHours();
        const target = parseInt(r.condition);
        if (h === target) triggered = true;
        break;
      }
      case "session_close": {
        const h = new Date().getUTCHours();
        const target = parseInt(r.condition);
        if (h === target) triggered = true;
        break;
      }
    }
    return triggered ? { ...r, status: "TRIGGERED" as const, triggeredAt: Date.now() } : r;
  });
}

const AlertsScreen = () => {
  const [alerts, setAlerts] = useState<AlertRule[]>(loadAlerts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pair: "XAUUSD", type: "price_above" as AlertRule["type"], condition: "", label: "", priority: "HIGH" as AlertRule["priority"] });
  const { prices } = usePrices();
  const exaMap: Record<string, { composite: number }> = {};
  for (const p of ALL_PAIRS) {
    try { exaMap[p] = { composite: 0 }; } catch {}
  }

  useEffect(() => {
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts)); } catch { /* silent */ }
  }, [alerts]);

  const tickEvaluation = useCallback(() => {
    setAlerts(prev => {
      const pricesAny = prices as any;
      const results = evaluateAlerts(prev, pricesAny, {});
      const changed = JSON.stringify(results) !== JSON.stringify(prev);
      return changed ? results : prev;
    });
  }, [prices]);

  useEffect(() => {
    const id = setInterval(tickEvaluation, 5000);
    return () => clearInterval(id);
  }, [tickEvaluation]);

  const addAlert = () => {
    if (!form.condition.trim() || !form.label.trim()) return;
    const alert: AlertRule = {
      id: `a-${Date.now()}`,
      pair: form.pair,
      type: form.type,
      condition: form.condition.trim(),
      label: form.label.trim(),
      status: "WATCHING",
      priority: form.priority,
    };
    setAlerts(prev => [alert, ...prev]);
    setShowForm(false);
    setForm({ pair: "XAUUSD", type: "price_above", condition: "", label: "", priority: "HIGH" });
  };

  const dismiss = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "DISMISSED" as const } : a));
  };

  const remove = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const triggered = alerts.filter(a => a.status === "TRIGGERED").length;
  const watching = alerts.filter(a => a.status === "WATCHING").length;

  const typeLabel = (t: AlertRule["type"]) => {
    const m: Record<string, string> = { price_above: "Price ≥", price_below: "Price ≤", confluence_above: "Confluence ≥", session_open: "Session Opens", session_close: "Session Closes" };
    return m[t] ?? t;
  };

  return (
    <PlanetPageLayout
      texture={alertsTexture}
      glowColor="#ff8800"
      bgColor="#0d0508"
      screenName="ALERT MANAGER"
      screenDesc={`${triggered} triggered · ${watching} watching · ${alerts.length} total`}
    >
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card-surface p-4 text-center">
          <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Watching</div>
          <div className="text-xl font-black text-emerald-400">{watching}</div>
        </div>
        <div className="card-surface p-4 text-center">
          <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Triggered</div>
          <div className="text-xl font-black text-orange-400">{triggered}</div>
        </div>
        <div className="card-surface p-4 text-center">
          <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Total</div>
          <div className="text-xl font-black text-white">{alerts.length}</div>
        </div>
      </div>

      {/* New Alert button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 mb-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs border border-dashed border-white/[0.12] text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
          + NEW ALERT
        </button>
      )}

      {/* New Alert form */}
      {showForm && (
        <div className="card-surface p-5 mb-4">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-3">NEW ALERT RULE</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Pair</label>
              <select value={form.pair} onChange={(e) => setForm(f => ({ ...f, pair: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25">
                {ALL_PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as AlertRule["type"] }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25">
                <option value="price_above">Price Above</option>
                <option value="price_below">Price Below</option>
                <option value="confluence_above">Confluence Above</option>
                <option value="session_open">Session Opens (UTC hour)</option>
                <option value="session_close">Session Closes (UTC hour)</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Condition</label>
              <input value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
                placeholder={form.type.includes("session") ? "e.g. 7 for London open" : "e.g. 3200 for XAUUSD"}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25" />
            </div>
            <div>
              <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as AlertRule["priority"] }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25">
                <option value="HIGH">HIGH</option>
                <option value="MED">MED</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[9px] text-white/25 font-mono uppercase block mb-1">Label</label>
            <input value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. XAUUSD resistance break"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/25" />
          </div>
          <div className="flex gap-2">
            <button onClick={addAlert}
              className="flex-1 py-2.5 rounded-xl font-black uppercase tracking-[0.15em] text-xs border transition-all"
              style={{ background: "rgba(255,136,0,0.08)", borderColor: "rgba(255,136,0,0.3)", color: "#ff8800" }}>
              ADD ALERT
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl font-black text-xs border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2.5">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-5 rounded-xl border transition-all card-surface" style={{
            background: a.status === "TRIGGERED" ? "rgba(255,136,0,0.07)" : a.status === "WATCHING" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
            borderColor: a.status === "TRIGGERED" ? "rgba(255,136,0,0.3)" : a.status === "WATCHING" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            opacity: a.status === "DISMISSED" ? 0.45 : 1,
          }}>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{
                background: a.status === "TRIGGERED" ? "#ff8800" : a.status === "WATCHING" ? "#10b981" : "rgba(255,255,255,0.2)",
                boxShadow: a.status === "TRIGGERED" ? "0 0 8px #ff880099" : "none",
              }} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black text-white">{PAIR_LABELS[a.pair] ?? a.pair}</span>
                  <span className="text-[10px] text-white/35 font-mono">{typeLabel(a.type)}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{
                    color: a.priority === "HIGH" ? "#ef4444" : a.priority === "MED" ? "#f59e0b" : "rgba(255,255,255,0.3)",
                    background: a.priority === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  }}>{a.priority}</span>
                </div>
                <div className="text-xs text-white/40 font-mono">{a.label}</div>
                {a.triggeredAt && (
                  <div className="text-[9px] text-orange-400/50 font-mono mt-1">
                    Triggered {new Date(a.triggeredAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase" style={{ color: a.status === "TRIGGERED" ? "#ff8800" : a.status === "WATCHING" ? "#10b981" : "rgba(255,255,255,0.2)" }}>
                {a.status === "TRIGGERED" ? "FIRED" : a.status}
              </span>
              {a.status === "TRIGGERED" && <button onClick={() => dismiss(a.id)} className="text-[10px] text-white/25 hover:text-white/60 font-mono border border-white/[0.08] px-2 py-1 rounded transition-colors">DISMISS</button>}
              {a.status === "DISMISSED" && <button onClick={() => remove(a.id)} className="text-[10px] text-red-400/40 hover:text-red-400 font-mono px-1">X</button>}
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-white/20 font-mono text-xs">No alerts configured. Add one above.</div>
        )}
      </div>
    </PlanetPageLayout>
  );
};

export default AlertsScreen;
