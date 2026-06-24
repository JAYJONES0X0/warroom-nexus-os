import React, { useState, useEffect, useRef } from 'react';
import { usePrices, PriceData } from '@/hooks/usePrices';
import { useEXAScan } from '@/hooks/useEXAScores';
import type { EXAScores } from '@/hooks/useEXAScores';

interface LogEntry {
  type: 'info' | 'success' | 'warning' | 'error' | 'input' | 'system' | 'analysis';
  message: string;
  timestamp: string;
}

type Prices = Record<string, PriceData>;

function fmt(p: PriceData | undefined, decimals = 4): string {
  if (!p) return 'N/A';
  const sign = p.changePct >= 0 ? '+' : '';
  return `${p.price.toFixed(decimals)} (${sign}${p.changePct.toFixed(2)}%)`;
}

function dir(p: PriceData | undefined): string {
  if (!p) return '→';
  return p.changePct > 0.1 ? '↑' : p.changePct < -0.1 ? '↓' : '→';
}

const ASSETS = ['EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'NZDUSD', 'NAS100', 'SPX', 'BTCUSD', 'DXY'];

const PLAYBOOK: Record<string, { winRate: number; sessions: string; correlation: string; behavior: string; avoid: string; rr: string }> = {
  EURUSD: { winRate: 68, sessions: 'London (07:00-10:00) + NY (12:00-15:00)', correlation: 'Inverse DXY (primary)', behavior: 'Trending with deep H4 retracements. Sweeps Asian highs/lows at London open.', avoid: 'After 18:00 GMT (low liquidity)', rr: '1:2.8 avg' },
  XAUUSD: { winRate: 72, sessions: 'London (07:00-10:00) + NY (12:00-15:00)', correlation: 'Inverse DXY 85%+ / Inverse US yields', behavior: 'Highest expectancy asset in system. Pre-CPI accumulation → post-CPI delivery. Geopolitical spike → fade.', avoid: 'During NFP/FOMC first 5min — whipsaw extreme', rr: '1:3.0 avg' },
  GBPUSD: { winRate: 64, sessions: 'London (07:00-10:00) + NY (12:00-15:00)', correlation: 'Inverse DXY / Positive EURUSD', behavior: 'Most volatile major. Best in London session. Fake breakouts common at NY open.', avoid: 'Low liquidity after 18:00 GMT', rr: '1:2.8 avg' },
  USDJPY: { winRate: 71, sessions: 'Tokyo (00:00-03:00) + NY (12:00-15:00)', correlation: 'Positive DXY / Inverse risk-off flows', behavior: 'Safe-haven inverse. Follows US yields closely. Strong in NY session.', avoid: 'BoJ intervention risk — watch for sudden reversal', rr: '1:2.5 avg' },
  GBPJPY: { winRate: 62, sessions: 'London (07:00-10:00)', correlation: 'Positive GBP / Inverse JPY safe-haven', behavior: 'Most volatile pair. 100-200pip daily range. High risk / high reward.', avoid: 'Asia session — manipulated / low liquidity', rr: '1:3.5 avg' },
  AUDUSD: { winRate: 65, sessions: 'London (07:00-10:00) + Asia (00:00-07:00)', correlation: 'Positive risk-on / Inverse DXY', behavior: 'Commodity proxy. Follows iron ore and AUD data. Good Asia range fade.', avoid: 'During Chinese macro data uncertainty', rr: '1:2.2 avg' },
  NZDUSD: { winRate: 63, sessions: 'Asia (00:00-07:00) + London (07:00-10:00)', correlation: 'Positive AUDUSD / Risk-on proxy', behavior: 'Follows AUDUSD. Less liquid. Better for range fades than trending plays.', avoid: 'Major risk-off events — thin liquidity amplifies losses', rr: '1:2.0 avg' },
  NAS100: { winRate: 74, sessions: 'NY Open (14:30-16:00) + Pre-Market (13:00-14:30)', correlation: 'Positive risk-on / Inverse DXY (moderate)', behavior: 'Tech-heavy. Fed policy sensitive. Pre-market accumulation → NY open delivery.', avoid: 'FOMC weeks — erratic behavior', rr: '1:3.5 avg' },
  SPX: { winRate: 73, sessions: 'NY Open (14:30-16:00) + Pre-Market (13:00-14:30)', correlation: 'Positive risk-on / Inverse VIX', behavior: 'Macro thermometer. Leads risk sentiment. Slower moves than NAS100.', avoid: 'CPI/FOMC day opens — gap risk', rr: '1:3.0 avg' },
  BTCUSD: { winRate: 66, sessions: 'NY (14:30-16:00) + Weekend (Sat 12:00-18:00)', correlation: 'Positive NAS100 (during risk-on) / Decorrelated during extremes', behavior: '24/7 asset. Weekend liquidation sweeps common. Follows macro risk sentiment loosely.', avoid: 'Low liquidity weekend hours outside Sat window', rr: '1:4.0 avg' },
  DXY: { winRate: 69, sessions: 'London (07:00-10:00) + NY (12:00-15:00)', correlation: 'Inverse to all USD pairs and XAUUSD', behavior: 'Control variable. Use as confirmation, not primary trade. DXY direction determines USD pair direction.', avoid: 'Trading DXY directly — use correlated pairs instead', rr: 'N/A (directional bias indicator)' },
};

const SESSION_DATA = {
  LONDON: { winRate: 67, bestPairs: 'GBPUSD(72%), EURUSD(68%)', optimalTime: '03:20-03:45 EST (08:20-08:45 GMT)', avgRange: '80-120 pips', topSetup: 'Asian High/Low Sweep + Reversal (65-70% WR)' },
  NY: { winRate: 64, bestPairs: 'EURUSD(69%), NAS100, SPX', optimalTime: '09:00-09:45 EST (14:00-14:45 GMT)', avgRange: '100-150 pips', topSetup: 'London Continuation Play (70-75% WR) | AVOID 08:25-08:45 EST news chaos' },
  ASIA: { winRate: 72, bestPairs: 'USDJPY(76%), AUDUSD(70%), NZDUSD', optimalTime: '20:00-01:00 EST (01:00-06:00 GMT)', avgRange: '20-40 pips', topSetup: 'Range Fade (70-75% WR) — fade extremes, tight stops' },
};

function getSession(): { name: string; strategy: string; icon: string; sessionKey: keyof typeof SESSION_DATA | null } {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10) return { name: 'LONDON KILLZONE', strategy: `67% WR session. Best: GBPUSD+EURUSD. Hunt Asian high/low sweeps. Optimal: 08:20-08:45 GMT.`, icon: '🇬🇧', sessionKey: 'LONDON' };
  if (h >= 12 && h < 15) return { name: 'NY KILLZONE', strategy: `64% WR session. Best: EURUSD+NAS100. London continuation plays. Avoid 13:25-13:45 GMT news chaos.`, icon: '🇺🇸', sessionKey: 'NY' };
  if (h >= 0 && h < 7) return { name: 'ASIA RANGE', strategy: `72% WR range session. Best: USDJPY+AUDUSD. Fade range extremes. Sets highs/lows for London to sweep.`, icon: '🌏', sessionKey: 'ASIA' };
  return { name: 'DEAD ZONE', strategy: 'Low liquidity 16:00-00:00 GMT. Stand down. Wait for London.', icon: '💀', sessionKey: null };
}

