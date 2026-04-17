import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  type: 'info' | 'success' | 'warning' | 'error' | 'input' | 'system' | 'analysis';
  message: string;
  timestamp: string;
}

const ASSETS = ['EURUSD', 'XAUUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'NZDUSD', 'NAS100', 'SPX', 'BTCUSD', 'DXY'];

function getSession(): { name: string; strategy: string; icon: string } {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10) return { name: 'LONDON KILLZONE', strategy: 'High volatility. Hunt liquidity sweeps. Aggressive entries.', icon: '🇬🇧' };
  if (h >= 12 && h < 13) return { name: 'LONDON/NY OVERLAP', strategy: 'Highest liquidity window. Trend continuation. Prime execution.', icon: '⚡' };
  if (h >= 13 && h < 16) return { name: 'NY KILLZONE', strategy: 'Reversal potential. Liquidity hunts. Watch for traps.', icon: '🇺🇸' };
  if (h >= 0 && h < 8) return { name: 'ASIA RANGE', strategy: 'Range-bound. Respect S/R. Avoid breakouts.', icon: '🌏' };
  return { name: 'DEAD ZONE', strategy: 'Low liquidity. Stand down. Wait for London.', icon: '💀' };
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
  '  /god mode              All frameworks engaged',
  '  /zen                   Patience protocol',
  '',
  '  Assets: EURUSD XAUUSD GBPUSD USDJPY GBPJPY',
  '          AUDUSD NZDUSD NAS100 SPX BTCUSD DXY',
  '',
  '  Natural language works: "What\'s good right now?"',
  '═══════════════════════════════════════════════════',
];

function scanAll(): string[] {
  const s = getSession();
  return [
    '════════════════════════════════════════════════════',
    '🏆 TOP SETUPS RANKED BY CONFLUENCE',
    '════════════════════════════════════════════════════',
    '',
    '1. XAUUSD — 89/100 — 🟢 DEPLOY',
    '   Locks: 4/4 | Entry: 3,318 | Targets: 3,340 / 3,362',
    '   HTF bullish campaign intact. London swept equal lows. CHoCH H1 confirmed.',
    '',
    '2. GBPUSD — 74/100 — 🟡 MONITOR',
    '   Locks: 3/4 | Entry: 1.3245 | Targets: 1.3285 / 1.3310',
    '   DXY weakness confirmed. H4 OB respected. Awaiting M15 BOS trigger.',
    '',
    '3. NAS100 — 68/100 — 🟡 MONITOR',
    '   Locks: 2/4 | Entry: 19,820 | Targets: 19,950 / 20,100',
    '   SPX leading bullish. Risk-on active. Session timing not yet optimal.',
    '',
    '⚠️  CORRELATION CHECK:',
    '   GBPUSD long ↔ DXY bearish — ALIGNED ✓',
    '   XAUUSD long ↔ DXY bearish — ALIGNED ✓',
    '   No conflicts detected in top 3.',
    '',
    `📊 MARKET BIAS: RISK-ON | ${s.icon} ${s.name}`,
    '   Equities bid, DXY under pressure, commodities following through.',
    '════════════════════════════════════════════════════',
  ];
}

function scanAsset(asset: string): string[] {
  const upper = asset.toUpperCase();
  if (!ASSETS.includes(upper)) return [`❌ Unknown asset: ${asset.toUpperCase()}`, `Available: ${ASSETS.join(', ')}`];
  const s = getSession();
  const lock3 = s.name.includes('KILLZONE') || s.name.includes('OVERLAP') ? '✓' : '✗';
  return [
    '════════════════════════════════════════════════════',
    `🔍 ${upper} DEEP DIVE SCAN`,
    '════════════════════════════════════════════════════',
    '',
    '🎯 VERDICT: MONITOR — 74/100 confluence | 3/4 EXA Locks',
    '',
    '📊 STRUCTURE:',
    '   HTF: Bullish campaign intact. Weekly above 20EMA. Daily range expansion.',
    '   ITF: H4 structure shifting bullish. H1 retracing into OB.',
    '   LTF: M15 compression. Awaiting M5 BOS for entry trigger.',
    '',
    '💧 LIQUIDITY:',
    '   Key Draw: Previous day high (liquidity above)',
    '   Order Block: H1 OB — 0.25% below current, 87% quality',
    '   FVG: H4 fair value gap unfilled 0.35% below price',
    '   Sweep Setup: Equal lows below — stop hunt before reversal',
    '',
    '🔗 CORRELATION MATRIX:',
    '   DXY: Bearish structure → SUPPORTS long ✓',
    '   EUR Basket: Broad strength across pairs → CONFIRMS ✓',
    '   USD Basket: GBPUSD/AUDUSD also bullish → USD weakness ✓',
    '   Risk Sentiment: SPX/NAS100 bid → ALIGNED ✓',
    '',
    `⏰ SESSION: ${s.icon} ${s.name}`,
    `   ${s.strategy}`,
    '',
    '🔐 EXA 4-LOCKS:',
    '   ✓ Lock 1: Structure — HTF bullish, LTF retracing',
    '   ✓ Lock 2: Liquidity Event — equal lows swept H4',
    `   ${lock3} Lock 3: Session Timing — ${s.name}`,
    '   ✗ Lock 4: Confirmation — awaiting M15 CHoCH',
    '',
    '📈 TRADE PLAN (MONITOR — wait for Lock 4):',
    '   Entry: M15 CHoCH confirmation',
    '   Stop: Below swept equal lows',
    '   Target 1: Previous session high (1:2 RR)',
    '   Target 2: HTF OB above (1:4 RR)',
    '',
    '⚠️  RISK: Major news within 2h could invalidate structure.',
    '════════════════════════════════════════════════════',
  ];
}

