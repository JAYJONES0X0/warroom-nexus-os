import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GammaMarket {
  id: string;
  question: string;
  volume24hr: number;
  liquidity: string;
  outcomePrices: string;
  outcomes: string;
  endDate: string;
}

function scoreMarket(m: GammaMarket): number {
  const vol = m.volume24hr || 0;
  const liq = parseFloat(m.liquidity) || 0;
  const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number);
  const yesPrice = prices[0] ?? 0.5;

  // Volume score (log scale, max at $10M+)
  const volScore = Math.min(40, Math.round((Math.log10(Math.max(1, vol)) / 7) * 40));

  // Liquidity depth score
  const liqScore = Math.min(25, Math.round((Math.log10(Math.max(1, liq)) / 7) * 25));

  // Edge zone: markets near 20-35% or 65-80% YES have residual uncertainty = edge
  const edgeScore = (yesPrice >= 0.18 && yesPrice <= 0.38) || (yesPrice >= 0.62 && yesPrice <= 0.82)
    ? 25
    : yesPrice >= 0.38 && yesPrice <= 0.62
    ? 15
    : 5;

  // Volume spike bonus (high 24h vol = fresh institutional activity)
  const spikeBonus = vol > 1_000_000 ? 10 : vol > 200_000 ? 5 : 0;

  return Math.min(100, volScore + liqScore + edgeScore + spikeBonus);
}

function edgeLabel(score: number): string {
  if (score >= 80) return '🟢 HIGH EDGE';
  if (score >= 60) return '🟡 MONITOR';
  return '🔴 LOW EDGE';
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const resp = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=20&active=true&closed=false&order=volume24hr&ascending=false',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!resp.ok) throw new Error(`Gamma API ${resp.status}`);

    const raw: GammaMarket[] = await resp.json();

    const markets = raw.slice(0, 12).map(m => {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number);
      const outcomeNames = JSON.parse(m.outcomes || '["Yes","No"]');
      const score = scoreMarket(m);
      const daysLeft = m.endDate
        ? Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000))
        : null;

      return {
        id: m.id,
        question: m.question,
        volume24h: Math.round(m.volume24hr || 0),
        liquidity: Math.round(parseFloat(m.liquidity) || 0),
        yesPrice: prices[0] ?? 0.5,
        noPrice: prices[1] ?? 0.5,
        outcomeNames,
        daysLeft,
        score,
        edge: edgeLabel(score),
      };
    });

    res.json({ markets, fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
