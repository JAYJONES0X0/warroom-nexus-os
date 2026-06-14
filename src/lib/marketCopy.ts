import type { PolyMarket } from "@/hooks/usePolymarkets";

// Turns the honest engine output into plain English an operator can act on.
// The headline is the MONEY-FLOW story — how the price moved in 24h — because
// that's the one real, decision-relevant signal (where the money is going),
// not "it's a coin-flip, you decide."
export interface MarketCopy {
  call: string;        // the money-flow headline
  why: string;         // context: liquidity, timing, what it means
  discipline: string;  // the rule that governs the play
  flow: "IN" | "OUT" | "FLAT"; // direction of 24h money flow on YES
}

const liqStr = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
const whenStr = (d: number | null) => (d === 0 ? "today" : d === 1 ? "tomorrow" : d != null ? `in ${d} days` : "soon");

export function marketCopy(m: PolyMarket): MarketCopy {
  const yes = Math.round(m.yesPrice * 100);
  const move = m.move24h ?? 0;            // probability points (-1..1)
  const pts = Math.round(move * 100);     // e.g. -15
  const wasYes = Math.max(0, Math.min(100, yes - pts)); // ~where YES sat 24h ago
  const liq = liqStr(m.liquidity);
  const vol = liqStr(m.volume24h);
  const when = whenStr(m.daysLeft);
  const flow: MarketCopy["flow"] = pts >= 2 ? "IN" : pts <= -2 ? "OUT" : "FLAT";

  // Real arbitrage trumps everything.
  if (m.edge === "ARB") {
    return {
      call: "Free-money spread — buy both sides under $1",
      why: `A true arbitrage: lock a guaranteed return regardless of outcome. ${liq} liquidity, settles ${when}.`,
      discipline: "The only sure edge on the board. Size to what the book can fill.",
      flow: "FLAT",
    };
  }

  if (Math.abs(pts) >= 5) {
    const dir = pts > 0 ? "into YES" : "out of YES";
    const arrow = pts > 0 ? `${wasYes}¢ → ${yes}¢ (+${pts})` : `${wasYes}¢ → ${yes}¢ (${pts})`;
    return {
      call: `Money moving ${dir} — ${arrow} in 24h`,
      why: `The line repriced ${Math.abs(pts)} points on ${vol} of 24h volume · settles ${when}. Something shifted — find out what before it settles, then decide if the move's right or overdone.`,
      discipline: pts > 0
        ? "Ride it only if you know the why. Chasing a move you can't explain is gambling."
        : "A crash like this is fear or fact. If it's overdone, the fade is the play — but only with a reason.",
      flow,
    };
  }

  if (Math.abs(pts) >= 2) {
    const dir = pts > 0 ? "drifting up" : "drifting down";
    return {
      call: `YES ${dir} — ${pts > 0 ? "+" : ""}${pts}¢ in 24h, now ${yes}¢`,
      why: `Mild money flow ${pts > 0 ? "toward YES" : "toward NO"} · ${liq} deep · settles ${when}. Worth a watch, not yet a stampede.`,
      discipline: "Small drift = small conviction. Only act if your own read agrees with the flow.",
      flow,
    };
  }

  // Flat — no money signal.
  return {
    call: `Quiet line — YES holding ${yes}¢`,
    why: `Barely moved in 24h · ${liq} deep · settles ${when}. No money signal — the crowd's settled here.`,
    discipline: "No flow, no edge. Skip unless YOU have a read the market doesn't. Patience is a position.",
    flow: "FLAT",
  };
}
