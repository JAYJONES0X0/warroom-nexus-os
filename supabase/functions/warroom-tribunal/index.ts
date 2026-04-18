import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function groq(messages: { role: string; content: string }[], temperature = 0.7, max_tokens = 600): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature, max_tokens }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function getUser(authHeader: string | undefined) {
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

// Health
app.get("/warroom-tribunal/health", (c) => c.json({ status: "ok" }));

// Auth: signup
app.post("/warroom-tribunal/auth/signup", async (c) => {
  const { email, password, name } = await c.req.json();
  if (!email || !password) return c.json({ error: "Email and password required" }, 400);
  const { data, error } = await supabase.auth.admin.createUser({
    email, password,
    user_metadata: { name: name || "" },
    email_confirm: true,
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ user: data.user });
});

// Playbooks: upload
app.post("/warroom-tribunal/playbooks/upload", async (c) => {
  const user = await getUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { filename, content, asset_class } = await c.req.json();
  await kv.set(`playbook_${user.id}_${filename}`, { filename, content, asset_class: asset_class || "GENERAL", user_id: user.id, uploaded_at: new Date().toISOString() });
  return c.json({ success: true, filename });
});

// Playbooks: list
app.get("/warroom-tribunal/playbooks", async (c) => {
  const user = await getUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const playbooks = await kv.getByPrefix(`playbook_${user.id}_`);
  return c.json({ playbooks });
});

// Playbooks: delete
app.delete("/warroom-tribunal/playbooks/:filename", async (c) => {
  const user = await getUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await kv.del(`playbook_${user.id}_${c.req.param("filename")}`);
  return c.json({ success: true });
});

// Tribunal: execute
app.post("/warroom-tribunal/tribunal/execute", async (c) => {
  const user = await getUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { asset, query } = await c.req.json();

  const playbooks = await kv.getByPrefix(`playbook_${user.id}_`) as any[];
  const playbookContext = playbooks.map((pb) => `=== ${pb.filename} ===\n${pb.content}`).join("\n\n") || "No playbooks loaded.";

  const pastAnalyses = await kv.getByPrefix(`analysis_${user.id}_`) as any[];
  pastAnalyses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const priorContext = pastAnalyses.slice(0, 3).map((a, i) => `[Past ${i + 1}] ${a.asset}: ${a.verdict} (conf: ${(a.confidence * 100).toFixed(0)}%) — ${a.tribunal_summary}`).join("\n") || "No prior analyses.";

  const systemPrompt = "You are an expert institutional trader and financial analyst. Be concise and precise.";

  const [bullArg, bearArg] = await Promise.all([
    groq([
      { role: "system", content: systemPrompt },
      { role: "user", content: `You are the BULL ADVOCATE for ${asset}. Argue only the bullish case (200-250 words) based on:\n\nPLAYBOOKS:\n${playbookContext}\n\nPRIOR:\n${priorContext}\n\nQUERY: ${query}` },
    ], 0.7, 400),
    groq([
      { role: "system", content: systemPrompt },
      { role: "user", content: `You are the BEAR ADVOCATE for ${asset}. Argue only the bearish case (200-250 words) based on:\n\nPLAYBOOKS:\n${playbookContext}\n\nPRIOR:\n${priorContext}\n\nQUERY: ${query}` },
    ], 0.7, 400),
  ]);

  const judgeContent = await groq([
    { role: "system", content: "You are a neutral financial judge. Respond ONLY with valid JSON, no other text." },
    { role: "user", content: `BULL:\n${bullArg}\n\nBEAR:\n${bearArg}\n\nPLAYBOOKS:\n${playbookContext}\n\nJudge these arguments for ${asset}. Respond with ONLY this JSON:\n{"asset":"${asset}","bias":"bullish_continuation|bearish_reversal|neutral","confidence":0.00,"verdict":"EXECUTE|WAIT|NO_TRADE","key_levels":[],"prior_analysis_validation":"confirmed|updated|contradiction_resolved","tribunal_summary":"1-2 sentence summary","full_reasoning":"detailed reasoning"}` },
  ], 0.2, 800);

  let parsed: any;
  try {
    const clean = judgeContent.includes("```") ? judgeContent.split("```")[judgeContent.includes("```json") ? 1 : 1].replace(/^json\n?/, "").trim() : judgeContent.trim();
    parsed = JSON.parse(clean);
  } catch {
    parsed = { asset, bias: "neutral", confidence: 0.5, verdict: "NO_TRADE", key_levels: [], prior_analysis_validation: "updated", tribunal_summary: "Parse error — check raw output", full_reasoning: judgeContent };
  }

  if (parsed.confidence < 0.85) parsed.verdict = "NO_TRADE";

  const id = `analysis_${user.id}_${Date.now()}`;
  await kv.set(id, { ...parsed, bull_argument: bullArg, bear_argument: bearArg, user_id: user.id, timestamp: new Date().toISOString(), query });

  return c.json({ success: true, tribunal: { bull: bullArg, bear: bearArg, judge: parsed }, timestamp: new Date().toISOString() });
});

// Analyses: list
app.get("/warroom-tribunal/analyses", async (c) => {
  const user = await getUser(c.req.header("Authorization"));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const analyses = await kv.getByPrefix(`analysis_${user.id}_`) as any[];
  analyses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return c.json({ analyses });
});

Deno.serve(app.fetch);
