import { useWorldMonitorMarkets } from '@/hooks/useWorldMonitorMarkets';
import { TrendingUp, TrendingDown, Activity, Bitcoin, DollarSign, BarChart3 } from 'lucide-react';

export const MacroContextPanel = () => {
  const { marketQuotes, cryptoQuotes, fearGreed, loading, error } = useWorldMonitorMarkets();

  const formatNumber = (n: number, dec: number = 0) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const getFearGreedColor = (val: number) => {
    if (val <= 25) return 'text-red-500';
    if (val <= 45) return 'text-orange-400';
    if (val <= 55) return 'text-yellow-400';
    if (val <= 75) return 'text-green-400';
    return 'text-emerald-500';
  };

  const getFearGreedBg = (val: number) => {
    if (val <= 25) return 'bg-red-500/10 border-red-500/20';
    if (val <= 45) return 'bg-orange-400/10 border-orange-400/20';
    if (val <= 55) return 'bg-yellow-400/10 border-yellow-400/20';
    if (val <= 75) return 'bg-green-400/10 border-green-400/20';
    return 'bg-emerald-500/10 border-emerald-500/20';
  };

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono mb-3">Macro Context</div>
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <div className="text-[9px] text-violet-400/60 uppercase tracking-wider font-mono mb-2">Macro Context</div>
        <div className="text-[10px] text-white/30 font-mono">Data unavailable</div>
      </div>
    );
  }

  const spx = marketQuotes.find(m => m.symbol === 'SPX');
  const ndx = marketQuotes.find(m => m.symbol === 'NDX');
  const vix = marketQuotes.find(m => m.symbol === 'VIX');
  const dxy = marketQuotes.find(m => m.symbol === 'DXY');
  const gold = marketQuotes.find(m => m.symbol === 'GC');
  const btc = cryptoQuotes.find(c => c.id === 'bitcoin');

  return (
    <div className="space-y-3">
      {/* Fear & Greed */}
      {fearGreed && (
        <div className={`rounded-xl p-3 border ${getFearGreedBg(fearGreed.value)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[9px] text-white/50 uppercase tracking-wider font-mono">Fear & Greed</span>
            </div>
            <span className={`text-lg font-black ${getFearGreedColor(fearGreed.value)}`}>
              {fearGreed.value}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-white/60 font-medium text-center">
            {fearGreed.classification}
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full"
              style={{ width: `${fearGreed.value}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* S&P 500 */}
        {spx && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 text-white/30" />
              <span className="text-[8px] text-white/40 uppercase font-mono">S&P 500</span>
            </div>
            <div className="text-sm font-bold text-white/80">{formatNumber(spx.price)}</div>
            <div className={`text-[9px] font-medium ${spx.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {spx.changePercent >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
              {formatPct(spx.changePercent)}
            </div>
          </div>
        )}

        {/* Bitcoin */}
        {btc && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Bitcoin className="w-3 h-3 text-white/30" />
              <span className="text-[8px] text-white/40 uppercase font-mono">Bitcoin</span>
            </div>
            <div className="text-sm font-bold text-white/80">${(btc.price / 1000).toFixed(1)}K</div>
            <div className={`text-[9px] font-medium ${btc.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {btc.changePercent24h >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
              {formatPct(btc.changePercent24h)}
            </div>
          </div>
        )}

        {/* VIX */}
        {vix && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3 text-white/30" />
              <span className="text-[8px] text-white/40 uppercase font-mono">VIX</span>
            </div>
            <div className="text-sm font-bold text-white/80">{vix.price.toFixed(2)}</div>
            <div className={`text-[9px] font-medium ${vix.changePercent >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatPct(vix.changePercent)}
            </div>
          </div>
        )}

        {/* Dollar Index */}
        {dxy && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-white/30" />
              <span className="text-[8px] text-white/40 uppercase font-mono">DXY</span>
            </div>
            <div className="text-sm font-bold text-white/80">{dxy.price.toFixed(2)}</div>
            <div className={`text-[9px] font-medium ${dxy.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPct(dxy.changePercent)}
            </div>
          </div>
        )}
      </div>

      {/* Gold */}
      {gold && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[8px] text-white/40 uppercase font-mono">Gold</div>
            <div className="text-sm font-bold text-white/80">${formatNumber(gold.price)}</div>
          </div>
          <div className={`text-[9px] font-medium px-2 py-0.5 rounded ${gold.changePercent >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {formatPct(gold.changePercent)}
          </div>
        </div>
      )}

      <p className="text-[8px] text-white/20 text-center font-mono">Live macro indicators · Updates every 60s</p>
    </div>
  );
};

export default MacroContextPanel;
