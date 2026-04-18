import { PlanetOrb } from "@/components/PlanetOrb";
import { ProtectionAudit } from "@/components/ProtectionAudit";
import historyTexture from "@/assets/textures/history-realistic.jpg";

const ReportsScreen = () => (
  <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
    <PlanetOrb texture={historyTexture} glowColor="#44ffaa" label="NEXUS" />
    <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
      <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
      <div className="text-3xl font-black tracking-wider">REPORTS + AUDIT</div>
      <div className="text-sm text-white/40 font-mono mt-1">EXA Protection Audit · Session logs · Drawdown tracking</div>
    </div>
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <ProtectionAudit />
    </div>
  </div>
);

export default ReportsScreen;