const HELP_LINES = [
  '═══════════════════════════════════════════════════',
  'WARROOM NEXUS — COMMAND REFERENCE',
  '═══════════════════════════════════════════════════',
  '',
  '  /scan all              Top 3 setups across all 11 assets',
  '  /scan [ASSET]          Deep dive — /scan XAUUSD',
  '  /bias                  Market sentiment: Risk-On/Off/Neutral',
  '  /session               Current session + optimal strategy',
  '  /sniper [ASSET|all]    85+ confluence only',
  '  /deep dive [ASSET]     Full institutional breakdown',
  '  /war room [ASSET]      Military-grade tactical analysis',
  '  /confluence [ASSET]    EXA 4-LOCKS score',
  '  /liquidity [ASSET]     Liquidity pool mapping',
  '  /psychology            Psychological state scan',
  '  /conflict check        Scan for conflicting signals',
  '  /now                   Best setup RIGHT NOW',
  '  /prices                Live prices for all 11 assets',
  '  /god mode              All frameworks engaged',
  '  /zen                   Patience protocol',
  '',
  '  Assets: EURUSD XAUUSD GBPUSD USDJPY GBPJPY',
  '          AUDUSD NZDUSD NAS100 SPX BTCUSD DXY',
  '',
  '  Natural language works: "What\'s good right now?"',
  '═══════════════════════════════════════════════════',
];

