import type { VercelRequest, VercelResponse } from '@vercel/node';

// Twelve Data symbol map (primary — real-time forex/crypto/commodities)
const TD_SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  GBPJPY: 'GBP/JPY',
  AUDUSD: 'AUD/USD',
  NZDUSD: 'NZD/USD',
  XAUUSD: 'XAU/USD',
  BTCUSD: 'BTC/USD',
  NAS100: 'NDX',
  SPX:    'SPX500USD',
  DXY:    'DXY',
};

// Yahoo Finance fallback symbol map
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  GBPJPY: 'GBPJPY=X',
  AUDUSD: 'AUDUSD=X',
  NZDUSD: 'NZDUSD=X',
  XAUUSD: 'GC=F',
  BTCUSD: 'BTC-USD',
  NAS100: 'NQ=F',
  SPX:    'ES=F',
  DXY:    'DX-Y.NYB',
};

type PriceResult = Record<string, { price: number; change: number; changePct: number; symbol: string }>;

async function fetchTwelveData(apiKey: string): Promise<PriceResult | null> {
  const symbols = Object.values(TD_SYMBOL_MAP).join(',');
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.code) return null; // error response

  const prices: PriceResult = {};
  const reverseMap = Object.fromEntries(Object.entries(TD_SYMBOL_MAP).map(([k, v]) => [v, k]));

  for (const [tdSymbol, quote] of Object.entries(data) as [string, any][]) {
    const nexusKey = reverseMap[tdSymbol];
    if (!nexusKey || quote.status === 'error' || !quote.close) continue;
    prices[nexusKey] = {
      price:     parseFloat(quote.close),
      change:    parseFloat(quote.change ?? '0'),
      changePct: parseFloat(quote.percent_change ?? '0'),
      symbol:    tdSymbol,
    };
  }

  return Object.keys(prices).length >= 5 ? prices : null;
}

// Yahoo's batched v7 /quote endpoint now demands crumb auth and 401s on serverless.
// The v8 /chart endpoint still serves price + previous close per symbol, so we
// fan out one chart request per instrument and tolerate individual failures.
async function fetchYahoo(): Promise<PriceResult> {
  const results = await Promise.all(
    Object.entries(YAHOO_SYMBOL_MAP).map(async ([nexusKey, ySym]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        if (price == null) return null;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prev;
        const changePct = prev ? (change / prev) * 100 : 0;
        return [nexusKey, { price, change, changePct, symbol: ySym }] as const;
      } catch {
        return null;
      }
    })
  );

  const prices: PriceResult = {};
  for (const r of results) if (r) prices[r[0]] = r[1];
  if (Object.keys(prices).length === 0) throw new Error('Yahoo v8: no symbols resolved');
  return prices;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 5s server cache — 6× faster than Yahoo 30s
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');

  try {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    let prices: PriceResult | null = null;
    let source = 'yahoo';

    if (apiKey) {
      prices = await fetchTwelveData(apiKey);
      if (prices) source = 'twelvedata';
    }

    if (!prices) {
      prices = await fetchYahoo();
    }

    res.status(200).json({ prices, fetchedAt: new Date().toISOString(), source });
  } catch (err) {
    res.status(500).json({ error: String(err), prices: {}, source: 'error' });
  }
}