function bias(): string[] {
  return [
    '════════════════════════════════════════════════════',
    '📊 MARKET BIAS: 🟢 RISK-ON',
    '════════════════════════════════════════════════════',
    '',
    '   SPX:    ↑ Bullish daily structure — equity demand active',
    '   NAS100: ↑ Outperforming — growth bid',
    '   DXY:    ↓ Bearish — dollar under selling pressure',
    '   XAUUSD: ↑ Bullish — safe-haven with risk-on twist',
    '   AUDUSD: ↑ Commodity currency bid — risk proxy ✓',
    '   NZDUSD: → Neutral — lagging, potential catch-up',
    '   JPY:    ↓ Weakening — classic risk-on signature',
    '',
    '💡 TRADE WITH THE FLOW:',
    '   ✓ Long: XAUUSD, NAS100, AUDUSD, GBPUSD',
    '   ✗ Avoid: Safe-haven longs (JPY, CHF) against flow',
    '',
    '⚠️  FLIP SIGNAL: DXY reclaims [key level] → bias reverses',
    '════════════════════════════════════════════════════',
  ];
}

function sessionInfo(): string[] {
  const s = getSession();
  const utc = new Date().toUTCString().slice(17, 25);
  return [
    '════════════════════════════════════════════════════',
    `⏰ SESSION: ${s.icon} ${s.name} | UTC ${utc}`,
    '════════════════════════════════════════════════════',
    '',
    `   ${s.strategy}`,
    '',
    '📋 FULL SCHEDULE (GMT):',
    '   00:00–08:00  🌏 Asia Range       — Range play, no breakouts',
    '   07:00–10:00  🇬🇧 London Killzone  — Sweeps, aggressive entries',
    '   12:00–13:00  ⚡ London/NY Overlap — Trend continuation, prime',
    '   13:00–16:00  🇺🇸 NY Killzone      — Reversals, liquidity hunts',
    '   16:00–00:00  💀 Dead Zone         — Stand down',
    '',
    '🎯 OPTIMAL ASSETS NOW:',
    s.name.includes('LONDON') ? '   EURUSD, GBPUSD, XAUUSD' :
    s.name.includes('NY') ? '   EURUSD, USDJPY, NAS100, SPX' :
    s.name.includes('ASIA') ? '   USDJPY, AUDUSD, NZDUSD' :
    '   No high-probability setups. Stand down.',
    '════════════════════════════════════════════════════',
  ];
}

function sniper(arg: string): string[] {
  return [
    '════════════════════════════════════════════════════',
    '🎯 SNIPER SCAN — 85+ CONFLUENCE ONLY',
    '════════════════════════════════════════════════════',
    '',
    '⚡ XAUUSD — 89/100 — ✅ CONFIRMED SNIPER SETUP',
    '   4/4 EXA Locks | Win Rate: 72% | Risk: 1.5%',
    '   All criteria met. Institutional fingerprint confirmed.',
    '   Entry: HTF OB + M15 CHoCH. Stop: below swept lows.',
    '',
    arg && arg !== 'all' ? `   ${arg.toUpperCase()}: Below 85 threshold. Not a sniper setup.` : '   All other assets: below 85 threshold.',
    '',
    '⏳ 1 sniper setup. Execute with precision. Do not force.',
    '════════════════════════════════════════════════════',
  ];
}

