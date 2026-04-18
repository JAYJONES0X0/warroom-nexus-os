import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import alertsTexture from "@/assets/textures/alerts-realistic.jpg";

const INITIAL = [
  { id: 1, asset: "EUR/USD", type: "Price Level", condition: "Price reaches 1.0900", status: "WATCHING", priority: "HIGH" },
  { id: 2, asset: "XAU/USD", type: "Session Open", condition: "London killzone start (09:00 UTC)", status: "TRIGGERED", priority: "MED" },
  { id: 3, asset: "BTC/USD", type: "Confluence", condition: "3+ locks confirmed on H4", status: "WATCHING", priority: "HIGH" },
  { id: 4, asset: "GBP/USD", type: "Liquidity Sweep", condition: "Daily high swept above 1.2800", status: "WATCHING", priority: "MED" },
  { id: 5, asset: "NAS100", type: "Price Level", condition: "Drops below 17,500 support", status: "IDLE", priority: "LOW" },
  { id: 6, asset: "USD/JPY", type: "Trend Alert", condition: "H4 bearish structure confirmed", status: "TRIGGERED", priority: "HIGH" },
];

const AlertsScreen = () => {
  const [alerts, setAlerts] = useState(INITIAL);
  const triggered = alerts.filter((a) => a.status === "TRIGGERED").length;
  const dismiss = (id: number) => setAlerts((p) => p.map((a) => a.id === id ? { ...a, status: "IDLE" } : a));
  return (
    <PlanetPageLayout
      texture={alertsTexture}
      glowColor="#ff8800"
      bgColor="#0a0400"
      screenName="ALERT MANAGER"
      screenDesc={`${triggered} triggered · ${alerts.length} total · Real-time confluence triggers`}
    >
      <div className="space-y-2.5">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-5 rounded-xl border transition-all" style={{
            background: a.status === "TRIGGERED" ? "rgba(255,136,0,0.07)" : a.status === "WATCHING" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
            borderColor: a.status === "TRIGGERED" ? "rgba(255,136,0,0.3)" : a.status === "WATCHING" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            opacity: a.status === "IDLE" ? 0.45 : 1,
          }}>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{
                background: a.status === "TRIGGERED" ? "#ff8800" : a.status === "WATCHING" ? "#10b981" : "rgba(255,255,255,0.2)",
                boxShadow: a.status === "TRIGGERED" ? "0 0 8px #ff880099" : "none",
              }} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black text-white">{a.asset}</span>
                  <span className="text-[10px] text-white/35 font-mono">{a.type}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{
                    color: a.priority === "HIGH" ? "#ef4444" : a.priority === "MED" ? "#f59e0b" : "rgba(255,255,255,0.3)",
                    background: a.priority === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  }}>{a.priority}</span>
                </div>
                <div className="text-xs text-white/40 font-mono">{a.condition}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase" style={{ color: a.status === "TRIGGERED" ? "#ff8800" : a.status === "WATCHING" ? "#10b981" : "rgba(255,255,255,0.2)" }}>{a.status}</span>
              {a.status === "TRIGGERED" && <button onClick={() => dismiss(a.id)} className="text-[10px] text-white/25 hover:text-white/60 font-mono border border-white/[0.08] px-2 py-1 rounded transition-colors">DISMISS</button>}
            </div>
          </div>
        ))}
      </div>
    </PlanetPageLayout>
  );
};

export default AlertsScreen;
