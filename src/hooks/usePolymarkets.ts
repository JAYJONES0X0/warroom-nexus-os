import { useState, useEffect, useRef } from 'react';

export interface PolyMarket {
  id: string;
  question: string;
  volume24h: number;
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  outcomeNames: string[];
  daysLeft: number | null;
  score: number;
  edge: string;
}

export interface PolyState {
  markets: PolyMarket[];
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
}

export function usePolymarkets(): PolyState {
  const [state, setState] = useState<PolyState>({ markets: [], fetchedAt: null, loading: true, error: null });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = async () => {
    try {
      const r = await fetch('/api/polymarket');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setState({ markets: d.markets ?? [], fetchedAt: d.fetchedAt, loading: false, error: null });
    } catch (e) {
      setState(p => ({ ...p, loading: false, error: String(e) }));
    }
  };

  useEffect(() => {
    fetch_();
    timer.current = setInterval(fetch_, 30_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return state;
}
