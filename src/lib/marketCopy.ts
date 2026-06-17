import type { PolyMarket } from "@/hooks/usePolymarkets";

export type MarketCategory = "GEOPOLITICAL" | "SPORTS" | "MACRO" | "CRYPTO" | "EVENTS";

export interface MarketCopy {
  call: string;
  why: string;
  discipline: string;
  flow: "IN" | "OUT" | "FLAT";
  category: MarketCategory;
  urgency: "HOT" | "ACTIVE" | "COLD"; // HOT = settles ≤1d, ACTIVE = ≤7d, COLD = >7d
}

const liqStr = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;

function priceTier(y: number): string {
  if (y >= 88) return "near-certain YES";
  if (y >= 72) return "strong favourite";
  if (y >= 56) return "slight lean YES";
  if (y >= 44) return "50/50 contested";
  if (y >= 28) return "slight lean NO";
  if (y >= 12) return "strong no-favourite";
  return "near-certain NO";
}

export function inferCategory(question: string): MarketCategory {
  const q = question.toLowerCase();
  if (/\b(iran|russia|ukraine|china|israel|hamas|nato|war|military|troop|government|election|president|congress|senate|trump|biden|eu\b|un\b|nuclear|missile|sanction|treaty|diplomat|ceasefire|invasion)\b/.test(q))
    return "GEOPOLITICAL";
  if (/vs\.?\s|\b(nfl|nba|mlb|nhl|ufc|boxing|tennis|golf|f1|formula)\b|\b(team|game|match|series|championship|playoffs|season|score|goal|touchdown|wicket)\b/.test(q))
    return "SPORTS";
  if (/\b(fed\b|federal reserve|interest rate|inflation|cpi\b|gdp\b|recession|economy|treasury|yield|s&p|nasdaq|dow|earnings|labor|unemployment|tariff|powell|ecb|boe)\b/.test(q))
    return "MACRO";
  if (/\b(bitcoin|btc\b|ethereum|eth\b|crypto|blockchain|solana|sol\b|bnb\b|defi\b|nft\b|altcoin|stablecoin|coinbase|binance)\b/.test(q))
    return "CRYPTO";
  return "EVENTS";
}

const CATEGORY_DISCIPLINE: Record<MarketCategory, { fomo: string; fade: string; quiet: string }> = {
  GEOPOLITICAL: {
    fomo: "Geopolitical markets move on news that can reverse fast. Know the specific catalyst — rumour and confirmed development are very different bets.",
    fade: "Political panic often overshoots. Ask whether the fundamentals actually changed or if this is fear-driven. Fear fades; facts don't.",
    quiet: "Geopolitical stalemates can snap without warning. Know what your trigger for entry would be before it happens.",
  },
  SPORTS: {
    fomo: "Sports markets reprice on injury news, starting lineups, weather, venue. Confirm which variable drove this before following the move.",
    fade: "Public teams get over-backed and sharp money fades them. If this looks like public sentiment rather than sharp positioning, the fade can be clean.",
    quiet: "This market hasn't moved — either sharp money agrees it's fairly priced or no one with a strong view has acted yet.",
  },
  MACRO: {
    fomo: "Macro markets move on data releases and Fed signals. Confirm the catalyst — reaction to a confirmed print is different from front-running a rumour.",
    fade: "Over-reaction to a single data point is common. Ask whether the macro trend actually changed or whether this reverts when the dust settles.",
    quiet: "Macro markets in equilibrium often stay there until the next scheduled event. Know your catalyst before entering.",
  },
  CRYPTO: {
    fomo: "Crypto prediction markets are reflexive and thin. Sentiment drives price which drives sentiment. Volume context matters more than price level here.",
    fade: "Crypto markets reverse hard. If this is a panic flush, the bounce thesis needs the same discipline as the follow thesis.",
    quiet: "Flat crypto market = either balanced conviction or low interest. Volume confirms which — low volume means no one cares yet.",
  },
  EVENTS: {
    fomo: "Something real shifted this market. Verify what it was before adding to the consensus — the crowd got here first.",
    fade: "Over-correction in event markets is common when new information is ambiguous. The value is in reading further ahead than the crowd.",
    quiet: "No money signal here. The crowd has settled its view. Only act if you have a specific read the market doesn't.",
  },
};

