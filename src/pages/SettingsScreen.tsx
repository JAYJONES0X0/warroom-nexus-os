import { useState } from "react";
import { PlanetOrb } from "@/components/PlanetOrb";
import settingsTexture from "@/assets/textures/settings-realistic.jpg";

const SettingsScreen = () => {
  const [risk, setRisk] = useState("1.0");
  const [maxDrawdown, setMaxDrawdown] = useState("5.0");
  const [session, setSession] = useState("London+NY");
  const [groqKey, setGroqKey] = useState("gsk_••••••••••••••••••••••••••••••••");
  const [mode, setMode] = useState<"Live" | "Paper">("Paper");

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
      <PlanetOrb texture={settingsTexture} glowColor="#00ff88" label="NEXUS" />
      <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
        <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
        <div className="text-3xl font-black tracking-wider">SETTINGS</div>
        <div className="text-sm text-white/40 font-mono mt-1">Risk parameters · API keys · Session config</div>
      </div>

      <div className="px-8 py-6 max-w-[800px] mx-auto space-y-6">
        {/* Trading Mode */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-5">TRADING MODE</div>
          <div className="flex gap-3">
            {(["Paper", "Live"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all border ${
                  mode === m
                    ? m === "Live" ? "bg-red-500/15 border-red-500/40 text-red-400" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.02] border-white/[0.06] text-white/30"
                }`}
              >
                {m === "Live" ? "⚡ " : "📋 "}{m} Trading
              </button>
            ))}
          </div>
          {mode === "Live" && (
            <div className="mt-3 p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg text-xs text-red-400 font-mono">
              ⚠ Live mode uses real capital. Ensure all risk parameters are verified before trading.
            </div>
          )}
        </div>

        {/* Risk Management */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-5">RISK MANAGEMENT</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Risk Per Trade (%)", value: risk, set: setRisk, hint: "Max 2% recommended" },
              { label: "Max Daily Drawdown (%)", value: maxDrawdown, set: setMaxDrawdown, hint: "Hard stop at this level" },
            ].map(({ label, value, set, hint }) => (
              <div key={label}>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 mb-1"
                />
                <div className="text-[10px] text-white/25 font-mono">{hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Config */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-5">SESSION CONFIG</div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">Active Sessions</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            >
              {["London", "NY", "London+NY", "Asian", "All Sessions"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-5">API KEYS</div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1.5 block">Groq API Key</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <button className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-black uppercase tracking-[0.15em] text-sm hover:bg-emerald-500/20 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)] transition-all">
          SAVE SETTINGS
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
