import { useState, useEffect } from 'react';

interface Market {
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

function fmt$$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function PriceBar({ yes }: { yes: number }) {
  const pct = Math.round(yes * 100);
  const color = pct >= 65 ? 'bg-green-500' : pct <= 35 ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold w-10 text-right ${pct >= 65 ? 'text-green-400' : pct <= 35 ? 'text-red-400' : 'text-yellow-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

export const PolymarketPanel = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch('/api/polymarket')
        .then(r => r.json())
        .then(d => {
          if (!alive) return;
          if (d.error) throw new Error(d.error);
          setMarkets(d.markets || []);
          setFetchedAt(d.fetchedAt);
          setLoading(false);
        })
        .catch(e => {
          if (!alive) return;
          setError(e.message);
          setLoading(false);
        });
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const topEdge = markets.filter(m => m.score >= 60).length;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Markets</div>
          <div className="text-xl font-black text-primary">{markets.length}</div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Edge Found</div>
          <div className={`text-xl font-black ${topEdge > 0 ? 'text-green-400' : 'text-white/40'}`}>{topEdge}</div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Feed</div>
          <div className="text-xs font-bold text-white/50 pt-1">
            {loading ? '⏳ loading' : error ? '⚠️ error' : fetchedAt ? `↻ ${new Date(fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '—'}
          </div>
        </div>
      </div>

      {/* Market list */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-primary/10 flex justify-between items-center">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Top Markets by Volume</span>
          <span className="text-xs text-white/30">Polymarket · Live</span>
        </div>

        {loading && (
          <div className="p-6 text-center text-white/30 text-sm font-mono">fetching markets...</div>
        )}
        {error && (
          <div className="p-4 text-center text-red-400/70 text-xs font-mono">⚠️ {error}</div>
        )}

        <div className="divide-y divide-white/5 max-h-[320px] overflow-y-auto">
          {markets.map(m => (
            <div
              key={m.id}
              className="px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer"
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/80 font-semibold leading-tight line-clamp-2">
                    {m.question}
                  </div>
                  <PriceBar yes={m.yesPrice} />
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    m.score >= 80 ? 'bg-green-500/20 text-green-400' :
                    m.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {m.score}
                  </div>
                  <div className="text-xs text-white/30 mt-1 font-mono">{fmt$$(m.volume24h)}/24h</div>
                </div>
              </div>

              {expanded === m.id && (
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-white/40 uppercase tracking-wider">Edge Signal</span>
                    <div className="font-bold mt-0.5">{m.edge}</div>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-wider">Liquidity</span>
                    <div className="font-bold text-white/70 mt-0.5">{fmt$$(m.liquidity)}</div>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-wider">YES</span>
                    <div className="font-mono font-bold text-green-400 mt-0.5">{Math.round(m.yesPrice * 100)}¢</div>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase tracking-wider">Days Left</span>
                    <div className="font-bold text-white/70 mt-0.5">{m.daysLeft ?? '—'}</div>
                  </div>
                  <div className="col-span-2 mt-1 text-white/30">
                    Score based on volume depth, liquidity, and edge zone pricing.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/20 text-center">Polymarket Gamma API · Updates every 60s</p>
    </div>
  );
};
