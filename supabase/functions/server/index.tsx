import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client (for auth and storage)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Health check endpoint
app.get("/make-server-8d0dd370/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTH ENDPOINTS =====

// Sign up endpoint
app.post("/make-server-8d0dd370/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      email_confirm: true, // Auto-confirm since email server not configured
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    console.log(`User created successfully: ${email}`);
    return c.json({ user: data.user });
  } catch (err) {
    console.log(`Signup exception: ${err.message || err}`);
    return c.json({ error: `Internal server error during signup: ${err.message || 'Unknown error'}` }, 500);
  }
});

// Get user info endpoint (requires auth)
app.get("/make-server-8d0dd370/auth/user", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No access token provided" }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ user });
  } catch (err) {
    console.log(`Get user error: ${err}`);
    return c.json({ error: "Internal server error getting user" }, 500);
  }
});

// ===== PLAYBOOK ENDPOINTS =====

// Upload playbook files
app.post("/make-server-8d0dd370/playbooks/upload", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { filename, content, asset_class } = body;

    // Store in KV store with key: playbook_{userId}_{filename}
    const playbookKey = `playbook_${user.id}_${filename}`;
    await kv.set(playbookKey, {
      filename,
      content,
      asset_class: asset_class || "GENERAL",
      user_id: user.id,
      uploaded_at: new Date().toISOString(),
    });

    console.log(`Playbook uploaded: ${filename} by user ${user.id}`);
    return c.json({ success: true, filename });
  } catch (err) {
    console.log(`Playbook upload error: ${err}`);
    return c.json({ error: "Failed to upload playbook" }, 500);
  }
});

// List all playbooks for user
app.get("/make-server-8d0dd370/playbooks", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all playbooks for this user
    const playbookPrefix = `playbook_${user.id}_`;
    const playbooks = await kv.getByPrefix(playbookPrefix);

    return c.json({ playbooks });
  } catch (err) {
    console.log(`List playbooks error: ${err}`);
    return c.json({ error: "Failed to list playbooks" }, 500);
  }
});

// Delete playbook
app.delete("/make-server-8d0dd370/playbooks/:filename", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const filename = c.req.param('filename');
    const playbookKey = `playbook_${user.id}_${filename}`;
    
    await kv.del(playbookKey);

    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete playbook error: ${err}`);
    return c.json({ error: "Failed to delete playbook" }, 500);
  }
});

// ===== TRIBUNAL EXECUTION ENDPOINT =====

interface TribunalRequest {
  asset: string;
  query: string;
  market_data?: any;
}

interface TribunalOutput {
  asset: string;
  bias: "bullish_continuation" | "bearish_reversal" | "neutral";
  confidence: number;
  verdict: "EXECUTE" | "WAIT" | "NO_TRADE";
  key_levels: number[];
  prior_analysis_validation: "confirmed" | "updated" | "contradiction_resolved";
  tribunal_summary: string;
  full_reasoning: string;
}

// Execute tribunal analysis with Perplexity API
app.post("/make-server-8d0dd370/tribunal/execute", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized - no access token" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.log(`Tribunal auth error: ${authError?.message}`);
      return c.json({ error: "Unauthorized - invalid token" }, 401);
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return c.json({ error: "Perplexity API key not configured" }, 500);
    }

    const body: TribunalRequest = await c.req.json();
    const { asset, query, market_data } = body;

    console.log(`Tribunal execution started for ${asset} by user ${user.id}`);

    // 1. Load all playbooks
    const playbookPrefix = `playbook_${user.id}_`;
    const playbooks = await kv.getByPrefix(playbookPrefix);
    const playbookContext = playbooks.map((pb: any) => `=== ${pb.filename} ===\n${pb.content}`).join('\n\n');

    // 2. Load top 3 relevant past analyses (simplified - get last 3 for now)
    const analysisPrefix = `analysis_${user.id}_`;
    const pastAnalyses = await kv.getByPrefix(analysisPrefix);
    const recentAnalyses = pastAnalyses.slice(-3);
    const priorContext = recentAnalyses.length > 0 
      ? recentAnalyses.map((a: any, i: number) => `[Past Analysis ${i+1}] ${a.asset}: ${a.verdict} (confidence: ${a.confidence})`).join('\n')
      : "No prior analyses available.";

    // 3. Run Perplexity API calls in parallel for Bull and Bear
    const baseUrl = "https://api.perplexity.ai/chat/completions";
    
    const bullPrompt = `You are the BULL ADVOCATE in a financial tribunal analyzing ${asset}.

PLAYBOOKS:
${playbookContext}

PRIOR ANALYSES:
${priorContext}

USER QUERY: ${query}

${market_data ? `MARKET DATA: ${JSON.stringify(market_data)}` : ''}

Your role: Argue ONLY the bullish case. Find every valid reason for upward price movement using the playbook rules. Be aggressive but logical. Focus on:
- Bullish technical patterns
- Positive momentum indicators
- Support levels holding
- Volume confirmations
- Fundamental catalysts

Output your bullish argument in 200-300 words.`;

    const bearPrompt = `You are the BEAR ADVOCATE in a financial tribunal analyzing ${asset}.

PLAYBOOKS:
${playbookContext}

PRIOR ANALYSES:
${priorContext}

USER QUERY: ${query}

${market_data ? `MARKET DATA: ${JSON.stringify(market_data)}` : ''}

Your role: Argue ONLY the bearish case. Identify every risk, contradiction, and reason for downward movement using the CONTRADICTION_RESOLUTION_ENGINE. Be skeptical and thorough. Focus on:
- Bearish reversal patterns
- Overbought conditions
- Resistance levels
- Divergences
- Risk factors

Output your bearish argument in 200-300 words.`;

    // Call Bull and Bear in parallel
    const [bullResponse, bearResponse] = await Promise.all([
      fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            { role: 'system', content: 'You are an expert financial analyst.' },
            { role: 'user', content: bullPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      }),
      fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            { role: 'system', content: 'You are an expert financial analyst.' },
            { role: 'user', content: bearPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      })
    ]);

    if (!bullResponse.ok || !bearResponse.ok) {
      const bullError = !bullResponse.ok ? await bullResponse.text() : null;
      const bearError = !bearResponse.ok ? await bearResponse.text() : null;
      console.log(`Perplexity API error - Bull: ${bullError}, Bear: ${bearError}`);
      return c.json({ error: "Failed to execute tribunal - Perplexity API error" }, 500);
    }

    const bullData = await bullResponse.json();
    const bearData = await bearResponse.json();

    const bullArgument = bullData.choices[0].message.content;
    const bearArgument = bearData.choices[0].message.content;

    // 4. Now run the Judge with both arguments
    const judgePrompt = `You are the NEUTRAL JUDGE in a financial tribunal analyzing ${asset}.

You have heard arguments from both advocates:

=== BULL ADVOCATE ARGUMENT ===
${bullArgument}

=== BEAR ADVOCATE ARGUMENT ===
${bearArgument}

PLAYBOOKS:
${playbookContext}

PRIOR ANALYSES:
${priorContext}

Your role: Weigh both arguments objectively using the RISK_ASYMMETRY_CALCULATOR logic. Apply the playbook rules to determine the most probable outcome.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "asset": "${asset}",
  "bias": "bullish_continuation" | "bearish_reversal" | "neutral",
  "confidence": 0.00-1.00,
  "verdict": "EXECUTE" | "WAIT" | "NO_TRADE",
  "key_levels": [number array of price levels],
  "prior_analysis_validation": "confirmed" | "updated" | "contradiction_resolved",
  "tribunal_summary": "1-2 sentence summary",
  "full_reasoning": "detailed reasoning chain"
}