function buildBody(
  yes: number, pts: number, vol: string, when: string,
  daysLeft: number | null, category: MarketCategory,
): { why: string; discipline: string } {
  const abs = Math.abs(pts);
  const up = pts > 0;
  const tier = priceTier(yes);
  const settling = daysLeft != null && daysLeft <= 3;
  const urgencyNote = settling ? ` Settles ${when} — limited time to act.` : ` Settles ${when}.`;
  const disc = CATEGORY_DISCIPLINE[category];

  // Stampede: big move (≥20¢)
  if (abs >= 20) {
    if (up && yes >= 82) {
      return {
        why: `${abs}¢ stampede to ${tier}. ${vol} cleared in 24h.${urgencyNote} At ${yes}¢ the crowd is near-decided — you're paying to bet against ${yes}% confidence.`,
        discipline: `Asymmetric risk against you at this price. The only valid play is a strong contrarian thesis with a defined invalidation. ${disc.fade}`,
      };
    }
    if (!up && yes <= 18) {
      return {
        why: `Collapsed ${abs}¢ to ${tier} at ${yes}¢. ${vol} in 24h.${urgencyNote} Crowd has near-abandoned YES. Either this is pricing in resolution or there's a low-probability comeback thesis.`,
        discipline: `Near-zero with time remaining = someone might know something, or this is just finishing. Define the comeback thesis precisely before acting. ${disc.fomo}`,
      };
    }
    if (up) {
      return {
        why: `Sharp ${abs}¢ conviction push to ${tier} at ${yes}¢. ${vol} in 24h.${urgencyNote} This is organised buying, not drift — something changed.`,
        discipline: `Chasing a sharp move without identifying the catalyst is momentum gambling. Find the why first. ${disc.fomo}`,
      };
    }
    return {
      why: `Sharp ${abs}¢ sell-off to ${tier} at ${yes}¢. ${vol} in 24h.${urgencyNote} Real conviction behind this — the crowd is repricing something specific.`,
      discipline: `Fear can overshoot. Confirm the catalyst before fading or following. ${disc.fade}`,
    };
  }

  // Clear move: 5-20¢
  if (abs >= 5) {
    if (up) {
      return {
        why: `${abs}¢ clear move ${up ? "into YES" : "toward NO"} — from ${yes - pts}¢ to ${yes}¢. ${vol} in 24h.${urgencyNote} Deliberate positioning, not noise.`,
        discipline: `This is a directional bet with real money behind it. Confirm the reason before following. ${disc.fomo}`,
      };
    }
    return {
      why: `${abs}¢ clear move toward NO — from ${yes - pts}¢ to ${yes}¢. ${vol} in 24h.${urgencyNote} Money is rotating against YES.`,
      discipline: `Confirm whether this is new information or a correction of prior over-pricing. ${disc.fade}`,
    };
  }

  // Drift: 2-5¢
  if (up) {
    return {
      why: `${abs}¢ drift toward YES — now ${tier} at ${yes}¢. ${vol} vol.${urgencyNote} Mild lean from the crowd, not a stampede.`,
      discipline: `Small drift = small conviction. Enter only if your own analysis independently supports the direction. ${disc.quiet}`,
    };
  }
  return {
    why: `${abs}¢ drift toward NO — now ${tier} at ${yes}¢. ${vol} vol.${urgencyNote} Mild pressure, not a collapse.`,
    discipline: `Drifting markets can continue or reverse with equal frequency. Wait for conviction before committing. ${disc.quiet}`,
  };
}

export function marketCopy(m: PolyMarket): MarketCopy {
  const yes = Math.round(m.yesPrice * 100);
  const move = m.move24h ?? 0;
  const pts = Math.round(move * 100);
  const wasYes = Math.max(0, Math.min(100, yes - pts));
  const vol = liqStr(m.volume24h);
  const daysLeft = m.daysLeft ?? null;
  const whenStr = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : daysLeft != null ? `in ${daysLeft}d` : "soon";
  const flow: MarketCopy["flow"] = pts >= 2 ? "IN" : pts <= -2 ? "OUT" : "FLAT";
  const category = inferCategory(m.question);
  const urgency: MarketCopy["urgency"] = daysLeft != null && daysLeft <= 1 ? "HOT" : daysLeft != null && daysLeft <= 7 ? "ACTIVE" : "COLD";

  if (m.edge === "ARB") {
    return {
      call: "Possible mispricing — confirm in the Edge Engine",
      why: `Outcome prices look dislocated, but a single market cannot prove an executable basket. ${liqStr(m.liquidity)} liquidity, settles ${whenStr}. The Edge Engine walks the orderbook to confirm.`,
      discipline: "A candidate, not a confirmed edge. Only the CLOB-verified basket counts.",
      flow: "FLAT", category, urgency,
    };
  }

  if (Math.abs(pts) >= 5) {
    const dir = pts > 0 ? "into YES" : "out of YES";
    const arrow = pts > 0 ? `${wasYes}¢ → ${yes}¢ (+${pts})` : `${wasYes}¢ → ${yes}¢ (${pts})`;
    const { why, discipline } = buildBody(yes, pts, vol, whenStr, daysLeft, category);
    return { call: `Money moving ${dir} — ${arrow} in 24h`, why, discipline, flow, category, urgency };
  }

  if (Math.abs(pts) >= 2) {
    const { why, discipline } = buildBody(yes, pts, vol, whenStr, daysLeft, category);
    return {
      call: `YES ${pts > 0 ? "drifting up" : "drifting down"} — ${pts > 0 ? "+" : ""}${pts}¢ in 24h, now ${yes}¢`,
      why, discipline, flow, category, urgency,
    };
  }

  const liq = liqStr(m.liquidity);
  return {
    call: `Quiet line — YES holding ${yes}¢`,
    why: `Barely moved in 24h · ${liq} deep · settles ${whenStr}. No money signal — the crowd has settled here. ${vol} confirms low conviction from both sides.`,
    discipline: CATEGORY_DISCIPLINE[category].quiet,
    flow: "FLAT", category, urgency,
  };
}
