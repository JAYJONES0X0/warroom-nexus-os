import type { VercelRequest, VercelResponse } from '@vercel/node';

// ForexFactory public calendar JSON — no API key required
const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 15min — calendar doesn't change that fast
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  try {
    const r = await fetch(FF_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    if (!r.ok) throw new Error(`ForexFactory ${r.status}`);

    const raw: any[] = await r.json();

    // Filter to high/medium impact events, next 48h
    const now = Date.now();
    const window = 48 * 3600 * 1000;

    const events = raw
      .filter(e => {
        const t = new Date(e.date).getTime();
        return t >= now - 3600_000 && t <= now + window && (e.impact === 'High' || e.impact === 'Medium');
      })
      .map(e => ({
        title:    e.title,
        country:  e.country,
        date:     e.date,
        impact:   e.impact,
        forecast: e.forecast ?? null,
        previous: e.previous ?? null,
        actual:   e.actual ?? null,
        minsAway: Math.round((new Date(e.date).getTime() - now) / 60_000),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({ events, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: String(err), events: [] });
  }
}
