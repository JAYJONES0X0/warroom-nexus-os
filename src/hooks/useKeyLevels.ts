import { useState, useEffect } from "react";

export interface KeyLevels {
  pdh: number; pdl: number;   // previous day high / low
  pwh: number; pwl: number;   // prior week high / low
  pmh: number; pml: number;   // prior month high / low
  asOf: number;
}

// Real swing levels per asset from /api/levels (Yahoo daily candles). Levels only
// change once a day, so a slow 30-min refresh is plenty.
export function useKeyLevels(): { levels: Record<string, KeyLevels>; loading: boolean } {
  const [levels, setLevels] = useState<Record<string, KeyLevels>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let slow: ReturnType<typeof setInterval> | null = null;
    const load = () =>
      fetch("/api/levels")
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const lv = d.levels ?? {};
          setLevels(lv);
          setLoading(false);
          // Once we actually have data (cold start may return empty/time out),
          // drop the fast retry and settle into a slow 30-min refresh.
          if (Object.keys(lv).length && !slow) slow = setInterval(load, 30 * 60_000);
        })
        .catch(() => { if (alive) setLoading(false); });
    load();
    // Retry every 8s until the first successful, non-empty load survives cold starts.
    const fast = setInterval(() => { if (!slow) load(); }, 8_000);
    return () => { alive = false; clearInterval(fast); if (slow) clearInterval(slow); };
  }, []);

  return { levels, loading };
}
