import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { PolymarketPanel } from "@/components/PolymarketPanel";
import analyticsTexture from "@/assets/textures/analytics-realistic.jpg";

const AnalyticsScreen = () => (
  <PlanetPageLayout
    texture={analyticsTexture}
    glowColor="#0099ff"
    bgColor="#00050f"
    screenName="ANALYTICS + POLYMARKET"
    screenDesc="Prediction markets · Confluence scoring · Whale detection · Kelly sizing"
  >
    <PolymarketPanel />
  </PlanetPageLayout>
);

export default AnalyticsScreen;
