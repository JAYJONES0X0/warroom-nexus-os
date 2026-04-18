import { useState } from "react";
import { PlanetOrb } from "@/components/PlanetOrb";
import alertsTexture from "@/assets/textures/alerts-realistic.jpg";

const ALERTS = [
  { id: 1, asset: "EUR/USD", type: "Price Level", condition: "Price reaches 1.0900", status: "WATCHING", priority: "HIGH" },
  { id: 2, asset: "XAU/USD", type: "Session Open", condition: "London killzone start (09:00 UTC)", status: "TRIGGERED", priority: "MED" },
  { id: 3, asset: "BTC/USD", type: "Confluence", condition: "3+ locks confirmed on H4", status: "WATCHING", priority: "HIGH" },
  { id: 4, asset: "GBP/USD", type: "Liquidity Sweep", condition: "Daily high swept above 1.2800", status: "WATCHING", priority: "MED" },
  { id: 5, asset: "NAS100", type: "Price Level", condition: "Drops below 17,500 support", status: "IDLE", priority: "LOW" },
  { id: 6, asset: "USD/JPY", type: "Trend Alert", condition: "H4 bearish structure confirmed", status: "TRIGGERED", priority: "HIGH" },
];

const AlertsScreen = () => {
  const [alerts, setAlerts] = useState(ALERTS);
  const triggered = alerts.filter((a) => a.status === "TRIGGERED").length;

  const dismiss = (id: number) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "IDLE" } : a));

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
      <PlanetOrb texture={alertsTexture} glowColor="#ff8800" label="NEXUS" />
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
        <div className="text-3xl font-black tracking-wider">ALERT MANAGER</div>
        <div className="text-sm text-white/40 font-mono mt-1">{triggered} triggered · {alerts.length} total alerts</div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] mx-auto space-y-3">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-center justify-between p-5 rounded-xl border transition-all ${
              a.status === "TRIGGERED" ? "bg-orange-500/[0.08] border-orange-500/30" :
              a.status === "WATCHING" ? "bg-white/[0.02] border-white/[0.06]" :
              "bg-white/[0.01] border-white/[0.03] opacity-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${
                a.status === "TRIGGERED" ? "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" :
                a.status === "WATCHING" ? "bg-emerald-400" : "bg-white/20"
              }`} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black text-white">{a.asset}</span>
                  <span className="text-[10px] text-white/40 font-mono">{a.type}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    a.priority === "HIGH" ? "bg-red-500/15 text-red-400" :
                    a.priority === "MED" ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-white/[0.05] text-white/30"
                  }`}>{a.priority}</span>
                </div>
                <div className="text-xs text-white/50 font-mono">{a.condition}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-black uppercase ${
                a.status === "TRIGGERED" ? "text-orange-400" :
                a.status === "WATCHING" ? "text-emerald-400" : "text-white/20"
              }`}>{a.status}</span>
              {a.status === "TRIGGERED" && (
                <button
                  onClick={() => dismiss(a.id)}
                  className="text-[10px] text-white/30 hover:text-white/60 font-mono border border-white/[0.08] px-2 py-1 rounded transition-colors"
                >
                  DISMISS
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsScreen;