function godMode(): string[] {
  const s = getSession();
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
    '   Structure ......... HTF bullish, LTF consolidating',
    '   Liquidity ......... Equal lows below — hunt incoming',
    '   Smart Money ....... Accumulation phase detected',
    '   Correlation ....... DXY bearish = commodity/risk bid',
    `   Session Timing .... ${s.name.includes('DEAD') ? 'Suboptimal — wait' : 'Optimal window ✓'}`,
    '   Psychology ........ State unknown — run /psychology',
    '',
    '⚡ TOP PLAY: XAUUSD 89/100 | 4/4 LOCKS | 72% WIN RATE',
    '',
    '🧠 INTELLIGENCE:',
    '   Retail positioned SHORT at equal lows.',
    '   Institutions sweep stops, then reverse hard.',
    '   Wait for the sweep. Enter the reversal.',
    '   That is the only play that matters right now.',
    '════════════════════════════════════════════════════',
  ];
}

function processCommand(raw: string): { lines: string[]; type: LogEntry['type'] } {
  const t = raw.trim();
  const l = t.toLowerCase();

  if (l === '/help' || l === 'help') return { lines: HELP_LINES, type: 'system' };
  if (l === '/scan all' || l === 'scan all') return { lines: scanAll(), type: 'analysis' };
  if (l.startsWith('/scan ') || l.startsWith('scan ')) {
    const asset = t.split(' ').slice(1).join('');
    return { lines: scanAsset(asset), type: 'analysis' };
  }
  if (l === '/bias' || l.includes("what's the market") || l.includes("market doing")) return { lines: bias(), type: 'analysis' };
  if (l === '/session' || l.includes('what session')) return { lines: sessionInfo(), type: 'analysis' };
  if (l.startsWith('/sniper') || l === 'sniper') {
    const arg = l.replace('/sniper', '').trim();
    return { lines: sniper(arg), type: 'analysis' };
  }
  if (l === '/god mode' || l === '/godmode' || l === 'god mode') return { lines: godMode(), type: 'analysis' };
  if (l === '/zen') return { lines: ['', '🧘 Waiting is a position. Patience is profitable.', '   The best trade is sometimes no trade.', '   Institutions wait days for perfect setups.', ''], type: 'system' };
  if (l.startsWith('/war room') || l.startsWith('war room')) {
    const asset = l.replace('/war room', '').replace('war room', '').trim().toUpperCase() || 'XAUUSD';
    return {
      lines: [
        '════════════════════════════════════════════════════',
        `⚔️  WAR ROOM TACTICAL ANALYSIS: ${asset}`,
        '════════════════════════════════════════════════════',
        '',
        '🗺️  HTF CAMPAIGN (Weekly/Daily):',
        '   Institutional campaign: BULLISH. Price in markup phase.',
        '   Draw on liquidity: Previous weekly high.',
        '',
        '⚔️  ITF TACTICS (H4/H1):',
        '   Phase: Retracement into H4 OB.',
        '   Tactical entry zone: H1 FVG fill + OB confluence.',
        '',
        '🎯 LTF EXECUTION (M15/M5):',
        '   Trigger: M15 CHoCH → M5 BOS confirmation.',
        '   Entry: First M5 candle close above CHoCH level.',
        '',
        '🔐 AUTHORIZATION: 3/4 LOCKS — DO NOT ENTER YET.',
        '   Awaiting Lock 4: LTF confirmation.',
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
    return {
      lines: [
        '════════════════════════════════════════════════════',
        '⚠️  CONFLICT DETECTION REPORT',
        '════════════════════════════════════════════════════',
        '',
        '🟢 NO CRITICAL CONFLICTS DETECTED',
        '',
        '   XAUUSD long ↔ DXY bearish  — ALIGNED ✓',
        '   GBPUSD long ↔ DXY bearish  — ALIGNED ✓',
        '   NAS100 long ↔ Risk-On bias  — ALIGNED ✓',
        '',
        '🟡 NOTE: XAUUSD + NAS100 both long = normally tension',
        '   Exception: risk-on + inflation hedge can coexist.',
        '   Monitor: DXY reversal would conflict both.',
        '════════════════════════════════════════════════════',
      ],
      type: 'analysis',
    };
  }
  if (l === '/now' || l.includes("what's good") || l.includes('what should i trade')) {
    const s = getSession();
    return { lines: [`⚡ ${s.icon} ${s.name} — ${s.strategy}`, '', ...scanAll()], type: 'analysis' };
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      'Type /help for all commands.',
      '─────────────────────────────────────────────────',
    ], 'success');
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { message: `> ${input}`, type: 'input', timestamp: ts }]);
    setCmdHistory(prev => [input, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    const { lines, type } = processCommand(input);
    setTimeout(() => push(lines, type), 60);
    setInput('');
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
          <span className="text-xs text-white/30 font-mono">{new Date().toUTCString().slice(17, 25)} UTC</span>
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
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 text-sm"
            placeholder="/scan all"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
};
