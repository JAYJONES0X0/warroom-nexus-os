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

interface Provider {
  name: string;
  url: string;
  authHeader: string;
  model: string;
}

function buildProviders(): Provider[] {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  const chain: Provider[] = [];

  if (groqKey) chain.push({
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: `Bearer ${groqKey}`,
    model: 'llama-3.3-70b-versatile',
  });

  if (orKey) {
    chain.push({
      name: 'openrouter-gemini',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      authHeader: `Bearer ${orKey}`,
      model: 'google/gemini-2.5-flash',
    });
    chain.push({
      name: 'openrouter-deepseek',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      authHeader: `Bearer ${orKey}`,
      model: 'deepseek/deepseek-r1-0528',
    });
  }

  return chain;
}

async function tryProvider(
  provider: Provider,
  messages: { role: string; content: string }[],
): Promise<Response | null> {
  try {
    const headers: Record<string, string> = {
      'Authorization': provider.authHeader,
      'Content-Type': 'application/json',
    };
    if (provider.name.startsWith('openrouter')) {
      headers['HTTP-Referer'] = 'https://cosmic-warroom-main.vercel.app';
      headers['X-Title'] = 'WARROOM NEXUS';
    }

    const res = await fetch(provider.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (res.ok) return res;
    // 429 = rate limited, 5xx = provider error → try next
    const status = res.status;
    if (status === 429 || status >= 500) return null;
    // 4xx client error (bad key etc) — log but keep trying
    return null;
  } catch {
    return null;
  }
}

async function streamResponse(providerRes: Response, res: VercelResponse) {
  const reader = providerRes.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content ?? '';
        if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
      } catch { /* skip malformed chunk */ }
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const command = req.body?.command ?? req.body?.message;
  const prices = req.body?.prices;
  const sessionName = req.body?.sessionName;
  if (!command) return res.status(400).json({ error: 'command required' });

  const providers = buildProviders();
  if (providers.length === 0) return res.status(500).json({ error: 'No AI provider keys configured' });

  const priceContext = prices && Object.keys(prices).length > 0
    ? `\nLIVE PRICES RIGHT NOW:\n${Object.entries(prices).map(([k, v]: [string, any]) =>
        `${k}: ${v.price?.toFixed?.(k === 'NAS100' || k === 'SPX' || k === 'BTCUSD' ? 0 : k === 'XAUUSD' ? 2 : 4)} (${v.changePct >= 0 ? '+' : ''}${v.changePct?.toFixed?.(2)}%)`
      ).join(' | ')}`
    : '';

  const userMessage = `${priceContext}\nSession: ${sessionName || 'Unknown'}\n\nUser command: ${command}`;
  const messages = [
    { role: 'system', content: WARROOM_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  for (const provider of providers) {
    const providerRes = await tryProvider(provider, messages);
    if (!providerRes) continue;
    try {
      await streamResponse(providerRes, res);
      res.end();
      return;
    } catch (e) {
      // Stream failed mid-way — can't retry, just end
      res.write(`data: ${JSON.stringify({ error: `Stream error on ${provider.name}: ${String(e)}` })}\n\n`);
      res.end();
      return;
    }
  }

  // All providers exhausted
  res.write(`data: ${JSON.stringify({ error: 'All providers unavailable. Check GROQ_API_KEY / OPENROUTER_API_KEY.' })}\n\n`);
  res.end();
}
