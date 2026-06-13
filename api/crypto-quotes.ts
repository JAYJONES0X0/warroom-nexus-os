import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CryptoQuote {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
}

const COINS = ['bitcoin', 'ethereum'];

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=30');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.join(',')}&order=market_cap_desc`,
      { headers: { 'User-Agent': 'EXA-WARROOM/1.0' } }
    );

    if (!resp.ok) {
      // Upstream down → report unavailable rather than inventing crypto prices.
      // The UI drops non-200 feeds and shows nothing instead of fake numbers.
      return res.status(502).json({ error: `coingecko ${resp.status}`, quotes: [] });
    }

    const data = await resp.json();
    const quotes: CryptoQuote[] = data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_24h,
      changePercent24h: coin.price_change_percentage_24h,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
    }));

    res.json({ quotes, fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
