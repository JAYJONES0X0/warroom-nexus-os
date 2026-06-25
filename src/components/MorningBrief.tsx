import { useNavigate } from "react-router-dom";
import { usePrices } from "@/hooks/usePrices";
import { usePolymarkets } from "@/hooks/usePolymarkets";
import { useEdges } from "@/hooks/useEdges";
import { useEXAScan } from "@/hooks/useEXAScores";
import { MacroCalendar } from "@/components/MacroCalendar";
import {
  WARROOM_ASSETS,
  getSessionLabel,
  getNextKillzone,
  formatCountdown,
  isKillzone,
} from "@/lib/warroomCommand";

const ALL_ASSETS = WARROOM_ASSETS.map((a) => a.key);

const PRICE_WATCH = ["EURUSD", "XAUUSD", "GBPUSD", "NAS100", "BTCUSD"] as const;

const shortLabel: Record<string, string> = {
  EURUSD: "EUR/USD", XAUUSD: "XAU/USD", GBPUSD: "GBP/USD",
  NAS100: "NAS100",  BTCUSD: "BTC/USD",
};

const MorningBrief = () => {
  const navigate = useNavigate();
  const { prices } = usePrices();
  const poly = usePolymarkets();
  const edges = useEdges(1000);
  const scan = useEXAScan(ALL_ASSETS);

  const session = getSessionLabel();
  const nextKZ = getNextKillzone();
  const inKZ = isKillzone(session);

  const topPoly = poly.markets
    .filter((m) => m.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 3);

  const topSetups = scan
    .filter((r) => r.scores.verdict !== "DENIED")
    .sort((a, b) => b.scores.composite - a.scores.composite)
    .slice(0, 2);

  const liveEdges = edges.edges.length;
  const edgeColor = liveEdges >= 3 ? "#10b981" : liveEdges >= 1 ? "#f59e0b" : "#6b7280";

  return (
    <div
      className="fixed left-4 bottom-16 z-[400]"
      style={{ maxWidth: "520px", width: "calc(100vw - 200px)" }}
    >
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "rgba(0,1,6,0.88)",
          borderColor: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px]">☀</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Morning Brief
            </span>
            <span className="text-[8px] font-mono text-white/20 tabular-nums">
              {new Date().toISOString().slice(0, 10).replace(/-/g, ".")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: inKZ ? "#10b981" : "#6b7280" }}
            />
            <span
              className="text-[8px] font-black uppercase tracking-wider"
              style={{ color: inKZ ? "#10b981" : "rgba(255,255,255,0.3)" }}
            >
              {session}
            </span>
          </div>
        </div>

        {/* Body: 3-column grid */}
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {/* ── COL 1: Top Poly Markets ── */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-1 rounded-full bg-purple-400" />
              <span className="text-[7px] uppercase tracking-[0.2em] text-purple-400/70 font-black">
                Top Poly Markets
              </span>
            </div>
            {topPoly.length === 0 ? (
              <div className="text-[8px] text-white/20 font-mono">Loading...</div>
            ) : (
              <div className="space-y-1.5">
                {topPoly.map((m, i) => (
                  <div key={m.id} className="text-[8px] leading-tight">
                    <span className="text-white/30 mr-1">{i + 1}.</span>
                    <span className="text-white/70">{m.question.slice(0, 32)}</span>
                    <div className="flex gap-2 mt-0.5">
                      <span className="font-black tabular-nums" style={{ color: m.yesPrice > 0.5 ? "#10b981" : "#ef4444" }}>
                        ¢{(m.yesPrice * 100).toFixed(0)}
                      </span>
                      <span className="text-white/20">${(m.volume24h / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate("/polymarket")}
              className="mt-2 text-[7px] font-black uppercase tracking-wider text-purple-400/50 hover:text-purple-400 transition-colors"
            >
              Open Polymarket →
            </button>
          </div>

          {/* ── COL 2: Today's Events + Arb Scan ── */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-[7px] uppercase tracking-[0.2em] text-amber-400/70 font-black">
                Today's Events
              </span>
            </div>
            <div className="max-h-[100px] overflow-y-auto">
              <MacroCalendar />
            </div>
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: edgeColor }} />
                  <span className="text-[7px] uppercase tracking-[0.15em] text-white/30 font-black">
                    Arb Scan
                  </span>
                </div>
                <span className="text-[9px] font-black tabular-nums" style={{ color: edgeColor }}>
                  {edges.loading ? "..." : `${liveEdges} live`}
                </span>
              </div>
              {edges.scanned && (
                <div className="text-[7px] text-white/20 font-mono mt-0.5">
                  {edges.scanned.candidates} candidates · {edges.scanned.executable} executable
                </div>
              )}
            </div>
          </div>

          {/* ── COL 3: Price Snapshot + Top Setups ── */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-1 rounded-full bg-emerald-400" />
              <span className="text-[7px] uppercase tracking-[0.2em] text-emerald-400/70 font-black">
                Price Snapshot
              </span>
            </div>
            <div className="space-y-1">
              {PRICE_WATCH.map((k) => {
                const p = prices[k];
                if (!p) return null;
                const up = p.changePct >= 0;
                return (
                  <div key={k} className="flex items-center justify-between text-[8px]">
                    <span className="text-white/40 w-14">{shortLabel[k] ?? k}</span>
                    <span className="font-black tabular-nums text-white/80">
                      {p.price.toFixed(k === "XAUUSD" ? 2 : k === "EURUSD" || k === "GBPUSD" ? 5 : 0)}
                    </span>
                    <span
                      className={`font-black tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {up ? "+" : ""}{p.changePct.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top 2 Setups */}
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1 h-1 rounded-full bg-sky-400" />
                <span className="text-[7px] uppercase tracking-[0.15em] text-sky-400/70 font-black">
                  Top Setups
                </span>
              </div>
              {topSetups.length === 0 ? (
                <div className="text-[7px] text-white/20 font-mono">No setups — conditions denied</div>
              ) : (
                <div className="space-y-1">
                  {topSetups.map((r) => {
                    const c = r.scores.composite;
                    const verdictColor = c >= 82 ? "#10b981" : c >= 62 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={r.pair} className="flex items-center justify-between text-[8px]">
                        <span className="text-white/80 font-black">{r.pair}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black tabular-nums" style={{ color: verdictColor }}>
                            {c}/100
                          </span>
                          <span className={`font-mono ${r.scores.bias === "BULLISH" ? "text-emerald-400" : r.scores.bias === "BEARISH" ? "text-red-400" : "text-white/20"}`}>
                            {r.scores.bias === "BULLISH" ? "▲" : r.scores.bias === "BEARISH" ? "▼" : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Killzone countdown */}
            {nextKZ && !inKZ && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-white/30">{nextKZ.label}</span>
                  <span className="font-black tabular-nums text-amber-400">
                    {formatCountdown(nextKZ.minutesAway)}
                  </span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-2 pt-2 border-t flex gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider border transition-all"
                style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}
              >
                Open Command
              </button>
              <button
                onClick={() => navigate("/markets")}
                className="flex-1 py-1 rounded text-[7px] font-black uppercase tracking-wider border transition-all"
                style={{ color: "#38bdf8", borderColor: "rgba(56,189,248,0.2)", background: "rgba(56,189,248,0.05)" }}
              >
                Open Markets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MorningBrief;
