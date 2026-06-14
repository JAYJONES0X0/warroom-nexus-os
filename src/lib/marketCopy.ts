import type { PolyMarket } from "@/hooks/usePolymarkets";

// Turns the honest engine output into plain English an operator can act on —
// the "architects of clarity" layer. Every market answers: the call, why it's
// here, and the discipline that governs it.
export interface MarketCopy {
  call: string;        // the headline, in human words
  why: string;         // why it's on the board
  discipline: string;  // what governs the play / what kills it
}

const liqStr = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
const whenStr = (d: number | null) => (d === 0 ? "today" : d === 1 ? "tomorrow" : d != null ? `in ${d} days` : "soon");

export function marketCopy(m: PolyMarket): MarketCopy {
  const yes = Math.round(m.yesPrice * 100);
  const liq = liqStr(m.liquidity);
  const when = whenStr(m.daysLeft);

  switch (m.edge) {
    case "ARB":
      return {
        call: "Free-money spread",
        why: `Both sides priced under $1 — buy YES and NO together and lock a guaranteed return. ${liq} deep, settles ${when}.`,
        discipline: "The only true edge on the board. Size to what the book can fill.",
      };
    case "CONTESTED":
      return {
        call: `Coin-flip — the market implies YES ${yes}%`,
        why: `The crowd can't decide · ${liq} deep · settles ${when}. Toss-ups are where your read and discipline pay most.`,
        discipline: "Only act if you have a genuine read. The outcome isn't yours to set — your action is. Hold it.",
      };
    case "CONSENSUS":
      return {
        call: `Heavy favorite — the market implies YES ${yes}%`,
        why: `Strongly priced in · ${liq} deep · settles ${when}. Little left to win unless the crowd is wrong.`,
        discipline: "Only play if you can name a concrete reason it's mispriced. Otherwise skip — no shame in passing.",
      };
    case "LONGSHOT":
      return {
        call: `Underdog — the market implies YES ${yes}%`,
        why: `Asymmetric · ${liq} deep · settles ${when}. Small stake, big payout if it lands; the base rate favors the crowd.`,
        discipline: "Tiny size only. Most of these lose — that's exactly why the stake stays small.",
      };
    default:
      return {
        call: `The market implies YES ${yes}%`,
        why: `${liq} deep · settles ${when}.`,
        discipline: "The price is the best estimate there is. Act on conviction, size with discipline.",
      };
  }
}
