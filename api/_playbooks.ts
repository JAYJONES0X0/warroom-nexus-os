// Server-side condensed WARROOM brain for ARCHON prompt injection.
// Distilled from the WARROOM NEXUS brain export (live trading protocol + asset
// playbooks + correlation matrix, backtested 2023–2025). Lives outside routing
// (underscore prefix) so Vercel doesn't treat it as an endpoint. This mirrors the
// client brain (src/lib/warroomBrain.ts) in the form ARCHON reasons with: prose.

export const WARROOM_DOCTRINE = `You are ARCHON — the WARROOM NEXUS autonomous analysis protocol. You are an
institutional-grade SMC/ICT analyst, NOT a signal bot or money printer. You read
order flow the way smart money engineers it, and you are ruthlessly honest: if the
setup isn't there, you say DENIED.

THE 4-LOCK AUTHORIZATION ENGINE (each 25%):
- LOCK 1 — MARKET STRUCTURE: HTF trend (D1/H4), Break of Structure (BOS) or Change
  of Character (CHoCH), swing high/low alignment.
- LOCK 2 — LIQUIDITY ENGINE: institutional order flow, liquidity sweeps / stop
  hunts, order blocks (demand/supply), Fair Value Gap (FVG) alignment.
- LOCK 3 — SESSION DYNAMICS: London / NY killzone alignment, high-impact news,
  volatility & volume profile.
- LOCK 4 — CONFLUENCE: multi-timeframe agreement (M15/H1/H4/D1), R:R ≥ 1:2,
  converging signals, correlation shield (correlated assets must agree).

AUTHORIZATION LADDER (confluence → action):
- 85-100 = MAXIMUM FIRE (full conviction) → signal DEPLOY
- 70-84  = GREEN LIGHT (execute) → signal DEPLOY
- 55-69  = AMBER (reduce / wait) → signal MONITOR
- 40-54  = RED ALERT (do not trade) → signal DENIED
- 0-39   = BLACKOUT (stand down) → signal DENIED

THE PARADOX CONE (mandatory): before concluding, run the inversion. If price just
broke a key level on weak follow-through with liquidity resting beyond, treat the
"breakout" as a sweep and expect reversal. Always state what would invalidate the
idea.

OUTPUT DISCIPLINE (non-negotiable):
- Ground every claim in the LIVE DATA and the PLAYBOOK provided. Do NOT invent
  precision you can't justify from a single snapshot — if you state entry/SL/TP,
  derive them from the round-number magnets, the day's range, and the bias given.
- Verify the CORRELATION SHIELD against the live prices. If correlated assets
  diverge from what the bias requires, lower confluence and say so explicitly.
- If the data is insufficient for a real read, return signal DENIED with honest
  reasoning. Never fabricate a setup to seem useful.
- The human is the final authority. You provide intelligence; they execute.`;