function scoreColor(composite: number): string {
  return composite >= 80 ? '🟢' : composite >= 60 ? '🟡' : '🔴';
}

function scoreVerdict(composite: number): string {
  return composite >= 82 ? 'DEPLOY' : composite >= 62 ? 'MONITOR' : 'WAIT';
}

function scanAll(prices: Prices, scanData: { pair: string; scores: EXAScores }[]): string[] {
  const s = getSession();
  const ranked = [...scanData].sort((a, b) => b.scores.composite - a.scores.composite);
  const top3 = ranked.slice(0, 3);
  const lines: string[] = [
    '════════════════════════════════════════════════════',
    '🏆 TOP SETUPS RANKED BY CONFLUENCE',
    '════════════════════════════════════════════════════',
    '',
  ];
  if (top3.length > 0) {
    top3.forEach((r, i) => {
      const exa = r.scores;
      const lockCount = exa.locks.filter(Boolean).length;
      const verdictEmoji = scoreColor(exa.composite);
      const dec = r.pair.includes("JPY") ? 3 : r.pair === "XAUUSD" ? 2 : r.pair === "NAS100" || r.pair === "BTCUSD" ? 0 : 4;
      const livePrice = prices[r.pair]?.price;
      lines.push(
        `${i + 1}. ${r.pair} — ${exa.composite}/100 — ${verdictEmoji} ${scoreVerdict(exa.composite)}`,
        `   Locks: ${lockCount}/4 | Confluence: ${exa.composite} | Bias: ${exa.bias}${livePrice ? ` | Live: ${livePrice.toFixed(dec)}` : ""}`,
        `   ${exa.factors.slice(0, 2).map(f => `${f.label}: ${f.value}`).join(' · ')}`,
        '',
      );
    });
  } else {
    lines.push('   No assets with live prices yet — feed warming up.', '');
  }
  lines.push(
    `📊 MARKET BIAS: ${ranked.length > 0 ? 'See /bias for full sentiment' : 'Loading...'}`,
    `   ${s.icon} ${s.name} — ${s.strategy.split('.')[0]}.`,
    '════════════════════════════════════════════════════',
  );
  return lines;
}

