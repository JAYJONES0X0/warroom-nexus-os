import { useState } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import settingsTexture from "@/assets/textures/settings-realistic.jpg";

const SettingsScreen = () => {
  const [risk, setRisk] = useState("1.0");
  const [maxDD, setMaxDD] = useState("5.0");
  const [session, setSession] = useState("London+NY");
  const [mode, setMode] = useState<"Paper" | "Live">("Paper");
  const [groqKey, setGroqKey] = useState("gsk_••••••••••••••••••••••••");
  return (
    <PlanetPageLayout
      texture={settingsTexture}
      glowColor="#00ff88"
      bgColor="#000a05"
      screenName="SETTINGS"
      screenDesc="Risk parameters · Session config · API keys · Trading mode"
    >
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">TRADING MODE</div>
          <div className="flex gap-3">
            {(["Paper","Live"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all border" style={mode === m
                ? { background: m === "Live" ? "rgba(239,68,68,0.12)" : "rgba(0,255,136,0.1)", borderColor: m === "Live" ? "rgba(239,68,68,0.4)" : "rgba(0,255,136,0.35)", color: m === "Live" ? "#ef4444" : "#00ff88" }
                : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
                {m === "Live" ? "⚡ " : "📋 "}{m}
              </button>
            ))}
          </div>
          {mode === "Live" && <div className="mt-3 p-3 bg-red-500/[0.07] border border-red-500/20 rounded-lg text-xs text-red-400/80 font-mono">⚠ Live mode uses real capital. Verify all risk parameters first.</div>}
        </div>

        {/* Risk */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">RISK MANAGEMENT</div>
          <div className="grid grid-cols-2 gap-4">
            {[["Risk Per Trade (%)", risk, setRisk, "Max 2% recommended"], ["Max Daily Drawdown (%)", maxDD, setMaxDD, "Hard stop at this level"]].map(([l, v, set, hint]: any) => (
              <div key={l}>
                <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">{l}</label>
                <input value={v} onChange={(e) => set(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40 mb-1" />
                <div className="text-[10px] text-white/20 font-mono">{hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Session */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">SESSION CONFIG</div>
          <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">Active Sessions</label>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40">
            {["London","NY","London+NY","Asian","All Sessions"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* API */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">API KEYS</div>
          <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">Groq API Key</label>
          <input type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40" />
        </div>

        <button className="w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm transition-all hover:-translate-y-0.5 border" style={{ background: "rgba(0,255,136,0.08)", borderColor: "rgba(0,255,136,0.3)", color: "#00ff88" }}>
          SAVE SETTINGS
        </button>
      </div>
    </PlanetPageLayout>
  );
};

export default SettingsScreen;
