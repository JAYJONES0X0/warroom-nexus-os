import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchDailyLevels, LEVEL_SYMBOLS, type KeyLevels } from './_levels.js';

// Daily swing levels for every tracked asset. Levels only change once per day,
// so cache hard (30m edge cache + SWR) — cheap despite fanning out to Yahoo.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  try {
    const results = await Promise.all(
      LEVEL_SYMBOLS.map(async (p) => [p, await fetchDailyLevels(p)] as const)
    );
    const levels: Record<string, KeyLevels> = {};
    for (const [p, lv] of results) if (lv) levels[p] = lv;
    res.status(200).json({ levels, fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: String(e), levels: {} });
  }
}