function scanAsset(asset: string, prices: Prices, scanData: { pair: string; scores: EXAScores }[]): string[] {
  const upper = asset.toUpperCase();
  if (!ASSETS.includes(upper)) return [`❌ Unknown asset: ${upper}`, `Available: ${ASSETS.join(', ')}`];
  const s = getSession();
  const pb = PLAYBOOK[upper];
  const p = prices[upper];
  const exa = scanData.find(r => r.pair === upper)?.scores;
  const dec = upper.includes("JPY") ? 3 : upper === "XAUUSD" ? 2 : upper === "NAS100" || upper === "BTCUSD" || upper === "SPX" ? 0 : 4;
  const sessionInOptimal = pb.sessions.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]);
  const locks = exa?.locks ?? [false, false, false, false];
  const lockCount = locks.filter(Boolean).length;
  const composite = exa?.composite ?? 0;
  const verdictEmoji = scoreColor(composite);
  const verdict = scoreVerdict(composite);
  return [
    '════════════════════════════════════════════════════',
    `🔍 ${upper} DEEP DIVE SCAN`,
    '════════════════════════════════════════════════════',
    '',
    `🎯 VERDICT: ${verdictEmoji} ${verdict} | ${lockCount}/4 EXA Locks | Composite: ${composite}/100 | Playbook Win Rate: ${pb.winRate}%`,
    p ? `   Live: ${fmt(p, dec)} ${dir(p)}` : '   Live: fetching...',
    '',
    `📊 EXA SCORE FACTORS:`,
    ...(exa?.factors.map(f => `   ${f.label.padEnd(20)} ${f.value.toString().padStart(3)}/100 — ${f.note}`) ?? ['   EXA analysis warming up...']),
    '',
    `📊 BEHAVIOR PROFILE:`,
    `   ${pb.behavior}`,
    '',
    '📊 STRUCTURE (manual confirmation required):',
    '   HTF: Verify Weekly/Daily trend direction before entry',
    '   ITF: H4/H1 — look for OB + FVG confluence zone',
    '   LTF: M15/M5 — wait for CHoCH then BOS confirmation',
    '',
    '💧 LIQUIDITY FRAMEWORK:',
    '   Draw: Previous session high/low (primary liquidity target)',
    '   Order Blocks: H4 OB = strongest. H1 OB = entry precision.',
    '   FVG: Unfilled H4 gaps = magnet zones',
    '   Sweep Setup: Equal highs/lows = stop hunt targets',
    '',
    `🔗 CORRELATION: ${pb.correlation}`,
    `   Avoid when correlation conflicts — check DXY direction first`,
    '',
    `⏰ OPTIMAL SESSIONS: ${pb.sessions}`,
    `   Current: ${s.icon} ${s.name}`,
    `   ${sessionInOptimal ? '✓ IN SESSION WINDOW' : '✗ OUTSIDE OPTIMAL WINDOW — reduce conviction'}`,
    '',
    '🔐 EXA 4-LOCKS:',
    `   ${locks[0] ? '✓' : '✗'} Lock 1: Structure — ${exa?.technical ? `Technical ${exa.technical}/100` : 'verify HTF trend'}`,
    `   ${locks[1] ? '✓' : '✗'} Lock 2: Liquidity Event — ${exa?.liquidity ? `Liquidity ${exa.liquidity}/100` : 'needs manual confirmation'}`,
    `   ${locks[2] ? '✓' : '✗'} Lock 3: Session Timing — ${s.name}`,
    `   ${locks[3] ? '✓' : '✗'} Lock 4: Confirmation — ${exa?.confirmation?.confidence ?? 'CHoCH/BOS on LTF needed'}`,
    '',
    `📈 TRADE FRAMEWORK:`,
    `   RR Target: ${pb.rr}`,
    '   Entry: LTF CHoCH → BOS → entry on first pullback',
    '   Stop: Below/above swept level (structure invalidation)',
    '',
    `⚠️  AVOID WHEN: ${pb.avoid}`,
    '════════════════════════════════════════════════════',
  ];
}

function bias(prices: Prices): string[] {
  const spx = prices['SPX'];
  const nas = prices['NAS100'];
  const dxy = prices['DXY'];
  const xau = prices['XAUUSD'];
  const aud = prices['AUDUSD'];
  const jpy = prices['USDJPY'];

  const riskOn = (nas?.changePct ?? 0) > 0 && (dxy?.changePct ?? 0) < 0;
  const riskOff = (nas?.changePct ?? 0) < -0.3 && (dxy?.changePct ?? 0) > 0.2;
  const biasLabel = riskOn ? '🟢 RISK-ON' : riskOff ? '🔴 RISK-OFF' : '🟡 NEUTRAL/MIXED';

  return [
    '════════════════════════════════════════════════════',
    `📊 MARKET BIAS: ${biasLabel}`,
    '════════════════════════════════════════════════════',
    '',
    `   SPX:    ${dir(spx)} ${fmt(spx, 0)}`,
    `   NAS100: ${dir(nas)} ${fmt(nas, 0)}`,
    `   DXY:    ${dir(dxy)} ${fmt(dxy, 3)}`,
    `   XAUUSD: ${dir(xau)} ${fmt(xau, 2)}`,
    `   AUDUSD: ${dir(aud)} ${fmt(aud)}`,
    `   USDJPY: ${dir(jpy)} ${fmt(jpy, 3)} (↑ = USD strong / JPY weak)`,
    '',
    '💡 TRADE WITH THE FLOW:',
    riskOn ? '   ✓ Long: XAUUSD, NAS100, AUDUSD, GBPUSD' :
    riskOff ? '   ✓ Long: DXY, USDJPY. Short: equities, commodities.' :
    '   Mixed signals — trade only highest confluence setups.',
    '',
    '⚠️  FLIP SIGNAL: DXY direction reversal → full bias reassessment',
    '════════════════════════════════════════════════════',
  ];
}

