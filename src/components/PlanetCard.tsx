import { NexusTerminal } from "./NexusTerminal";
import { ProtectionAudit } from "./ProtectionAudit";

interface PlanetCardProps {
  name: string;
  icon: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PlanetCard = ({ name, icon, isOpen, onClose }: PlanetCardProps) => {
  const getContent = () => {
    switch (name) {
      case "Markets":
        return (
          <>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-7 mb-5 hover:bg-primary/15 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,165,116,0.2)] transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3 font-bold">
                Market Status
              </div>
              <div className="text-4xl font-black text-green-500 mb-2 [text-shadow:0_0_10px_rgba(16,185,129,0.3)]">
                OPEN
              </div>
              <div className="text-sm text-green-500 font-bold">London Session Active</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-7 mb-5 hover:bg-primary/15 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,165,116,0.2)] transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3 font-bold">
                Volatility Index
              </div>
              <div className="text-4xl font-black text-green-500 mb-2 [text-shadow:0_0_10px_rgba(16,185,129,0.3)]">
                Medium
              </div>
              <div className="text-sm text-green-500 font-bold">+12% from yesterday</div>
            </div>
            <div className="space-y-3 mb-5">
              <div className="bg-white/5 border border-primary/20 rounded-xl p-5 flex justify-between items-center hover:bg-primary/10 hover:border-primary/40 hover:translate-x-1 transition-all">
                <div>
                  <div className="text-primary font-bold mb-1">EUR/USD</div>
                  <div className="text-xs text-white/50">1.0847</div>
                </div>
                <div className="text-green-500 font-bold">+0.34%</div>
              </div>
              <div className="bg-white/5 border border-primary/20 rounded-xl p-5 flex justify-between items-center hover:bg-primary/10 hover:border-primary/40 hover:translate-x-1 transition-all">
                <div>
                  <div className="text-primary font-bold mb-1">GBP/USD</div>
                  <div className="text-xs text-white/50">1.2634</div>
                </div>
                <div className="text-red-500 font-bold">-0.12%</div>
              </div>
            </div>
            <button className="w-full bg-primary/20 border border-primary/50 text-primary px-8 py-4 rounded-xl font-black uppercase tracking-wider hover:bg-primary/40 hover:border-primary/80 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(212,165,116,0.3)] transition-all">
              View Full Charts →
            </button>
          </>
        );
      case "Intelligence":
        return (
          <div className="h-[500px] w-full">
            <NexusTerminal />
          </div>
        );
      case "Execution":
        return (
          <>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-7 mb-5">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3 font-bold">
                Quick Trade Panel
              </div>
              <div className="mt-4">
                <div className="mb-3">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-2 font-bold">
                    Pair
                  </div>
                  <div className="text-lg text-white">EUR/USD</div>
                </div>
              </div>
            </div>
            <button className="w-full bg-red-500/20 border border-red-500/50 text-red-400 px-8 py-4 rounded-xl font-black uppercase tracking-wider hover:bg-red-500/40 hover:border-red-500/80 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(239,68,68,0.3)] transition-all">
              EXECUTE TRADE
            </button>
          </>
        );
      case "Reports":
        return <ProtectionAudit />;
      default:
        return (
          <>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-7 mb-5 hover:bg-primary/15 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(212,165,116,0.2)] transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3 font-bold">
                Feature Status
              </div>
              <div className="text-4xl font-black text-green-500 mb-2 [text-shadow:0_0_10px_rgba(16,185,129,0.3)]">
                Active
              </div>
              <div className="text-sm text-green-500 font-bold">All systems operational</div>
            </div>
            <button className="w-full bg-primary/20 border border-primary/50 text-primary px-8 py-4 rounded-xl font-black uppercase tracking-wider hover:bg-primary/40 hover:border-primary/80 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(212,165,116,0.3)] transition-all">
              Explore {name} →
            </button>
          </>
        );
    }
  };

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-h-[80vh] bg-[#0a0a14]/95 backdrop-blur-[30px] border border-primary/30 rounded-3xl p-12 z-[200] overflow-y-auto transition-all duration-400 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_100px_rgba(212,165,116,0.2)] ${
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-80 pointer-events-none"
      }`}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-11 h-11 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center text-3xl text-primary font-bold hover:bg-primary/30 hover:rotate-90 hover:shadow-[0_0_20px_rgba(212,165,116,0.4)] transition-all"
      >
        ×
      </button>
      <div className="flex items-center gap-6 mb-8 pb-6 border-b border-primary/20">
        <div className="text-6xl [filter:drop-shadow(0_0_15px_currentColor)]">{icon}</div>
        <div className="text-5xl font-black tracking-wider text-primary [text-shadow:0_0_20px_rgba(212,165,116,0.4)]">
          {name}
        </div>
      </div>
      {getContent()}
    </div>
  );
};
