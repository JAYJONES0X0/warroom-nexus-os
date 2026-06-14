import type { VercelRequest, VercelResponse } from '@vercel/node';

// Resolution status for specific Polymarket markets (by id). Used by the Track
// Record scoreboard to stamp outcomes onto logged predictions once they settle.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const ids = String(req.query.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
  if (!ids.length) return res.status(200).json({ results: [] });

  try {
    const results = await Promise.all(ids.map(async (id) => {
      try {
        const r = await fetch(`https://gamma-api.polymarket.com/markets/${encodeURIComponent(id)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!r.ok) return { id, closed: false, winner: null as 'YES' | 'NO' | null };
        const m = await r.json();
        const closed = !!m.closed;
        let winner: 'YES' | 'NO' | null = null;
        if (closed) {
          const prices = JSON.parse(m.outcomePrices || '["0","0"]').map(Number);
          winner = (prices[0] ?? 0) >= 0.99 ? 'YES' : (prices[1] ?? 0) >= 0.99 ? 'NO' : null;
        }
        return { id, closed, winner };
      } catch {
        return { id, closed: false, winner: null as 'YES' | 'NO' | null };
      }
    }));
    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: String(e), results: [] });
  }
}
