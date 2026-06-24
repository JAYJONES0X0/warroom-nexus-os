import type { VercelRequest, VercelResponse } from '@vercel/node';

const YAHOO_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', GBPJPY: 'GBPJPY=X',
  AUDUSD: 'AUDUSD=X', NZDUSD: 'NZDUSD=X', XAUUSD: 'GC=F', BTCUSD: 'BTC-USD',
  NAS100: 'NQ=F', SPX: 'ES=F', DXY: 'DX-Y.NYB',
};

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

interface YahooCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchYahooCandles(ySymbol: string, interval: string, range: string): Promise<YahooCandle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return [];
  const { timestamp, indicators } = result;
  const quote = indicators?.quote?.[0];
  if (!timestamp || !quote) return [];
  const candles: YahooCandle[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    if (quote.open?.[i] == null || quote.high?.[i] == null || quote.low?.[i] == null || quote.close?.[i] == null) continue;
    candles.push({
      time: timestamp[i],
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume?.[i] ?? 0,
    });
  }
  return candles;
}

function aggregateHourlyTo4h(hourly: YahooCandle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < hourly.length; i += 4) {
    const block = hourly.slice(i, i + 4);
    if (block.length < 4) continue;
    const start = block[0];
    result.push({
      time: start.time,
      open: start.open,
      high: Math.max(...block.map(c => c.high)),
      low: Math.min(...block.map(c => c.low)),
      close: block[block.length - 1].close,
      volume: block.reduce((s, c) => s + c.volume, 0),
    });
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbol = (req.query.symbol as string)?.toUpperCase() ?? 'EURUSD';
  const interval = (req.query.interval as string) ?? '1h';
  const ySymbol = YAHOO_MAP[symbol];
  if (!ySymbol) {
    res.status(400).json({ error: `Unknown symbol: ${symbol}` });
    return;
  }

  const intervalMap: Record<string, { yInterval: string; yRange: string; cache: number }> = {
    '1m':  { yInterval: '1m',  yRange: '1d',   cache: 60 },
    '5m':  { yInterval: '5m',  yRange: '5d',   cache: 120 },
    '15m': { yInterval: '15m', yRange: '1mo',  cache: 300 },
    '1h':  { yInterval: '60m', yRange: '1mo',  cache: 600 },
    '4h':  { yInterval: '60m', yRange: '3mo',  cache: 1200 },
    '1D':  { yInterval: '1d',  yRange: '6mo',  cache: 3600 },
    '1W':  { yInterval: '1wk', yRange: '2y',   cache: 7200 },
  };

  const cfg = intervalMap[interval];
  if (!cfg) {
    res.status(400).json({ error: `Unknown interval: ${interval}` });
    return;
  }

  res.setHeader('Cache-Control', `s-maxage=${cfg.cache}, stale-while-revalidate=${cfg.cache * 2}`);

  try {
    let candles: Candle[];
    if (interval === '4h') {
      const hourly = await fetchYahooCandles(ySymbol, '60m', '3mo');
      candles = aggregateHourlyTo4h(hourly);
    } else {
      const raw = await fetchYahooCandles(ySymbol, cfg.yInterval, cfg.yRange);
      candles = raw.map(c => ({ ...c }));
    }
    res.status(200).json({ symbol, interval, candles });
  } catch (e) {
    res.status(500).json({ error: String(e), symbol, interval, candles: [] });
  }
}