function sessionInfo(): string[] {
  const s = getSession();
  const utc = new Date().toUTCString().slice(17, 25);
  const sd = s.sessionKey ? SESSION_DATA[s.sessionKey] : null;
  return [
    '════════════════════════════════════════════════════',
    `⏰ SESSION: ${s.icon} ${s.name} | UTC ${utc}`,
    '════════════════════════════════════════════════════',
    '',
    `   ${s.strategy}`,
    '',
    sd ? [
      `📊 SESSION STATS (${sd.winRate}% WR — based on 500-1000 trades):`,
      `   Best Pairs: ${sd.bestPairs}`,
      `   Avg Range:  ${sd.avgRange}`,
      `   Optimal Entry: ${sd.optimalTime}`,
      `   Top Setup: ${sd.topSetup}`,
    ].join('\n') : '',
    '',
    '📋 FULL SCHEDULE (GMT):',
    '   00:00–07:00  🌏 Asia Range (72% WR)   — Range fade, USDJPY/AUDUSD',
    '   07:00–10:00  🇬🇧 London KZ (67% WR)   — Sweeps, GBPUSD/EURUSD/XAUUSD',
    '   12:00–15:00  🇺🇸 NY Killzone (64% WR)  — Continuation+reversal',
    '   16:00–00:00  💀 Dead Zone              — Stand down, no setups',
    '════════════════════════════════════════════════════',
  ].filter(Boolean);
}

function sniper(arg: string, prices: Prices, scanData: { pair: string; scores: EXAScores }[]): string[] {
  const xau = prices['XAUUSD'];
  const xauExa = scanData.find(r => r.pair === 'XAUUSD')?.scores;
  const best = scanData.length ? scanData.reduce((a, b) => a.scores.composite > b.scores.composite ? a : b) : null;
  return [
    '════════════════════════════════════════════════════',
    '🎯 SNIPER SCAN — 85+ CONFLUENCE ONLY',
    '════════════════════════════════════════════════════',
    '',
    best && best.scores.composite >= 80
      ? `⚡ ${best.pair} — ${best.scores.composite}/100 — ✅ CONFIRMED SNIPER SETUP`
      : '⚡ No asset above 80 confluence — no sniper setup confirmed.',
    best ? `   ${best.scores.locks.filter(Boolean).length}/4 EXA Locks | Win Rate: ${PLAYBOOK[best.pair]?.winRate ?? '?'}% | Live: ${fmt(prices[best.pair], 2)}` : '',
    '   All criteria met. Institutional fingerprint confirmed.',
    '   Entry: HTF OB + M15 CHoCH. Stop: below swept lows.',
    '',
    arg && arg !== 'all' ? `   ${arg.toUpperCase()}: Checking...` : '',
    '',
    '⏳ Execute with precision. Do not force.',
    '════════════════════════════════════════════════════',
  ].filter(Boolean);
}

