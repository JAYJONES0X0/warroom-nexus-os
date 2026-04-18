import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TABLE = "warroom_kv";

export const set = async (key: string, value: unknown): Promise<void> => {
  const { error } = await client().from(TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
};

export const get = async (key: string): Promise<unknown> => {
  const { data, error } = await client().from(TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

export const del = async (key: string): Promise<void> => {
  const { error } = await client().from(TABLE).delete().eq("key", key);
  if (error) throw new Error(error.message);
};

export const getByPrefix = async (prefix: string): Promise<unknown[]> => {
  const { data, error } = await client().from(TABLE).select("key, value").like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return data?.map((d) => d.value) ?? [];
};
