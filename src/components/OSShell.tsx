import { type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWarroom } from "@/context/WarroomStateContext";

const MODULES = [
  { key: "command",    abbr: "CMD", route: "/",             color: "#ef4444", status: "LIVE"     },
  { key: "markets",    abbr: "MKT", route: "/markets",      color: "#38bdf8", status: "BUILDING" },
  { key: "intel",      abbr: "INT", route: "/intelligence", color: "#06b6d4", status: "FROZEN"   },
  { key: "polymarket", abbr: "PLY", route: "/polymarket",   color: "#a855f7", status: "LIVE"     },
  { key: "journal",    abbr: "JRN", route: "/journal",      color: "#10b981", status: "FROZEN"   },
  { key: "risk",       abbr: "RSK", route: null as string | null, color: "#f97316", status: "FROZEN" },
  { key: "settings",   abbr: "SET", route: "/settings",     color: "#6b7280", status: "LIVE"     },
] as const;

const VERDICT_COLORS: Record<string, string> = {
  AUTHORIZE: "#10b981", DELAY: "#f59e0b", DENY: "#ef4444",
  MONITOR: "#38bdf8", INVALIDATED: "#f43f5e", MISSING_DATA: "#a78bfa",
};

export function OSShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useWarroom();

  const path = location.pathname;
  const activeModule = MODULES.find(m =>
    m.route ? (path === m.route || (m.route !== "/" && path.startsWith(m.route as string))) : false,
  );
  const commandColor = VERDICT_COLORS[state.setup.command] ?? "#a78bfa";

  return (
    <>
      {/* ── LEFT RAIL ───────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 52, zIndex: 950,
        background: "rgba(0,1,6,0.96)", borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)", display: "flex", flexDirection: "column",
        fontFamily: "monospace",
      }}>
        {/* Logo → Cosmos */}
        <button
          onClick={() => navigate("/cosmos")}
          title="Cosmos — module navigator"
          style={{
            height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            borderTop: 0, borderLeft: 0, borderRight: 0,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "transparent", cursor: "pointer", padding: 0,
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 900, color: "#ef4444", letterSpacing: "0.1em" }}>WN</span>
        </button>

        {/* Module icons */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 3 }}>
          {MODULES.map(mod => {
            const isActive = mod.route
              ? (path === mod.route || (mod.route !== "/" && path.startsWith(mod.route as string)))
              : false;
            const isDisabled = !mod.route;
            const dotColor = mod.status === "LIVE" ? mod.color : mod.status === "BUILDING" ? "#f59e0b" : "#374151";
            return (
              <button
                key={mod.key}
                onClick={() => !isDisabled && mod.route && navigate(mod.route as string)}
                title={mod.key.toUpperCase() + (mod.status !== "LIVE" ? ` · ${mod.status}` : "")}
                style={{
                  width: 38, height: 36, border: "none",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  borderRadius: 7, cursor: isDisabled ? "not-allowed" : "pointer",
                  background: isActive ? `${mod.color}1a` : "transparent",
                  outline: isActive ? `1px solid ${mod.color}50` : "none",
                  opacity: mod.status === "FROZEN" ? 0.28 : 1,
                  transition: "all 0.12s", fontFamily: "monospace",
                }}
              >
                <span style={{
                  fontSize: 7.5, fontWeight: 900, letterSpacing: "0.05em",
                  color: isActive ? mod.color : "rgba(255,255,255,0.35)",
                }}>
                  {mod.abbr}
                </span>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: dotColor }} />
              </button>
            );
          })}
        </div>

        {/* Cosmos icon at bottom */}
        <button
          onClick={() => navigate("/cosmos")}
          title="Cosmos navigator"
          style={{
            height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            borderBottom: 0, borderLeft: 0, borderRight: 0,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "transparent", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.18)", lineHeight: 1 }}>⬡</span>
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
