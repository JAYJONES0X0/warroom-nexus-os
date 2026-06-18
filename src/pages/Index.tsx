import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThreeScene, type PlanetStateInfo } from "@/components/ThreeScene";
import { usePrices } from "@/hooks/usePrices";
import { useEXAScan } from "@/hooks/useEXAScores";
import { useWarroom } from "@/context/WarroomStateContext";
import { formatPrice, getAssetMeta, getSessionLabel, WARROOM_ASSETS } from "@/lib/warroomCommand";

// Stable module-level array — required by useEXAScan to avoid re-running every render
const ALL_PAIRS = WARROOM_ASSETS.map((a) => a.key);

const SESSION_COLOR: Record<string, string> = {
  "LONDON KILLZONE":  "#f59e0b",
  "NY AM / OVERLAP":  "#10b981",
  "LONDON/NY OVERLAP":"#10b981",
  "LONDON SESSION":   "#6ee7b7",
  "NY PM / MANAGEMENT":"#38bdf8",
  "ASIA RANGE":       "#6b7280",
  "WEEKEND / CLOSED": "#374151",
};

const VERDICT_DOT: Record<string, string> = {
  AUTHORIZED: "#10b981",
  DELAY:      "#f59e0b",
  DENIED:     "#ef4444",
};

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => !sessionStorage.getItem("nexus_loaded"));

  const { setAsset } = useWarroom();
  const { prices } = usePrices();
  const scan = useEXAScan(ALL_PAIRS);

  const session = getSessionLabel();
  const sessionCol = Object.entries(SESSION_COLOR).find(([k]) => session.toUpperCase().includes(k))?.[1] ?? "#6b7280";

  // Build planet states from EXA scan — passed to ThreeScene
  const planetStates = useMemo<Record<string, PlanetStateInfo>>(() => {
    const map: Record<string, PlanetStateInfo> = {};
    for (const row of scan) {
      const meta = getAssetMeta(row.pair);
      const price = prices[row.pair];
      map[row.pair] = {
        verdict: row.scores.verdict === "AUTHORIZED" ? "AUTHORIZED"
               : row.scores.verdict === "DELAY"      ? "DELAY"
               : "DENIED",
        composite: row.scores.composite,
        price:     price ? formatPrice(row.pair, price.price) : "—",
        bias:      row.scores.bias,
        priceChange: price?.changePct ?? null,
      };
    }
    return map;
  }, [scan, prices]);

  // Left sidebar — live prices for the 4 primary pairs
  const leftItems = useMemo(() => [
    { title: "XAU/USD", value: prices["XAUUSD"] ? formatPrice("XAUUSD", prices["XAUUSD"].price) : "—" },
    { title: "EUR/USD", value: prices["EURUSD"] ? formatPrice("EURUSD", prices["EURUSD"].price) : "—" },
    { title: "GBP/USD", value: prices["GBPUSD"] ? formatPrice("GBPUSD", prices["GBPUSD"].price) : "—" },
    { title: "NAS100",  value: prices["NAS100"]  ? formatPrice("NAS100",  prices["NAS100"].price)  : "—" },
  ], [prices]);

  // Right sidebar — EXA scan summary
  const scanSummary = useMemo(() => {
    const auth  = scan.filter((r) => r.scores.verdict === "AUTHORIZED").length;
    const delay = scan.filter((r) => r.scores.verdict === "DELAY").length;
    const denied = scan.filter((r) => r.scores.verdict === "DENIED").length;
    const noData = ALL_PAIRS.length - scan.length;
    return { auth, delay, denied, noData };
  }, [scan]);

  const handlePlanetClick = (assetKey: string) => {
    if (!assetKey) return;
    setAsset(assetKey);
    navigate("/");
  };

  const handleLoadComplete = () => {
    sessionStorage.setItem("nexus_loaded", "1");
    setIsLoading(false);
  };

  if (isLoading) return <LoadingScreen onComplete={handleLoadComplete} />;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <ThreeScene onPlanetClick={handlePlanetClick} planetStates={planetStates} />

      {/* ─ Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(0,1,6,0.82)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-black text-red-400 tracking-[0.3em] uppercase">WARROOM NEXUS</div>
          <div className="h-4 w-px bg-white/10" />
          <div className="text-[9px] text-white/30 tracking-wider">Asset Universe · Select your instrument</div>
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
          <button
            onClick={() => navigate("/polymarket")}
            className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition-all hover:text-white"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", color: "rgba(167,139,250,0.7)" }}
          >
            POLYMARKET →
          </button>
        </div>
      </div>

      {/* ─ Left panel — live prices ─────────────────────────────────────────── */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-2"
        style={{
          background: "rgba(0,1,6,0.78)", border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)", borderRadius: "12px", padding: "14px 16px",
          minWidth: "130px",
        }}
      >
        <div className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-1">Live Prices</div>
        {leftItems.map((item) => {
          const scanRow = scan.find((r) => {
            const meta = getAssetMeta(r.pair);
            return meta.label === item.title || r.pair === item.title.replace("/", "");
          });
          const dotColor = scanRow ? (VERDICT_DOT[scanRow.scores.verdict] ?? "#6b7280") : "#374151";
          const chg = prices[item.title.replace("/", "")]?.changePct;
          return (
            <div key={item.title} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
                <span className="text-[10px] text-white/50">{item.title}</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-black text-white/90 tabular-nums">{item.value}</div>
                {chg != null && (
                  <div className={`text-[8px] tabular-nums ${chg >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─ Right panel — EXA scan summary ──────────────────────────────────── */}
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 z-[400]"
        style={{
          background: "rgba(0,1,6,0.78)", border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)", borderRadius: "12px", padding: "14px 16px",
          minWidth: "140px",
        }}
      >
        <div className="text-[8px] text-white/30 uppercase tracking-[0.2em] mb-3">EXA Scan · {ALL_PAIRS.length} assets</div>

        <div className="space-y-2">
          {([
            ["AUTHORIZE", scanSummary.auth,  "#10b981"],
            ["DELAY",     scanSummary.delay, "#f59e0b"],
            ["DENY",      scanSummary.denied, "#ef4444"],
          ] as const).map(([label, count, color]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="text-[10px] font-black" style={{ color }}>{label}</span>
              </div>
              <span className="text-[13px] font-black tabular-nums" style={{ color }}>
                {count as number}
              </span>
            </div>
          ))}
          {scanSummary.noData > 0 && (
            <div className="flex items-center justify-between gap-4 opacity-40">
              <span className="text-[9px] text-white/40">NO DATA</span>
              <span className="text-[11px] text-white/40 tabular-nums">{scanSummary.noData}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[8px] text-white/25 leading-relaxed">
            Click any planet to enter<br />
            its Command screen
          </div>
        </div>
      </div>

      {/* ─ Bottom instruction strip ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[400] text-center"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="inline-block text-[9px] text-white/25 leading-relaxed px-4 py-2 rounded-lg"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Drag to rotate · Scroll to zoom · Click a planet to enter its Command
        </div>
      </div>
    </div>
  );
};

export default Index;