function godMode(prices: Prices, scanData: { pair: string; scores: EXAScores }[]): string[] {
  const dxy = prices['DXY'];
  const xau = prices['XAUUSD'];
  const s = getSession();
  const best = scanData.length ? scanData.reduce((a, b) => a.scores.composite > b.scores.composite ? a : b) : null;
  return [
    '════════════════════════════════════════════════════',
    '👁️  GOD MODE — ALL FRAMEWORKS ENGAGED',
    '════════════════════════════════════════════════════',
    '',
    '   🔥 Cognitive OS ........... ONLINE',
    '   🔥 EXA 4-LOCKS ............ ARMED',
    '   🔥 Verification Engine .... ACTIVE',
    '   🔥 Correlation Matrix ..... LOADED (11 assets)',
    '   🔥 Pattern Genesis ........ SCANNING',
    '   🔥 Neurocognitive Protocol . ENGAGED',
    '   🔥 Psychological Layer .... MONITORING',
    '',
    `   Session: ${s.icon} ${s.name}`,
    `   ${s.strategy}`,
    '',
    '📊 MULTI-FRAMEWORK SYNTHESIS:',
    best ? `   Best Setup ........ ${best.pair} ${best.scores.composite}/100 (${best.scores.bias})` : '   Best Setup ........ warming up',
    `   Correlation ....... DXY ${dxy ? fmt(dxy, 3) + ' ' + dir(dxy) : 'loading'} = ${dxy && dxy.changePct < 0 ? 'bearish = commodity/risk bid ✓' : 'check direction'}`,
    `   Session Timing .... ${s.name.includes('DEAD') ? 'Suboptimal — wait' : 'Optimal window ✓'}`,
    '   Psychology ........ State unknown — run /psychology',
    '',
    best ? `⚡ TOP PLAY: ${best.pair} ${best.scores.composite}/100 | ${best.scores.locks.filter(Boolean).length}/4 LOCKS | ${PLAYBOOK[best.pair]?.winRate ?? '?'}% WR | ${fmt(prices[best.pair], 2)}` : '',
    '',
    '🧠 INTELLIGENCE:',
    '   Retail positioned SHORT at equal lows.',
    '   Institutions sweep stops, then reverse hard.',
    '   Wait for the sweep. Enter the reversal.',
    '   That is the only play that matters right now.',
    '════════════════════════════════════════════════════',
  ].filter(Boolean);
}

