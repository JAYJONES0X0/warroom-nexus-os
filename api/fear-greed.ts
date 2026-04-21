import type { VercelRequest, VercelResponse } from '@vercel/node';

interface FearGreedResponse {
  value: number;
  classification: string;
  timestamp: number;
}

// Alternative Fear & Greed sources
async function fetchAlternativeMe(): Promise<FearGreedResponse | null> {
  try {
    const resp = await fetch('https://api.alternative.me/fng/');
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.data?.[0]) return null;
    
    const entry = data.data[0];
    return {
      value: parseInt(entry.value),
      classification: entry.value_classification,
      timestamp: parseInt(entry.timestamp) * 1000,
    };
  } catch {
    return null;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=300'); // 5 min cache
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const data = await fetchAlternativeMe();
    
    if (data) {
      res.json(data);
    } else {
      // Fallback to mock data
      res.json({
        value: 50 + Math.floor(Math.random() * 30) - 15,
        classification: 'Neutral',
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    res.status(500).json({ 
      value: 50,
      classification: 'Neutral', 
      timestamp: Date.now(),
      error: String(e)
    });
  }
}
