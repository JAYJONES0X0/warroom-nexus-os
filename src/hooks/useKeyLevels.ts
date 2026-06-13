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
    const load = () =>
      fetch("/api/levels")
        .then((r) => r.json())
        .then((d) => { if (alive) { setLevels(d.levels ?? {}); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { levels, loading };
}
