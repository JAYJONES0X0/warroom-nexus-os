import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThreeScene, type PlanetStateInfo } from "@/components/ThreeScene";
import MorningBrief from "@/components/MorningBrief";
import { getSessionLabel } from "@/lib/warroomCommand";

// COSMOS = module navigation layer
// COMMAND = asset execution layer (lives inside Command, not here)

const MODULE_ROUTES: Record<string, string> = {
  command:    "/",
  markets:    "/markets",
  intel:      "/intelligence",
  polymarket: "/polymarket",
  journal:    "/journal",
  risk:       "/risk",
  settings:   "/settings",
};

const MODULE_STATES: Record<string, PlanetStateInfo> = {
  command:    { status: "LIVE",     description: "Execution intelligence OS" },
  markets:    { status: "BUILDING",  description: "Chart viewer LIVE · Terminal building" },
  intel:      { status: "FROZEN",   description: "World state · next sprint" },
  polymarket: { status: "LIVE",     description: "Prediction module" },
  journal:    { status: "FROZEN",   description: "Trade journal" },
  risk:       { status: "FROZEN",   description: "Risk dashboard" },
  settings:   { status: "LIVE",     description: "Configuration" },
};

const STATUS_COLOR = {
  LIVE:     "#10b981",
  BUILDING: "#f59e0b",
  FROZEN:   "#4b5563",
} as const;

const SESSION_COLOR: Record<string, string> = {
  "LONDON KILLZONE":   "#f59e0b",
  "NY AM / OVERLAP":   "#10b981",
  "LONDON/NY OVERLAP": "#10b981",
  "LONDON SESSION":    "#6ee7b7",
  "NY PM / MANAGEMENT":"#38bdf8",
  "ASIA RANGE":        "#6b7280",
  "WEEKEND / CLOSED":  "#374151",
};

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem("nexus_loaded"));

  const session = getSessionLabel();
  const sessionCol = Object.entries(SESSION_COLOR).find(([k]) => session.toUpperCase().includes(k))?.[1] ?? "#6b7280";

  const handlePlanetClick = (moduleKey: string) => {
    const route = MODULE_ROUTES[moduleKey];
    if (route) navigate(route);
  };

  const handleLoadComplete = () => {
    sessionStorage.setItem("nexus_loaded", "1");
    setIsLoading(false);
  };

  if (isLoading) return <LoadingScreen onComplete={handleLoadComplete} />;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <ThreeScene onPlanetClick={handlePlanetClick} moduleStates={MODULE_STATES} />

      {/* ─ Top bar ──────────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(0,1,6,0.82)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-black text-red-400 tracking-[0.3em] uppercase">WARROOM NEXUS</div>
          <div className="h-4 w-px bg-white/10" />
          <div className="text-[9px] text-white/30 tracking-wider">Cosmos · Module Universe</div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded"
            style={{ color: sessionCol, background: `${sessionCol}15`, border: `1px solid ${sessionCol}30` }}
          >
            {session}
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition-all hover:text-white"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(239,68,68,0.8)" }}
          >
            COMMAND →
          </button>
        </div>
      </div>

      {/* ─ Module index panel ───────────────────────────────────────────────── */}
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 z-[400] card-surface"
        style={{
          backdropFilter: "blur(12px)",
          padding: "14px 16px",
          minWidth: "158px",
        }}
      >
        <div className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-3">OS Modules · 7</div>
        <div className="space-y-2">
          {(Object.entries(MODULE_STATES) as [string, PlanetStateInfo][]).map(([key, mod]) => (
            <button
              key={key}
              onClick={() => handlePlanetClick(key)}
              className="w-full flex items-center justify-between gap-3 text-left transition-opacity hover:opacity-100"
              style={{ opacity: mod.status === "FROZEN" ? 0.45 : 0.9 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[mod.status] }} />
                <span className="text-[10px] font-black uppercase tracking-wide text-white/80">{key}</span>
              </div>
              <span
                className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  color: STATUS_COLOR[mod.status],
                  background: `${STATUS_COLOR[mod.status]}18`,
                  border: `1px solid ${STATUS_COLOR[mod.status]}30`,
                }}
              >
                {mod.status}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[8px] text-white/22 leading-relaxed">
            Click any planet or row<br />to enter its module
          </div>
        </div>
      </div>

      {/* ─ Bottom strip ─────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[400] text-center"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="inline-block text-[9px] text-white/22 leading-relaxed px-4 py-2 rounded-lg card-surface"
        >
          Drag to rotate · Scroll to zoom · Click a planet to enter its module
        </div>
      </div>

      {/* ─ Morning Brief panel ──────────────────────────────────────────────── */}
      <MorningBrief />
    </div>
  );
};

export default Index;
