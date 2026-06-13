// Shared: real swing-liquidity levels from Yahoo v8 daily candles.
// Previous-day / prior-week / prior-month highs & lows — the actual stop-cluster
// magnets the WARROOM playbooks key on (PDH/PDL/PWH/PWL), not just round numbers.
// Imported by api/levels.ts (endpoint) and api/archon.ts. Underscore-prefixed so
// Vercel doesn't route it; importers MUST use the .js extension (nodenext).

const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', GBPJPY: 'GBPJPY=X',
  AUDUSD: 'AUDUSD=X', NZDUSD: 'NZDUSD=X', XAUUSD: 'GC=F', BTCUSD: 'BTC-USD',
  NAS100: 'NQ=F', SPX: 'ES=F', DXY: 'DX-Y.NYB',
};

export interface KeyLevels {
  pdh: number; pdl: number;   // previous completed day high / low
  pwh: number; pwl: number;   // prior 5-day (week) high / low
  pmh: number; pml: number;   // prior ~month high / low
  asOf: number;
}

export const LEVEL_SYMBOLS = Object.keys(YAHOO_MAP);

export async function fetchDailyLevels(pair: string): Promise<KeyLevels | null> {
  const ySym = YAHOO_MAP[pair];
  if (!ySym) return null;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1mo`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const q = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!q?.high || !q?.low) return null;

    // Daily candles oldest→newest, dropping nulls.
    const candles: { h: number; l: number }[] = [];
    for (let i = 0; i < q.high.length; i++) {
      if (q.high[i] == null || q.low[i] == null) continue;
      candles.push({ h: q.high[i], l: q.low[i] });
    }
    if (candles.length < 2) return null;

    // Exclude the last candle (today, in progress) so levels are completed history.
    const completed = candles.slice(0, -1);
    const prevDay = completed[completed.length - 1];
    const week = completed.slice(-5);
    const hi = (a: { h: number }[]) => Math.max(...a.map(c => c.h));
    const lo = (a: { l: number }[]) => Math.min(...a.map(c => c.l));

    return {
      pdh: prevDay.h, pdl: prevDay.l,
      pwh: hi(week), pwl: lo(week),
      pmh: hi(completed), pml: lo(completed),
      asOf: Date.now(),
    };
  } catch {
    return null;
  }
}
