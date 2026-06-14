import { useState, useEffect } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import settingsTexture from "@/assets/textures/real_earth_daymap.jpg";

const PREFS_KEY = "warroom.prefs";
const DEFAULTS = { risk: "1.0", maxDD: "5.0", session: "London+NY" };

const SettingsScreen = () => {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  // Load saved preferences from this browser.
  useEffect(() => {
    try {
      const s = localStorage.getItem(PREFS_KEY);
      if (s) setPrefs({ ...DEFAULTS, ...JSON.parse(s) });
    } catch { /* ignore */ }
  }, []);

  const set = (k: keyof typeof DEFAULTS, v: string) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };
  const save = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <PlanetPageLayout
      texture={settingsTexture}
      glowColor="#00ff88"
      bgColor="#000a05"
      screenName="SETTINGS"
      screenDesc="Your operating preferences · WARROOM is an intelligence layer, not a broker"
    >
      <div className="space-y-5">
        {/* Honest banner — replaces the old fake Paper/Live trading toggle */}
        <div className="bg-emerald-500/[0.05] border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-1.5">📋 Intelligence layer — never auto-trades</div>
          <div className="text-[11px] text-white/45 font-mono leading-relaxed">
            WARROOM NEXUS analyses markets and hands you signals. It never places orders or touches capital —
            you execute every trade yourself on MT4/MT5/cTrader. The settings below are your personal rules and
            focus, saved to this browser.
          </div>
        </div>

        {/* Risk rules — persisted */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">RISK RULES <span className="text-white/15 normal-case tracking-normal">— your discipline, applied when you execute</span></div>
          <div className="grid grid-cols-2 gap-4">
            {([["Risk Per Trade (%)", "risk", "Max 2% recommended"], ["Max Daily Drawdown (%)", "maxDD", "Walk away at this level"]] as const).map(([l, k, hint]) => (
              <div key={k}>
                <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">{l}</label>
                <input value={prefs[k]} onChange={(e) => set(k, e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40 mb-1" />
                <div className="text-[10px] text-white/20 font-mono">{hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Focus sessions — persisted */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">FOCUS SESSIONS <span className="text-white/15 normal-case tracking-normal">— when you watch the scan</span></div>
          <select value={prefs.session} onChange={(e) => set("session", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/40">
            {["London", "NY", "London+NY", "Asian", "All Sessions"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* AI engine — honest, server-managed (no fake user-editable key) */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">AI ENGINE</div>
          <div className="flex items-center justify-between bg-black/40 border border-white/[0.06] rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-black text-white">Groq · Llama 3.3 70B</div>
              <div className="text-[10px] text-white/30 font-mono">Powers ARCHON + the EXA terminal</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded text-emerald-400" style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>MANAGED SERVER-SIDE</span>
          </div>
          <div className="text-[10px] text-white/20 font-mono mt-2">The API key lives as a server secret — nothing to configure here.</div>
        </div>

        <button onClick={save} className="w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] text-sm transition-all hover:-translate-y-0.5 border" style={{ background: "rgba(0,255,136,0.08)", borderColor: "rgba(0,255,136,0.3)", color: "#00ff88" }}>
          {saved ? "✓ SAVED TO THIS BROWSER" : "SAVE PREFERENCES"}
        </button>
      </div>
    </PlanetPageLayout>
  );
};

export default SettingsScreen;
