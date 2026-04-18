import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pair, prices, session } = req.body ?? {};
  if (!pair) return res.status(400).json({ error: 'pair required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const priceLines = prices
    ? Object.entries(prices).map(([k, v]: [string, any]) =>
        `${k}: ${v.price?.toFixed?.(k === 'NAS100' || k === 'SPX' || k === 'BTCUSD' ? 0 : k === 'XAUUSD' ? 2 : 4)} (${v.changePct >= 0 ? '+' : ''}${v.changePct?.toFixed?.(2)}%)`
      ).join('\n')
    : 'No prices available';

  const prompt = `You are ARCHON — the EXA autonomous override protocol. Analyze ${pair} right now and return ONLY valid JSON, no other text.

LIVE MARKET DATA:
${priceLines}

Current Session: ${session || 'Unknown'}

Analyze ${pair} using EXA 4-LOCKS framework:
- Lock1: Is market structure bullish or bearish?
- Lock2: Is there a liquidity pool nearby that has been swept or is available?
- Lock3: Is this a valid trading session (London/NY killzone)?
- Lock4: Is there confirmation (displacement, BOS, FVG)?

Return ONLY this JSON:
{
  "pair": "${pair}",
  "signal": "DEPLOY|MONITOR|DENIED",
  "bias": "BULLISH|BEARISH|NEUTRAL",
  "confluence": 0-100,
  "locks": [true|false, true|false, true|false, true|false],
  "entry": "price or null",
  "sl": "price or null",
  "tp": "price or null",
  "rr": "ratio or null",
  "key_levels": ["level1", "level2"],
  "reasoning": "2-3 sentence institutional analysis",
  "session_note": "one line session comment"
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a financial analysis AI. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(500).json({ error: err });
    }

    const data = await groqRes.json();
    let content = data.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(content);
    return res.json({ success: true, signal: parsed });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
