import type { VercelRequest, VercelResponse } from '@vercel/node';

// Yahoo Finance symbol map for all 11 WARROOM NEXUS assets
const SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  GBPJPY: 'GBPJPY=X',
  AUDUSD: 'AUDUSD=X',
  NZDUSD: 'NZDUSD=X',
  XAUUSD: 'GC=F',
  NAS100: 'NQ=F',
  SPX: 'ES=F',
  BTCUSD: 'BTC-USD',
  DXY: 'DX-Y.NYB',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const symbols = Object.values(SYMBOL_MAP).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);

    const data = await response.json();
    const quotes = data?.quoteResponse?.result ?? [];

    const prices: Record<string, { price: number; change: number; changePct: number; symbol: string }> = {};

    // Invert SYMBOL_MAP for lookup
    const reverseMap = Object.fromEntries(Object.entries(SYMBOL_MAP).map(([k, v]) => [v, k]));

    for (const q of quotes) {
      const nexusKey = reverseMap[q.symbol];
      if (nexusKey) {
        prices[nexusKey] = {
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePct: q.regularMarketChangePercent ?? 0,
          symbol: q.symbol,
        };
      }
    }

    res.status(200).json({ prices, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: String(err), prices: {} });
  }
}
