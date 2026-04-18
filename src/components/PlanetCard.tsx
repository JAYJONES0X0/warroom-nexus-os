import { useNavigate } from "react-router-dom";

interface PlanetCardProps {
  name: string;
  icon: string;
  isOpen: boolean;
  onClose: () => void;
  description?: string;
  stats?: { label: string; value: string }[];
}

const PLANET_ROUTES: Record<string, string> = {
  Markets: "/markets",
  Intelligence: "/intelligence",
  Execution: "/execution",
  Analytics: "/analytics",
  Reports: "/reports",
  Journal: "/journal",
  Alerts: "/alerts",
  Settings: "/settings",
  Trades: "/analytics",
  History: "/reports",
};

const PLANET_DESCRIPTIONS: Record<string, string> = {
  Markets: "Live multi-asset price feeds. EUR/USD, XAUUSD, BTC, indices — real-time confluence scanning.",
  Intelligence: "Pattern detection engine. EXA 4-LOCKS analysis with ARCHON override protocol.",
  Execution: "EXA Analysis scoring system. Order entry with risk:reward calculator and 4-LOCKS gate.",
  Analytics: "Polymarket prediction intelligence. Confluence scoring, whale detection, Kelly sizing.",
  Reports: "EXA Protection Audit. Session logs, drawdown tracking, rule adherence score.",
  Journal: "Trade journal. Review past sessions, annotate setups, track psychological edge.",
  Alerts: "Smart alert management. Price levels, session opens, confluence triggers.",
  Settings: "System configuration. API keys, risk limits, session parameters.",
  Trades: "Active trade management. Monitor open positions, adjust stops, take partials.",
  History: "Historical analysis. Backtest results, win rate trends, pattern performance.",
};

const PLANET_STATS: Record<string, { label: string; value: string }[]> = {
  Markets: [{ label: "Pairs Tracked", value: "12" }, { label: "Session", value: "London" }, { label: "Signal", value: "ACTIVE" }],
  Intelligence: [{ label: "Patterns", value: "3 Active" }, { label: "Locks", value: "3/4" }, { label: "Mode", value: "MONITOR" }],
  Execution: [{ label: "Score", value: "78/100" }, { label: "Verdict", value: "WAIT" }, { label: "R:R", value: "1:3.2" }],
  Analytics: [{ label: "Markets", value: "20 Live" }, { label: "Edge Found", value: "4" }, { label: "Conf.", value: "72%" }],
  Reports: [{ label: "Win Rate", value: "68%" }, { label: "Drawdown", value: "-2.1%" }, { label: "Score", value: "94/100" }],
  Journal: [{ label: "Entries", value: "47" }, { label: "Best R", value: "+4.2R" }, { label: "Avg R", value: "+1.8R" }],
  Alerts: [{ label: "Active", value: "6" }, { label: "Triggered", value: "2 Today" }, { label: "Status", value: "Watching" }],
  Settings: [{ label: "Risk", value: "1% / Trade" }, { label: "Session", value: "London+NY" }, { label: "Mode", value: "Live" }],
  Trades: [{ label: "Open", value: "2" }, { label: "P&L", value: "+1.4R" }, { label: "Risk", value: "Low" }],
  History: [{ label: "Sessions", value: "184" }, { label: "Win Rate", value: "71%" }, { label: "Best Month", value: "+12.4%" }],
};

export const PlanetCard = ({ name, icon, isOpen, onClose }: PlanetCardProps) => {
  const navigate = useNavigate();
  const route = PLANET_ROUTES[name];
  const description = PLANET_DESCRIPTIONS[name] || "Explore this module.";
  const stats = PLANET_STATS[name] || [];

  const handleEnter = () => {
    onClose();
    if (route) navigate(route);
  };

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-[#09090b]/96 backdrop-blur-[40px] border border-emerald-500/25 rounded-2xl p-8 z-[200] transition-all duration-300 shadow-[0_20px_80px_rgba(0,0,0,0.9),0_0_60px_rgba(16,185,129,0.08)] ${
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"
      }`}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 text-xl transition-colors"
      >
        ×
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div>
          <div className="text-xs text-emerald-400/70 uppercase tracking-[0.2em] font-mono mb-0.5">NEXUS MODULE</div>
          <div className="text-2xl font-black text-white tracking-wider">{name.toUpperCase()}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/50 leading-relaxed mb-6 font-mono">{description}</p>

      {/* Stats row */}
      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1 font-mono">{s.label}</div>
              <div className="text-sm font-black text-emerald-400">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-white/[0.06] mb-6" />

      {/* Enter button */}
      {route ? (
        <button
          onClick={handleEnter}
          className="w-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-6 py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-sm hover:bg-emerald-500/20 hover:border-emerald-500/70 hover:text-emerald-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-3"
        >
          <span>ENTER {name.toUpperCase()}</span>
          <span className="text-lg">→</span>
        </button>
      ) : (
        <button
          onClick={onClose}
          className="w-full bg-white/[0.04] border border-white/[0.08] text-white/40 px-6 py-3.5 rounded-xl font-bold uppercase tracking-[0.15em] text-sm cursor-not-allowed"
          disabled
        >
          COMING SOON
        </button>
      )}
    </div>
  );
};
