import type { VercelRequest, VercelResponse } from '@vercel/node';

// Returns the Twelve Data API key for browser WebSocket connection.
// Key is read-only price data — safe to expose to the browser.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.TWELVEDATA_API_KEY ?? null;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ key, hasKey: !!key });
}
