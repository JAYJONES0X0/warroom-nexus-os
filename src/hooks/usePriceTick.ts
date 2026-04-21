import { useState, useEffect, useRef } from 'react';

export interface TickData {
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  connected: boolean;
}

// Maps our internal keys to Twelve Data WebSocket symbols
const WS_SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  GBPJPY: 'GBP/JPY', AUDUSD: 'AUD/USD', NZDUSD: 'NZD/USD',
  XAUUSD: 'XAU/USD', BTCUSD: 'BTC/USD', NAS100: 'NDX',
};

// Real-time WebSocket price tick for a single symbol (Markets screen).
// Connects to Twelve Data WS using key from /api/ws-key.
// Falls back gracefully if no key — just returns null tick.
export function usePriceTick(symbol: string): TickData | null {
  const [tick, setTick] = useState<TickData | null>(null);
  const wsRef  = useRef<WebSocket | null>(null);
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    const tdSymbol = WS_SYMBOL_MAP[symbol];
    if (!tdSymbol) return;

    let cancelled = false;

    const connect = (apiKey: string) => {
      if (cancelled) return;
      const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: tdSymbol } }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'price' && msg.price) {
            setTick({
              price:     msg.price,
              bid:       msg.bid ?? msg.price,
              ask:       msg.ask ?? msg.price,
              timestamp: msg.timestamp ?? Date.now() / 1000,
              connected: true,
            });
          }
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = () => {
        if (!cancelled) setTimeout(() => connect(apiKey), 3000);
      };

      ws.onerror = () => ws.close();
    };

    const init = async () => {
      if (!keyRef.current) {
        try {
          const res = await fetch('/api/ws-key');
          const data = await res.json();
          if (data.key) keyRef.current = data.key;
        } catch { /* no key */ }
      }
      if (keyRef.current) connect(keyRef.current);
    };

    init();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      setTick(null);
    };
  }, [symbol]);

  return tick;
}
