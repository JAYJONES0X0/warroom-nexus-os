import { PlanetPageLayout } from "@/components/PlanetPageLayout";
import { ProtectionAudit } from "@/components/ProtectionAudit";
import historyTexture from "@/assets/textures/real_venus.jpg";

const ReportsScreen = () => (
  <PlanetPageLayout
    texture={historyTexture}
    glowColor="#44ffaa"
    bgColor="#010e06"
    screenName="REPORTS + AUDIT"
    screenDesc="EXA Protection Audit · Session logs · Win rate · Drawdown tracking"
  >
    <ProtectionAudit />
  </PlanetPageLayout>
);

export default ReportsScreen;