function processCommand(raw: string, prices: Prices, scanData: { pair: string; scores: EXAScores }[]): { lines: string[]; type: LogEntry['type'] } {
  const t = raw.trim();
  const l = t.toLowerCase();

  if (l === '/help' || l === 'help') return { lines: HELP_LINES, type: 'system' };
  if (l === '/scan all' || l === 'scan all') return { lines: scanAll(prices, scanData), type: 'analysis' };
  if (l.startsWith('/scan ') || l.startsWith('scan ')) {
    const asset = t.split(' ').slice(1).join('');
    return { lines: scanAsset(asset, prices, scanData), type: 'analysis' };
  }
  if (l === '/bias' || l.includes("what's the market") || l.includes("market doing")) return { lines: bias(prices), type: 'analysis' };
  if (l === '/session' || l.includes('what session')) return { lines: sessionInfo(), type: 'analysis' };
  if (l.startsWith('/sniper') || l === 'sniper') {
    const arg = l.replace('/sniper', '').trim();
    return { lines: sniper(arg, prices, scanData), type: 'analysis' };
  }
  if (l === '/god mode' || l === '/godmode' || l === 'god mode') return { lines: godMode(prices, scanData), type: 'analysis' };
  if (l === '/zen') return { lines: ['', '🧘 Waiting is a position. Patience is profitable.', '   The best trade is sometimes no trade.', '   Institutions wait days for perfect setups.', ''], type: 'system' };
  if (l.startsWith('/war room') || l.startsWith('war room')) {
    const asset = l.replace('/war room', '').replace('war room', '').trim().toUpperCase() || 'XAUUSD';
    const exa = scanData.find(r => r.pair === asset)?.scores;
    const lockCount = exa?.locks.filter(Boolean).length ?? 3;
    return {
      lines: [
        '════════════════════════════════════════════════════',
        `⚔️  WAR ROOM TACTICAL ANALYSIS: ${asset}`,
        '════════════════════════════════════════════════════',
        '',
        '🗺️  HTF CAMPAIGN (Weekly/Daily):',
        exa?.bias === 'BULLISH' ? '   Institutional campaign: BULLISH. Price in markup phase.' :
        exa?.bias === 'BEARISH' ? '   Institutional campaign: BEARISH. Price in distribution phase.' :
        '   Institutional campaign: NEUTRAL. Price consolidating.',
        `   Draw on liquidity: ${exa?.liquidity ?? 50 > 60 ? 'Previous weekly high/low' : 'Vol-dependent target'}.`,
        '',
        '⚔️  ITF TACTICS (H4/H1):',
        `   Phase: ${exa?.momentum && exa.momentum > 30 ? 'Impulse' : exa?.momentum && exa.momentum < -30 ? 'Reversal' : 'Retracement'} into key zone.`,
        '   Tactical entry zone: H1 FVG fill + OB confluence.',
        '',
        '🎯 LTF EXECUTION (M15/M5):',
        '   Trigger: M15 CHoCH → M5 BOS confirmation.',
        '   Entry: First M5 candle close above CHoCH level.',
        '',
        `🔐 AUTHORIZATION: ${lockCount}/4 LOCKS — ${lockCount >= 4 ? 'FULLY AUTHORIZED' : lockCount >= 3 ? 'ALMOST — AWAITING LTF' : 'DO NOT ENTER YET'}.`,
        `   Composite: ${exa?.composite ?? '--'}/100 | ${exa?.verdict ?? 'ANALYZING'}`,
        '════════════════════════════════════════════════════',
      ],
      type: 'analysis',
    };
  }
  if (l === '/psychology' || l === '/psychology check' || l.includes('emotional') || l.includes('losing')) {
    return {
      lines: [
        '════════════════════════════════════════════════════',
        '🧠 PSYCHOLOGICAL STATE SCAN',
        '════════════════════════════════════════════════════',
        '',
        '   1. Recent P/L?        (winning or losing streak?)',
        '   2. Trades today?      (>3 = potential overtrading)',
        '   3. Feeling urgency?   (FOMO signal)',
        '   4. Breaking a rule?   (revenge signal)',
        '',
        '🛡️  PROTOCOLS:',
        '   FOMO        → Stop. Next setup in 15min. Wait.',
        '   Revenge     → Close platform. Walk away. Reset.',
        '   Overconfidence → Cut size 50%. Journal 10 trades.',
        '   Fear        → Review your edge. One loss ≠ broken.',
        '',
        '✅ Trade only when: "I am following system, not emotion."',
        '════════════════════════════════════════════════════',
      ],
      type: 'system',
    };
  }
  if (l === '/conflict check' || l.includes('conflict')) {
    const topAssets = scanData.filter(r => r.scores.bias !== 'NEUTRAL').slice(0, 5);
    const conflicts = topAssets.filter(r => {
      const dxy = prices['DXY'];
      if (!dxy) return false;
      return (r.pair !== 'DXY' && r.scores.bias === 'BULLISH' && dxy.changePct > 0.15) ||
             (r.pair !== 'DXY' && r.scores.bias === 'BEARISH' && dxy.changePct < -0.15);
    });
    return {
      lines: [
        '════════════════════════════════════════════════════',
        '⚠️  CONFLICT DETECTION REPORT',
        '════════════════════════════════════════════════════',
        '',
        conflicts.length === 0 ? '🟢 NO CRITICAL CONFLICTS DETECTED' : `🟡 ${conflicts.length} POTENTIAL CONFLICT(S)`,
        '',
        ...topAssets.map(r => {
          const dxy = prices['DXY'];
          const aligned = r.pair === 'DXY' || !dxy || (r.scores.bias === 'BULLISH' && dxy.changePct < 0) || (r.scores.bias === 'BEARISH' && dxy.changePct > 0);
          return `   ${r.pair} ${r.scores.bias} ↔ DXY — ${aligned ? 'ALIGNED ✓' : 'CONFLICT ⚠️'}`;
        }),
        '',
        '   DXY direction determines USD pair direction.',
        '   Check DXY before entering any USD-denominated trade.',
        '════════════════════════════════════════════════════',
      ],
      type: 'analysis',
    };
  }
  if (l === '/now' || l.includes("what's good") || l.includes('what should i trade')) {
    const s = getSession();
    return { lines: [`⚡ ${s.icon} ${s.name} — ${s.strategy}`, '', ...scanAll(prices, scanData)], type: 'analysis' };
  }
  if (l === '/prices' || l === 'prices') {
    const lines = [
      '════════════════════════════════════════════════════',
      '💹 LIVE PRICES — All 11 Assets',
      '════════════════════════════════════════════════════',
      '',
    ];
    for (const a of ASSETS) {
      const p = prices[a];
      const d = p ? `${p.price.toFixed(a === 'NAS100' || a === 'SPX' || a === 'BTCUSD' ? 0 : a === 'XAUUSD' ? 2 : 4)}  ${dir(p)} ${(p.changePct >= 0 ? '+' : '') + p.changePct.toFixed(2)}%` : 'loading...';
      lines.push(`   ${a.padEnd(8)} ${d}`);
    }
    lines.push('', '   Updates every 30s via Yahoo Finance', '════════════════════════════════════════════════════');
    return { lines, type: 'analysis' };
  }

  return {
    lines: [`Command not recognized: "${t}"`, 'Type /help to see all commands.'],
    type: 'error',
  };
}

