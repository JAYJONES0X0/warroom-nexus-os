import type { VercelRequest, VercelResponse } from '@vercel/node';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

const INDICES = [
  { symbol: 'SPX', name: 'S&P 500', finnhub: '^GSPC', currency: 'USD' },
  { symbol: 'NDX', name: 'Nasdaq 100', finnhub: '^IXIC', currency: 'USD' },
  { symbol: 'VIX', name: 'VIX', finnhub: '^VIX', currency: 'USD' },
  { symbol: 'DXY', name: 'US Dollar Index', finnhub: 'DX-Y.NYB', currency: 'USD' },
  { symbol: 'GC', name: 'Gold', finnhub: 'GC=F', currency: 'USD' },
  { symbol: 'CL', name: 'WTI Crude Oil', finnhub: 'CL=F', currency: 'USD' },
];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=30');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (!FINNHUB_KEY) {
      // No key → report the feed as unavailable rather than fabricating prices.
      // The UI drops non-200 feeds and shows nothing instead of fake numbers.
      return res.status(503).json({ error: 'FINNHUB_API_KEY not configured', quotes: [] });
    }

    const quotes = await Promise.all(
      INDICES.map(async (idx): Promise<MarketQuote> => {
        try {
          const resp = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(idx.finnhub)}&token=${FINNHUB_KEY}`,
            { headers: { 'User-Agent': 'EXA-WARROOM/1.0' } }
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          
          const price = data.c || 0;
          const prevClose = data.pc || price;
          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

          return {
            symbol: idx.symbol,
            name: idx.name,
            price,
            change,
            changePercent,
            currency: idx.currency,
          };
        } catch (e) {
          return {
            symbol: idx.symbol,
            name: idx.name,
            price: 0,
            change: 0,
            changePercent: 0,
            currency: idx.currency,
          };
        }
      })
    );

    res.json({ quotes: quotes.filter(q => q.price > 0), fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