Critical rules:
- confidence must be between 0 and 1
- If confidence < 0.85, verdict MUST be "NO_TRADE"
- bias must be exactly one of: "bullish_continuation", "bearish_reversal", "neutral"
- verdict must be exactly one of: "EXECUTE", "WAIT", "NO_TRADE"

Respond with ONLY the JSON object, no other text.`;

    const judgeResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'system', content: 'You are a neutral financial judge. Respond only with valid JSON.' },
          { role: 'user', content: judgePrompt }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      })
    });

    if (!judgeResponse.ok) {
      const judgeError = await judgeResponse.text();
      console.log(`Judge Perplexity error: ${judgeError}`);
      return c.json({ error: "Failed to get judge verdict" }, 500);
    }

    const judgeData = await judgeResponse.json();
    let judgeContent = judgeData.choices[0].message.content;

    // Extract JSON from markdown code blocks if present
    if (judgeContent.includes('```json')) {
      judgeContent = judgeContent.split('```json')[1].split('```')[0].trim();
    } else if (judgeContent.includes('```')) {
      judgeContent = judgeContent.split('```')[1].split('```')[0].trim();
    }

    let tribunalOutput: TribunalOutput;
    try {
      tribunalOutput = JSON.parse(judgeContent);
    } catch (parseError) {
      console.log(`Failed to parse judge output: ${judgeContent}`);
      // Fallback structure
      tribunalOutput = {
        asset,
        bias: "neutral",
        confidence: 0.50,
        verdict: "NO_TRADE",
        key_levels: [],
        prior_analysis_validation: "updated",
        tribunal_summary: "Unable to parse tribunal verdict",
        full_reasoning: judgeContent
      };
    }

    // 5. Apply confidence override rule
    if (tribunalOutput.confidence < 0.85) {
      tribunalOutput.verdict = "NO_TRADE";
    }

    // 6. Save analysis to database
    const analysisId = `analysis_${user.id}_${Date.now()}`;
    await kv.set(analysisId, {
      ...tribunalOutput,
      bull_argument: bullArgument,
      bear_argument: bearArgument,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      query: query,
    });

    console.log(`Tribunal analysis complete for ${asset}: ${tribunalOutput.verdict} (confidence: ${tribunalOutput.confidence})`);

    // 7. Return full tribunal result
    return c.json({
      success: true,
      tribunal: {
        bull: bullArgument,
        bear: bearArgument,
        judge: tribunalOutput,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.log(`Tribunal execution error: ${err}`);
    return c.json({ error: `Internal server error during tribunal execution: ${err.message}` }, 500);
  }
});

// ===== ANALYSIS HISTORY ENDPOINT =====

app.get("/make-server-8d0dd370/analyses", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const analysisPrefix = `analysis_${user.id}_`;
    const analyses = await kv.getByPrefix(analysisPrefix);

    // Sort by timestamp descending
    analyses.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ analyses });
  } catch (err) {
    console.log(`Get analyses error: ${err}`);
    return c.json({ error: "Failed to retrieve analyses" }, 500);
  }
});

Deno.serve(app.fetch);