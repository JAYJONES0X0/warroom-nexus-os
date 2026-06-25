import { useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWarroom } from "@/context/WarroomStateContext";

const CORE_MODULES = [
  { key: "command",    abbr: "CMD", route: "/",             color: "#ef4444", status: "LIVE"     },
  { key: "markets",    abbr: "MKT", route: "/markets",      color: "#38bdf8", status: "BUILDING" },
  { key: "intel",      abbr: "INT", route: "/intelligence", color: "#06b6d4", status: "BUILDING" },
  { key: "polymarket", abbr: "PLY", route: "/polymarket",   color: "#a855f7", status: "BUILDING" },
  { key: "journal",    abbr: "JRN", route: "/journal",      color: "#10b981", status: "FROZEN"   },
  { key: "risk",       abbr: "RSK", route: "/risk",         color: "#f97316", status: "FROZEN"   },
  { key: "settings",   abbr: "SET", route: "/settings",     color: "#6b7280", status: "LIVE"     },
] as const;

const EXTRA_MODULES = [
  { key: "execution",  abbr: "EXE", route: "/execution",    color: "#D48A3C", status: "BUILDING" },
  { key: "analytics",  abbr: "ANL", route: "/analytics",    color: "#8b5cf6", status: "BUILDING" },
  { key: "reports",    abbr: "RPT", route: "/reports",      color: "#ec4899", status: "LIVE"     },
  { key: "alerts",     abbr: "ALR", route: "/alerts",       color: "#f43f5e", status: "BUILDING" },
] as const;

const VERDICT_COLORS: Record<string, string> = {
  AUTHORIZE: "#10b981", DELAY: "#f59e0b", DENY: "#ef4444",
  MONITOR: "#38bdf8", INVALIDATED: "#f43f5e", MISSING_DATA: "#a78bfa",
};

