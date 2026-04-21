import { useState, useEffect, useRef } from 'react';

export interface PriceData {
  price: number;
  change: number;
  changePct: number;
  symbol: string;
}

export interface PricesState {
  prices: Record<string, PriceData>;
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  source: 'twelvedata' | 'yahoo' | 'error' | null;
}

const REFRESH_MS = 5_000; // 5s — 6× faster than before

export function usePrices(): PricesState {
  const [state, setState] = useState<PricesState>({
    prices: {}, fetchedAt: null, loading: true, error: null, source: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({
        prices:    data.prices ?? {},
        fetchedAt: data.fetchedAt,
        loading:   false,
        error:     null,
        source:    data.source ?? null,
      });
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: String(e) }));
    }
  };

  useEffect(() => {
    fetchPrices();
    timerRef.current = setInterval(fetchPrices, REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return state;
}
