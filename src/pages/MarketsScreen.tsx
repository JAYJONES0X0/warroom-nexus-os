import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { MarketsPanel } from "@/components/MarketsPanel";
import marketsTexture from "@/assets/textures/markets-realistic.jpg";

const MarketsScreen = () => (
  <PlanetPageLayout
    texture={marketsTexture}
    glowColor="#ff4444"
    bgColor="#0f0000"
    screenName="MARKETS FEED"
    screenDesc="Live multi-asset prices · Confluence scanning · Session heat map"
  >
    <MarketsPanel />
  </PlanetPageLayout>
);

export default MarketsScreen;
