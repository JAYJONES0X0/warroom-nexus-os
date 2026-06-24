import { useState, useEffect, useRef } from 'react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlesState {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

export function useCandles(symbol: string, interval: string): CandlesState {
  const [state, setState] = useState<CandlesState>({ candles: [], loading: true, error: null });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState(s => ({ ...s, loading: true, error: null }));

    const fetchCandles = async () => {
      try {
        const res = await fetch(`/api/candles?symbol=${symbol}&interval=${interval}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ac.signal.aborted) {
          setState({ candles: data.candles ?? [], loading: false, error: null });
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setState(s => ({ ...s, loading: false, error: String(e) }));
        }
      }
    };

    fetchCandles();

    const refreshMs = interval === '1m' ? 30_000 : interval === '5m' ? 90_000 : interval === '15m' ? 180_000 : interval === '1h' ? 300_000 : 600_000;
    timerRef.current = setInterval(fetchCandles, refreshMs);

    return () => {
      ac.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [symbol, interval]);

  return state;
}