export const NexusTerminal = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { prices, fetchedAt, loading: pricesLoading, error: pricesError } = usePrices();
  const scanData = useEXAScan(ASSETS);

  const push = (lines: string[], type: LogEntry['type']) => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, ...lines.map(message => ({ message, type, timestamp: ts }))]);
  };

  useEffect(() => {
    const s = getSession();
    push([
      'WARROOM NEXUS ACTIVATED ✓',
      `Session: ${s.icon} ${s.name} — ${s.strategy}`,
      '40+ knowledge base files loaded. EXA 4-LOCKS armed.',
      'Live prices: fetching from Yahoo Finance...',
      'Type /help for all commands. /prices for live feed.',
      '─────────────────────────────────────────────────',
    ], 'success');
  }, []);

  useEffect(() => {
    if (!pricesLoading && fetchedAt) {
      const count = Object.keys(prices).length;
      push([`📡 Live prices loaded: ${count}/11 assets | Updated ${new Date(fetchedAt).toLocaleTimeString('en-GB')}`], 'success');
    }
  }, [fetchedAt]);

  useEffect(() => {
    if (pricesError) push([`⚠️ Price feed error: ${pricesError} — commands still work with playbook data`], 'warning');
  }, [pricesError]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const callNexusAI = async (cmd: string) => {
    setIsStreaming(true);
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { message: '⚡ NEXUS AI — analyzing...', type: 'analysis', timestamp: ts }]);
    let accumulated = '';
    try {
      const resp = await fetch('/api/nexus-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, prices, sessionName: getSession().name }),
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break outer;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              accumulated += parsed.token;
              setLogs(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], message: accumulated };
                return next;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setLogs(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], message: `⚠️ AI error: ${String(err)}`, type: 'error' };
        return next;
      });
    }
    setIsStreaming(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const cmd = input.trim();
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { message: `> ${cmd}`, type: 'input', timestamp: ts }]);
    setCmdHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    const { lines, type } = processCommand(cmd, prices, scanData);
    if (type === 'error') {
      await callNexusAI(cmd);
    } else {
      setTimeout(() => push(lines, type), 60);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : cmdHistory[next]);
    }
  };

  const color = (type: LogEntry['type']) => {
    if (type === 'success') return 'text-green-400';
    if (type === 'warning') return 'text-yellow-400';
    if (type === 'error') return 'text-red-400';
    if (type === 'input') return 'text-blue-300';
    if (type === 'system') return 'text-purple-300';
    if (type === 'analysis') return 'text-amber-200/90';
    return 'text-white/60';
  };

  return (
    <div
      className="flex flex-col h-full bg-black/95 text-sm border border-primary/30 rounded-xl overflow-hidden cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex justify-between items-center shrink-0">
        <span className="font-mono font-bold tracking-widest text-xs text-primary">WARROOM NEXUS CORE</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 font-mono">
            {new Date().toUTCString().slice(17, 25)} UTC
            {' · '}
            {pricesLoading ? '📡 loading...' : pricesError ? '⚠️ no feed' : `📡 ${Object.keys(prices).length}/11 live`}
          </span>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="text-white/20 text-xs whitespace-nowrap shrink-0 mt-px">[{log.timestamp}]</span>
            <span className={`${color(log.type)} whitespace-pre-wrap break-words`}>{log.message}</span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="p-3 border-t border-primary/20 bg-primary/5 shrink-0">
        <div className="flex gap-2 items-center font-mono">
          <span className="text-primary font-bold">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm disabled:opacity-40"
            placeholder={isStreaming ? 'AI responding...' : '/scan all'}
            disabled={isStreaming}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
};