export function OSShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useWarroom();
  const [showMore, setShowMore] = useState(false);
  const [railHover, setRailHover] = useState(false);

  const path = location.pathname;
  const allModules = [...CORE_MODULES, ...EXTRA_MODULES];
  const activeModule = allModules.find(m =>
    m.route ? (path === m.route || (m.route !== "/" && path.startsWith(m.route as string))) : false,
  );
  const commandColor = VERDICT_COLORS[state.setup.command] ?? "#a78bfa";

  // Human-readable module labels for expanded rail
  const MODULE_LABELS: Record<string, string> = {
    command: "COMMAND", markets: "MARKETS", intel: "INTEL",
    polymarket: "POLYMARKET", journal: "JOURNAL", risk: "RISK", settings: "SETTINGS",
    execution: "EXECUTION", analytics: "ANALYTICS", reports: "REPORTS", alerts: "ALERTS",
  };

  return (
    <>
      {/* ── LEFT RAIL (hover to expand) ────────────────────────────────── */}
      <div
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0,
          width: railHover ? 140 : 52, zIndex: 950,
          background: "rgba(0,1,6,0.96)", borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)", display: "flex", flexDirection: "column",
          fontFamily: "monospace", transition: "width 0.15s ease",
          overflow: "hidden",
        }}>
        {/* Logo → Cosmos */}
        <button
          onClick={() => navigate("/cosmos")}
          title="Cosmos — module navigator"
          style={{
            height: 44, display: "flex", alignItems: "center", gap: 8,
            padding: railHover ? "0 12px" : "0", justifyContent: railHover ? "flex-start" : "center",
            borderTop: 0, borderLeft: 0, borderRight: 0,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "transparent", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 900, color: "#ef4444", letterSpacing: "0.1em" }}>WN</span>
          {railHover && <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>COSMOS</span>}
        </button>

        {/* Module icons with labels on hover */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 0", gap: 2 }}>
          {[...CORE_MODULES, ...(showMore ? EXTRA_MODULES : [])].map(mod => {
            const isActive = mod.route
              ? (path === mod.route || (mod.route !== "/" && path.startsWith(mod.route as string)))
              : false;
            const isDisabled = !mod.route;
            const dotColor = mod.status === "LIVE" ? mod.color : mod.status === "BUILDING" ? "#f59e0b" : "#374151";
            return (
              <button
                key={mod.key}
                onClick={() => !isDisabled && mod.route && navigate(mod.route as string)}
                title={`${mod.key.toUpperCase()} — ${mod.status}`}
                style={{
                  height: 32, border: "none", cursor: isDisabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  padding: railHover ? "0 12px" : "0 7px",
                  justifyContent: railHover ? "flex-start" : "center",
                  borderRadius: 0, fontFamily: "monospace",
                  background: isActive ? `${mod.color}1a` : "transparent",
                  borderLeft: isActive ? `2px solid ${mod.color}` : "2px solid transparent",
                  opacity: mod.status === "FROZEN" ? 0.28 : 1,
                  transition: "all 0.12s",
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
                  color: isActive ? mod.color : "rgba(255,255,255,0.35)",
                }}>
                  {mod.abbr}
                </span>
                {railHover && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
                    color: isActive ? mod.color : "rgba(255,255,255,0.3)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {MODULE_LABELS[mod.key] ?? mod.key.toUpperCase()}
                  </span>
                )}
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: dotColor, marginLeft: "auto" }} />
              </button>
            );
          })}

          {/* MORE toggle */}
          {!showMore && (
            <button
              onClick={() => setShowMore(true)}
              title="More modules"
              style={{
                height: 24, border: "none", cursor: "pointer", fontFamily: "monospace",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: railHover ? "0 12px" : "0",
                background: "transparent",
                fontSize: 7, fontWeight: 900, letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.25)", transition: "all 0.12s",
              }}
            >
              <span>+</span>
              {railHover && <span>MORE</span>}
            </button>
          )}
          {showMore && (
            <button
              onClick={() => setShowMore(false)}
              title="Collapse"
              style={{
                height: 24, border: "none", cursor: "pointer", fontFamily: "monospace",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: railHover ? "0 12px" : "0",
                background: "transparent",
                fontSize: 7, fontWeight: 900, letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.25)", transition: "all 0.12s",
              }}
            >
              <span>−</span>
              {railHover && <span>LESS</span>}
            </button>
          )}
        </div>

        {/* Cosmos icon at bottom */}
        <button
          onClick={() => navigate("/cosmos")}
          title="Cosmos navigator"
          style={{
            height: 36, display: "flex", alignItems: "center", gap: 8,
            padding: railHover ? "0 12px" : "0", justifyContent: railHover ? "flex-start" : "center",
            borderBottom: 0, borderLeft: 0, borderRight: 0,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "transparent", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.18)", lineHeight: 1 }}>⬡</span>
          {railHover && <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>NAVIGATOR</span>}
        </button>
      </div>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", left: 52, top: 0, right: 0, height: 44, zIndex: 950,
        background: "rgba(0,1,6,0.92)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        fontFamily: "monospace",
      }}>
        {/* Active module name */}
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase",
          color: activeModule ? activeModule.color : "rgba(255,255,255,0.4)",
          minWidth: 68,
        }}>
          {activeModule?.key.toUpperCase() ?? "NEXUS"}
        </span>

        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)" }} />

        {/* Selected asset */}
        <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>
          {state.selectedAsset}
        </span>

        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)" }} />

        {/* Session */}
        <span style={{
          fontSize: 8.5, fontWeight: 800, color: "#f59e0b",
          letterSpacing: "0.1em", textTransform: "uppercase",
          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {state.selectedSession}
        </span>

        <div style={{ flex: 1 }} />

        {/* Command verdict */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "2px 9px", borderRadius: 5,
          background: `${commandColor}10`, border: `1px solid ${commandColor}28`,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: commandColor, boxShadow: `0 0 5px ${commandColor}70`,
          }} />
          <span style={{ fontSize: 7.5, fontWeight: 900, color: commandColor, letterSpacing: "0.14em" }}>
            {state.setup.command.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      {/* Normal-flow pages (CommandScreen etc.) render here with correct offset.   */}
      {/* Fixed-inset pages (PlanetPageLayout, PolymarketScreen) escape this box    */}
      {/* and render at viewport edges — the shell rails overlay them at z-950.     */}
      <div style={{ paddingLeft: 52, paddingTop: 44, minHeight: "100vh", boxSizing: "border-box" }}>
        {children}
      </div>
    </>
  );
}
