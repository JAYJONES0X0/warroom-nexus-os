import { useState, useEffect } from "react";
import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { useEXAScores } from "@/hooks/useEXAScores";
import { ASSET_BRAIN } from "@/lib/warroomBrain";
import riskTexture from "@/assets/textures/real_mars.jpg";

const ALL_ASSETS = ["EURUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","NZDUSD","XAUUSD","BTCUSD","NAS100","SPX","DXY"];

const RSK_KEY = "warroom.risk";

interface RiskPrefs {
  accountSize: number;
  riskPerTrade: number;
  maxDailyDD: number;
  maxPositions: number;
}

const DEFAULTS: RiskPrefs = {
  accountSize: 10000,
  riskPerTrade: 1,
  maxDailyDD: 5,
  maxPositions: 3,
};

function loadPrefs(): RiskPrefs {
  try {
    const raw = localStorage.getItem(RSK_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

function KellyRow({ pair, accountSize, riskPerTrade }: { pair: string; accountSize: number; riskPerTrade: number }) {
  const brain = ASSET_BRAIN[pair];
  const exa = useEXAScores(pair);
  if (!brain || brain.winRate == null || brain.avgRR == null) return null;
  const wr = brain.winRate / 100;
  const rr = parseFloat(brain.avgRR.split(":")[1]) || 1;
  const kelly = ((wr * rr - (1 - wr)) / rr) * 100;
  const halfKelly = kelly / 2;
  const fracKelly = Math.max(0, Math.min(halfKelly, riskPerTrade));
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <span className="text-xs font-black text-white w-16">{brain.label}</span>
        <span className="text-[10px] font-mono text-white/30">WR {brain.winRate}%</span>
        <span className="text-[10px] font-mono text-white/30">RR {brain.avgRR}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[9px] text-white/20 font-mono">Kelly</div>
          <div className={`text-[11px] font-black tabular-nums ${kelly > 0 ? "text-emerald-400" : "text-red-400"}`}>{kelly > 0 ? "+" : ""}{kelly.toFixed(1)}%</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-white/20 font-mono">&frac12; Kelly</div>
          <div className="text-[11px] font-black text-orange-400 tabular-nums">{Math.max(0, halfKelly).toFixed(1)}%</div>
        </div>
        <div className="w-20 text-right">
          <div className="text-[9px] text-white/20 font-mono">Suggested $</div>
          <div className="text-[11px] font-black text-white tabular-nums">${(accountSize * fracKelly / 100).toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}

function RiskScreen() {
  const [prefs, setPrefs] = useState<RiskPrefs>(loadPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(RSK_KEY, JSON.stringify(prefs)); }
    catch { /* silent */ }
  }, [prefs]);

  const update = (k: keyof RiskPrefs, v: number) => {
    setPrefs(p => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pipValue = prefs.accountSize * (prefs.riskPerTrade / 100) * 10;

  return (
    <PlanetPageLayout
      texture={riskTexture}
      glowColor="#f97316"
      bgColor="#0d0508"
      screenName="RISK MANAGER"
      screenDesc="Position sizing · Drawdown limits · Kelly criterion · Per-asset exposure"
    >
      {/* Account Configuration */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">Account Configuration</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Account Size ($)", "accountSize", "e.g. 10000"],
            ["Risk Per Trade (%)", "riskPerTrade", "Max 2% recommended"],
            ["Max Daily Drawdown (%)", "maxDailyDD", "Walk away at this level"],
            ["Max Open Positions", "maxPositions", "3-5 for retail"],
          ].map(([l, k, hint]) => (
            <div key={k}>
              <label className="text-[10px] text-white/30 uppercase font-mono mb-1.5 block">{l}</label>
              <input type="number" value={prefs[k as keyof RiskPrefs]} onChange={(e) => update(k as keyof RiskPrefs, parseFloat(e.target.value) || 0)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500/40 mb-1" />
              <div className="text-[10px] text-white/20 font-mono">{hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Position Sizing Calculator */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">Position Sizing</div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Risk per Trade ($)</div>
            <div className="text-xl font-black text-orange-400 tabular-nums">${(prefs.accountSize * prefs.riskPerTrade / 100).toFixed(0)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Daily Loss Limit ($)</div>
            <div className="text-xl font-black text-red-400 tabular-nums">${(prefs.accountSize * prefs.maxDailyDD / 100).toFixed(0)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Pip Value ($/pip)</div>
            <div className="text-xl font-black text-emerald-400 tabular-nums">${pipValue.toFixed(0)}</div>
          </div>
        </div>
        <button onClick={save}
          className="w-full py-3 rounded-xl font-black uppercase tracking-[0.15em] text-xs transition-all border"
          style={{ background: saved ? "rgba(16,185,129,0.08)" : "rgba(249,115,22,0.08)", borderColor: saved ? "rgba(16,185,129,0.3)" : "rgba(249,115,22,0.2)", color: saved ? "#10b981" : "#f97316" }}>
          {saved ? "SAVED" : "SAVE RISK PREFERENCES"}
        </button>
      </div>

      {/* Kelly Criterion Sizing by Asset */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-4">Kelly Sizing <span className="text-white/15 normal-case tracking-normal">— backtested edge per asset</span></div>
        <div className="space-y-2">
          {ALL_ASSETS.map(pair => (
            <KellyRow key={pair} pair={pair} accountSize={prefs.accountSize} riskPerTrade={prefs.riskPerTrade} />
          ))}
        </div>
      </div>

      {/* Max Drawdown Tracker — manual */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono mb-2">Drawdown Tracker</div>
        <div className="text-[10px] text-white/25 font-mono mb-4">Log your current drawdown manually. This helps you respect the max limit above.</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Current Drawdown</div>
            <div className="text-lg font-black text-red-400 tabular-nums">--</div>
            <div className="text-[10px] text-white/20 font-mono mt-1">Enter in settings</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-center">
            <div className="text-[9px] text-white/25 uppercase font-mono mb-1">Max Allowed</div>
            <div className="text-lg font-black text-emerald-400 tabular-nums">{prefs.maxDailyDD}%</div>
            <div className="text-[10px] text-white/20 font-mono mt-1">${(prefs.accountSize * prefs.maxDailyDD / 100).toFixed(0)}</div>
          </div>
        </div>
      </div>
    </PlanetPageLayout>
  );
}

export default RiskScreen;
