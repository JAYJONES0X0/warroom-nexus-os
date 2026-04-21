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
      // Return mock data on error
      const mockQuotes: CryptoQuote[] = COINS.map((id, i) => ({
        id,
        name: id === 'bitcoin' ? 'Bitcoin' : 'Ethereum',
        symbol: id === 'bitcoin' ? 'BTC' : 'ETH',
        price: id === 'bitcoin' ? 65000 + Math.random() * 5000 : 3500 + Math.random() * 500,
        change24h: (Math.random() - 0.5) * 1000,
        changePercent24h: (Math.random() - 0.5) * 5,
        marketCap: id === 'bitcoin' ? 1.2e12 : 4e11,
        volume24h: 2e10,
      }));
      return res.json({ quotes: mockQuotes, fetchedAt: Date.now() });
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
