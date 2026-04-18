import { PlanetOrb } from "@/components/PlanetOrb";
import { PolymarketPanel } from "@/components/PolymarketPanel";
import analyticsTexture from "@/assets/textures/analytics-realistic.jpg";

const AnalyticsScreen = () => (
  <div className="min-h-screen bg-[#09090b] text-white overflow-y-auto">
    <PlanetOrb texture={analyticsTexture} glowColor="#0099ff" label="NEXUS" />
    <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
      <div className="text-[10px] text-emerald-400/60 uppercase tracking-[0.3em] font-mono mb-1">WARROOM NEXUS</div>
      <div className="text-3xl font-black tracking-wider">ANALYTICS + POLYMARKET</div>
      <div className="text-sm text-white/40 font-mono mt-1">Prediction markets · Confluence scoring · Whale detection</div>
    </div>
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <PolymarketPanel />
    </div>
  </div>
);

export default AnalyticsScreen;
