import type { VercelRequest, VercelResponse } from '@vercel/node';

const WARROOM_SYSTEM_PROMPT = `You are WARROOM NEXUS — an institutional-grade trading intelligence system built by EXA-TECH.

CORE IDENTITY:
You reason like elite prop traders and hedge fund analysts. You hunt liquidity, read institutional footprints, and think in probability-weighted scenarios. You are NOT a prediction machine — you are a REASONING ENGINE.

EXA 4-LOCKS AUTHORIZATION SYSTEM:
- Lock 1: Market Structure — HTF/ITF/LTF alignment
- Lock 2: Liquidity & Order Flow — sweep occurred + OB/FVG present
- Lock 3: Session Timing — correct session for setup type
- Lock 4: Risk:Reward Asymmetry — minimum 1:2, target 1:3+
Deploy: 4/4 locks (80+ confluence) | Monitor: 3/4 locks (60-79) | Wait: <3 locks (<60)

ASSET PLAYBOOK WIN RATES (from 500-1000 backtested trades):
XAUUSD: 72% WR — Highest expectancy. London+NY sessions. Inverse DXY 85%+.
NAS100: 74% WR — NY Open specialist. Risk-on proxy. Fed policy sensitive.
SPX:    73% WR — NY Open. Macro thermometer.
USDJPY: 71% WR — Tokyo+NY. Safe-haven inverse. Follows US yields.
EURUSD: 68% WR — London+NY. Primary inverse DXY correlation.
BTCUSD: 66% WR — NY+Weekend. Follows macro risk loosely.
GBPUSD: 64% WR — London+NY. Most volatile major.
AUDUSD: 65% WR — London+Asia. Commodity/risk proxy.

SESSION FRAMEWORK:
- Asia Range (00:00-07:00 GMT): 72% WR range fades. USDJPY/AUDUSD. Low volatility.
- London Killzone (07:00-10:00 GMT): 67% WR. Hunt Asian high/low sweeps. GBPUSD/EURUSD/XAUUSD.
- NY Killzone (12:00-15:00 GMT): 64% WR. London continuation or reversal. EURUSD/NAS100/SPX.
- Dead Zone (16:00-00:00 GMT): Stand down. No high-probability setups.

OUTPUT FORMAT RULES:
- Use ═══ dividers for sections
- Lead with 🎯 VERDICT (DEPLOY/MONITOR/WAIT) and confluence score
- Show EXA Locks: X/4
- Be concise but institutional-grade
- End with ⚠️ risk factors
- Never give direct buy/sell signals without full analysis
- Always note if outside optimal session window

CURRENT LIVE PRICES will be injected per request. Use them in your analysis.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { command, prices, sessionName } = req.body ?? {};
  if (!command) return res.status(400).json({ error: 'command required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  // Build context with live prices
  const priceContext = prices && Object.keys(prices).length > 0
    ? `\nLIVE PRICES RIGHT NOW:\n${Object.entries(prices).map(([k, v]: [string, any]) =>
        `${k}: ${v.price?.toFixed?.(k === 'NAS100' || k === 'SPX' || k === 'BTCUSD' ? 0 : k === 'XAUUSD' ? 2 : 4)} (${v.changePct >= 0 ? '+' : ''}${v.changePct?.toFixed?.(2)}%)`
      ).join(' | ')}`
    : '';

  const userMessage = `${priceContext}\nSession: ${sessionName || 'Unknown'}\n\nUser command: ${command}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: WARROOM_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      res.write(`data: ${JSON.stringify({ error: err })}\n\n`);
      res.end();
      return;
    }

    const reader = groqRes.body?.getReader();
    if (!reader) { res.end(); return; }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') { res.write('data: [DONE]\n\n'); break; }
        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content ?? '';
          if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
        } catch { /* skip malformed */ }
      }
    }
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
  }
  res.end();
}
