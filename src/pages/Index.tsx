import { useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TopBar } from "@/components/TopBar";
import { SideBar } from "@/components/SideBar";
import { BottomTicker } from "@/components/BottomTicker";
import { ThreeScene } from "@/components/ThreeScene";
import { PlanetCard } from "@/components/PlanetCard";
const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const leftSidebarItems = [{
    title: "EUR/USD",
    value: "1.0847"
  }, {
    title: "GBP/USD",
    value: "1.2634"
  }, {
    title: "USD/JPY",
    value: "149.82"
  }, {
    title: "BTC/USD",
    value: "$43,250"
  }];
  const rightSidebarItems = [{
    title: "Active Trades",
    value: "3"
  }, {
    title: "Win Rate",
    value: "68%"
  }, {
    title: "P&L Today",
    value: "+$1,247"
  }, {
    title: "Risk Level",
    value: "Low"
  }];
  const planetsData = [{
    name: "Markets",
    icon: "📊"
  }, {
    name: "Intelligence",
    icon: "🧠"
  }, {
    name: "Alerts",
    icon: "🔔"
  }, {
    name: "Settings",
    icon: "⚙️"
  }, {
    name: "Journal",
    icon: "📝"
  }, {
    name: "Execution",
    icon: "⚡"
  }, {
    name: "Analytics",
    icon: "📈"
  }, {
    name: "Reports",
    icon: "📋"
  }, {
    name: "History",
    icon: "🕐"
  }];
  const handlePlanetClick = (name: string) => {
    setSelectedPlanet(name);
  };
  const handleCloseCard = () => {
    setSelectedPlanet(null);
  };
  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }
  return <div className="relative w-full h-screen bg-black overflow-hidden">
      <ThreeScene onPlanetClick={handlePlanetClick} />
      
      <TopBar />
      <SideBar side="left" items={leftSidebarItems} icon="📊" className="text-primary-foreground" />
      <SideBar side="right" items={rightSidebarItems} icon="⚡" />
      <BottomTicker />

      {planetsData.map(planet => <PlanetCard key={planet.name} name={planet.name} icon={planet.icon} isOpen={selectedPlanet === planet.name} onClose={handleCloseCard} />)}

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-primary/40 pointer-events-none text-center leading-relaxed animate-[fadeInOut_6s_ease-in-out_forwards]">
        🖱️ Drag to rotate • 🔍 Scroll to zoom • 🪐 Click planets to explore
        <br />
        Experience the future of trading intelligence
      </div>
    </div>;
};
export default Index;