// Per-asset playbook briefs — real backtested figures, patterns, traps,
// correlation shield, and liquidity magnets.
const PLAYBOOKS: Record<string, string> = {
  EURUSD: `EUR/USD — Major Forex | Backtested WR 68%, avg R:R 1:3.2, expectancy +1.18R | ADR 60–100 pips.
Optimal: London killzone 07:00–10:00 GMT, NY 14:30–16:00 GMT. Most liquid pair on earth — textbook SMC.
Top setups: London Sweep→NY Reversal (73%): Asia builds EQH/EQL, London sweeps the liquidity, 15M CHoCH, enter OB retest.
CPI/NFP Pre-News Accumulation (78%): tight pre-news range, enter the post-news retest in the pre-news bias direction.
NY Open Liquidity Grab (68%): NY 14:30 spike grabs stops then reverses within 30 min.
Traps: round-number breakouts (1.1500, 1.1600 — sweep + reverse, never buy the break); news spikes (fade after 30 min); trendline breaks (liquidity magnets, wait for CHoCH).
Liquidity magnets: round numbers (0.01 steps), PDH/PDL, weekly H/L, EQH/EQL.
Correlation shield (verify live): inverse DXY (-0.95) → for LONG, DXY should be DOWN; with GBPUSD (+0.85) and XAUUSD (+0.70) → should move same way.
Thresholds: ≥80 full risk, 65–79 reduced, <65 stand aside.`,

  GBPUSD: `GBP/USD — Major Forex | Backtested WR 64%, avg R:R 1:2.8, expectancy +0.79R | ADR 80–150 pips (~2× EURUSD).
Optimal: London killzone 07:00–10:00 GMT, NY 14:30–16:00 GMT. Bigger range than EURUSD → wider sweeps, wider stops.
Top setups: London Sweep→NY Reversal; Asian range break→retest→continuation; NY open liquidity grab. Same SMC logic as EURUSD but more violent.
Traps: round-number breakouts (1.3400, 1.3500), news spikes, fakeouts on the London open.
Liquidity magnets: round numbers (0.01), PDH/PDL, weekly H/L.
Correlation shield (verify live): inverse DXY (-0.90) → for LONG, DXY should be DOWN; with EURUSD (+0.85) → should agree. If EURUSD and GBPUSD disagree, treat as divergence warning.
Thresholds: ≥80 full risk, 65–79 reduced, <65 stand aside.`,

  USDJPY: `USD/JPY — Major Forex | Backtested WR 71%, avg R:R 1:3.0, expectancy +1.13R | ADR 60–120 pips.
Optimal: Tokyo 00:00–03:00 GMT, NY 14:30–16:00 GMT. Yield-driven — tracks the US 10Y closely; 3rd-highest expectancy in WARROOM.
Top setups: Tokyo range → London/NY expansion; NY open liquidity grab; yield-divergence continuation.
Traps: BoJ intervention spikes near psychological levels (150.00, 155.00) — violent, fade only with structure; news whipsaws.
Liquidity magnets: 0.5–1.0 round levels (150.00, 151.00), PDH/PDL.
Correlation shield (verify live): positive to DXY (+0.70) and to US 10Y yields / risk-on. For LONG USDJPY, DXY should be UP.
Thresholds: ≥80 full risk, 65–79 reduced, <65 stand aside.`,

  XAUUSD: `XAU/USD (GOLD) — Commodity / Safe-haven | Backtested WR 72%, avg R:R 1:3.5, expectancy +1.52R (HIGHEST in WARROOM) | ADR $20–50.
Optimal: London 07:00–10:00 GMT, NY 14:30–16:00 GMT. The macro beast — moves on Fed policy, yields, geopolitics.
Top setups: Pre-CPI Accumulation→Post-CPI Delivery (82%); FOMC Rate-Decision Trap (79% — initial spike is a trap, real move 5–15 min later); London Sweep→NY Reversal (76%); Weekly H/L Sweep (73%); Geopolitical Spike→Fade (68% — emotional, not structural).
Traps: ATH breakouts (smart money sells into retail FOMO), news spikes, geopolitical FOMO — wait 24–48h.
Liquidity magnets: $50 round numbers (4200, 4250, 4300), ATH (massive), PDH/PDL, weekly H/L.
Correlation shield (verify live): inverse DXY (-0.75) and inverse US 10Y; with EURUSD (+0.70). For LONG gold, DXY should be DOWN. If gold rallies while DXY is flat/up, the move is NOT dollar-driven → flag divergence, reduce confluence.
Macro: BULLISH = dovish Fed, lower yields, weaker DXY, higher inflation, risk-off/geopolitics. BEARISH = hawkish Fed, higher yields, stronger DXY, risk-on.
Thresholds: ≥85 full risk, 75–84 reduced, <75 stand aside (gold demands higher confluence).`,

  BTCUSD: `BTC/USD — Crypto / Risk asset | Backtested WR 66%, avg R:R 1:2.9, expectancy +0.91R | ADR $1k–3k (can spike $5k+).
Optimal: NY 14:30–16:00 GMT, and weekends (Sat 12:00–18:00 GMT — thin books, sharp moves). Trades 24/7.
Top setups: NY open expansion; weekend liquidity sweep; round-number sweep→reversal.
Traps: round-number FOMO (65k, 70k), weekend low-liquidity stop hunts, leverage-cascade wicks.
Liquidity magnets: $1k round numbers (64000, 65000), prior day/weekly H/L, ATH.
Correlation shield (verify live): positive to NAS100 (+0.65) and SPX (risk-on), inverse to VIX. For LONG BTC, equities/NAS should be UP. Crypto-specific divergence (BTC up, equities down) = caution.
Thresholds: ≥80 full risk, 70–79 reduced, <70 stand aside.`,

  NAS100: `NAS100 — Equity index / Risk asset | Backtested WR 74%, avg R:R 1:3.1, expectancy +1.29R (2nd-highest in WARROOM) | ADR 150–300 pts.
Optimal: NY open 14:30–16:00 GMT, pre-market 13:00–14:30 GMT. Pure risk-on engine.
Top setups: NY-open drive (74%); pre-market accumulation → NY delivery; gap fill.
Traps: opening-range fakeouts, news-driven whipsaws (CPI/FOMC), end-of-day reversals.
Liquidity magnets: 250–500 pt round numbers, prior day H/L, opening range H/L.
Correlation shield (verify live): +0.95 with SPX (must agree), positive with BTC, inverse VIX. If NAS and SPX disagree, that's a major divergence — stand aside.
Thresholds: ≥80 full risk, 70–79 reduced, <70 stand aside.`,

  SPX: `SPX500 — Equity index / Risk asset | Backtested WR 73%, avg R:R 1:3.0, expectancy +1.19R (4th-highest) | ADR 30–80 pts.
Optimal: NY open 14:30–16:00 GMT, pre-market 13:00–14:30 GMT. The risk-on benchmark.
Top setups: NY-open drive; pre-market accumulation; mean-reversion to VWAP/round number.
Traps: opening fakeouts, headline whipsaws, late-day reversals.
Liquidity magnets: 50-pt round numbers, prior day H/L.
Correlation shield (verify live): +0.95 with NAS100 (must agree), inverse VIX (-0.95), positive AUDUSD. NAS is the lead — confirm against it.
Thresholds: ≥80 full risk, 70–79 reduced, <70 stand aside.`,

  DXY: `DXY — US Dollar Index | ADR 0.30–0.80 pts. Optimal: London 07:00–10:00, NY 14:30–16:00 GMT.
The dollar's pulse — inverse to almost everything. DXY direction is the master filter for every FX/gold read.
Setups: round-number sweep→reversal at 100.00 / whole numbers; range break on US data.
Correlation shield: inverse EURUSD (-0.95), GBPUSD (-0.90), AUDUSD (-0.85), Gold (-0.75); positive USDJPY (+0.70). A clean DXY read confirms or vetoes everything else.
Liquidity magnets: 0.5–1.0 round levels (100.00).
Thresholds: ≥80 full risk, 65–79 reduced, <65 stand aside.`,
};

export function getPlaybook(pair: string): string {
  return PLAYBOOKS[pair] ??
    `No dedicated playbook for ${pair}. Apply core 4-LOCKS SMC methodology: HTF structure, liquidity sweeps, session timing, and correlation shield. Demand ≥70 confluence.`;
}

// Round-number liquidity-magnet step per instrument (mirrors the client brain).
const ROUND_STEP: Record<string, number> = {
  EURUSD: 0.01, GBPUSD: 0.01, USDJPY: 0.5, GBPJPY: 1.0, AUDUSD: 0.01,
  NZDUSD: 0.01, XAUUSD: 50, BTCUSD: 1000, NAS100: 500, SPX: 50, DXY: 1.0,
};

export function roundMagnet(pair: string, price: number): string {
  const step = ROUND_STEP[pair];
  if (!step || !price) return "n/a";
  const nearest = Math.round(price / step) * step;
  const distPct = Math.abs(price - nearest) / price * 100;
  const dec = step < 1 ? 4 : step >= 100 ? 0 : 2;
  return distPct < 0.08
    ? `AT magnet ${nearest.toFixed(dec)} (sweep risk)`
    : `${distPct.toFixed(2)}% from ${nearest.toFixed(dec)}`;
}
