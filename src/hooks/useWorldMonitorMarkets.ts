import { useState, useEffect, useRef } from 'react';

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface CryptoQuote {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
}

export interface CommodityQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
}

export interface WorldMonitorState {
  marketQuotes: MarketQuote[];
  cryptoQuotes: CryptoQuote[];
  commodityQuotes: CommodityQuote[];
  fearGreed: FearGreedData | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
}

// Key macro indicators relevant for prediction markets
const MACRO_SYMBOLS = ['SPX', 'NDX', 'VIX', 'DXY', 'GC', 'CL'];
const CRYPTO_SYMBOLS = ['bitcoin', 'ethereum'];
const COMMODITY_SYMBOLS = ['GC', 'CL', 'NG'];

export function useWorldMonitorMarkets(): WorldMonitorState {
  const [state, setState] = useState<WorldMonitorState>({
    marketQuotes: [],
    cryptoQuotes: [],
    commodityQuotes: [],
    fearGreed: null,
    fetchedAt: null,
    loading: true,
    error: null,
  });

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = async () => {
    try {
      // Fetch market data from our API endpoints
      const [marketRes, cryptoRes, fearGreedRes] = await Promise.allSettled([
        fetch('/api/market-quotes'),
        fetch('/api/crypto-quotes'),
        fetch('/api/fear-greed'),
      ]);

      let marketQuotes: MarketQuote[] = [];
      let cryptoQuotes: CryptoQuote[] = [];
      let fearGreed: FearGreedData | null = null;

      if (marketRes.status === 'fulfilled' && marketRes.value.ok) {
        const data = await marketRes.value.json();
        marketQuotes = data.quotes?.filter((q: MarketQuote) => 
          MACRO_SYMBOLS.includes(q.symbol)
        ) || [];
      }

      if (cryptoRes.status === 'fulfilled' && cryptoRes.value.ok) {
        const data = await cryptoRes.value.json();
        cryptoQuotes = data.quotes?.filter((q: CryptoQuote) => 
          CRYPTO_SYMBOLS.includes(q.id)
        ) || [];
      }

      if (fearGreedRes.status === 'fulfilled' && fearGreedRes.value.ok) {
        const data = await fearGreedRes.value.json();
        fearGreed = data;
      }

      setState({
        marketQuotes,
        cryptoQuotes,
        commodityQuotes: [],
        fearGreed,
        fetchedAt: Date.now(),
        loading: false,
        error: null,
      });
    } catch (e) {
      setState(p => ({ ...p, loading: false, error: String(e) }));
    }
  };

  useEffect(() => {
    fetch_();
    timer.current = setInterval(fetch_, 60_000); // Update every minute
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  return state;
}

// Hook to get macro context relevant for a specific market question
export function useMacroContext(question: string) {
  const { marketQuotes, cryptoQuotes, fearGreed, loading } = useWorldMonitorMarkets();

  return useMemo(() => {
    if (loading) return null;

    const lowerQ = question.toLowerCase();
    const context: string[] = [];

    // Check for crypto-related markets
    if (lowerQ.includes('bitcoin') || lowerQ.includes('btc') || lowerQ.includes('crypto')) {
      const btc = cryptoQuotes.find(c => c.id === 'bitcoin');
      if (btc) {
        context.push(`BTC: $${btc.price.toLocaleString()} (${btc.changePercent24h >= 0 ? '+' : ''}${btc.changePercent24h.toFixed(1)}%)`);
      }
    }

    // Check for equity markets
    if (lowerQ.includes('s&p') || lowerQ.includes('spx') || lowerQ.includes('stock market')) {
      const spx = marketQuotes.find(m => m.symbol === 'SPX');
      if (spx) {
        context.push(`SPX: ${spx.price.toFixed(0)} (${spx.changePercent >= 0 ? '+' : ''}${spx.changePercent.toFixed(1)}%)`);
      }
    }

    // Check for gold/commodities
    if (lowerQ.includes('gold') || lowerQ.includes('xau')) {
      const gold = marketQuotes.find(m => m.symbol === 'GC');
      if (gold) {
        context.push(`Gold: $${gold.price.toFixed(0)} (${gold.changePercent >= 0 ? '+' : ''}${gold.changePercent.toFixed(1)}%)`);
      }
    }

    // Check for oil/energy
    if (lowerQ.includes('oil') || lowerQ.includes('crude')) {
      const oil = marketQuotes.find(m => m.symbol === 'CL');
      if (oil) {
        context.push(`Oil: $${oil.price.toFixed(2)} (${oil.changePercent >= 0 ? '+' : ''}${oil.changePercent.toFixed(1)}%)`);
      }
    }

    // Add fear/greed context for general market sentiment
    if (fearGreed && (lowerQ.includes('market') || lowerQ.includes('economy'))) {
      context.push(`Fear/Greed: ${fearGreed.value} (${fearGreed.classification})`);
    }

    return context;
  }, [marketQuotes, cryptoQuotes, fearGreed, loading, question]);
}

import { useMemo } from 'react';
