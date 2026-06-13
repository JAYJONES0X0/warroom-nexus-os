import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WARROOM_DOCTRINE, getPlaybook, roundMagnet } from './_playbooks.js';
import { fetchDailyLevels } from './_levels.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pair, prices, session } = req.body ?? {};
  if (!pair) return res.status(400).json({ error: 'pair required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  const dp = (k: string) => (k === 'NAS100' || k === 'SPX' || k === 'BTCUSD' ? 0 : k === 'XAUUSD' ? 2 : 4);
  const priceLines = prices
    ? Object.entries(prices).map(([k, v]: [string, any]) =>
        `${k}: ${v.price?.toFixed?.(dp(k))} (${v.changePct >= 0 ? '+' : ''}${v.changePct?.toFixed?.(2)}%)`
      ).join('\n')
    : 'No prices available';

  // Derive a bias hint from the day's move (ARCHON may override with structure).
  const self = prices?.[pair];
  const chg = self?.changePct ?? 0;
  const biasHint = chg > 0.05 ? 'BULLISH' : chg < -0.05 ? 'BEARISH' : 'NEUTRAL';
  const magnet = self?.price ? roundMagnet(pair, self.price) : 'n/a';

  // Real swing-liquidity levels (previous day / week / month H-L) for this pair.
  const lv = await fetchDailyLevels(pair);
  const fmtL = (n: number) => n.toFixed(dp(pair));
  const levelsBlock = lv
    ? `PDH ${fmtL(lv.pdh)} · PDL ${fmtL(lv.pdl)} | PWH ${fmtL(lv.pwh)} · PWL ${fmtL(lv.pwl)} | PMH ${fmtL(lv.pmh)} · PML ${fmtL(lv.pml)}`
    : 'unavailable';

  const prompt = `Analyze ${pair} RIGHT NOW and return ONLY valid JSON.

LIVE MARKET DATA (use this to run the correlation shield):
${priceLines}

CURRENT SESSION: ${session || 'Unknown'}
${pair} DAY MOVE: ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% → bias hint: ${biasHint}
LIQUIDITY MAGNET: ${pair} is ${magnet}

KEY SWING LEVELS (real previous day/week/month highs & lows — these are the actual
stop-cluster targets and invalidation lines; cite THESE, not just round numbers):
${levelsBlock}

ASSET PLAYBOOK (apply this — it is YOUR backtested edge):
${getPlaybook(pair)}

Run the 4-LOCKS, verify the correlation shield against the live prices above, apply
the Paradox Cone, anchor entry/SL/TP and key_levels to the real swing levels above,
then return ONLY this JSON (no prose outside it):
{
  "pair": "${pair}",
  "signal": "DEPLOY|MONITOR|DENIED",
  "bias": "BULLISH|BEARISH|NEUTRAL",
  "confluence": 0-100,
  "locks": [structure:bool, liquidity:bool, session:bool, confluence:bool],
  "pattern": "the playbook setup that fits, or 'none'",
  "entry": "price or null",
  "sl": "price or null",
  "tp": "price or null",
  "rr": "ratio number or null",
  "key_levels": ["level1", "level2"],
  "reasoning": "2-3 sentences citing the specific lock(s), pattern and correlation evidence",
  "invalidation": "what price action would kill this idea",
  "session_note": "one line session comment"
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `${WARROOM_DOCTRINE}\n\nRespond ONLY with valid JSON.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
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
