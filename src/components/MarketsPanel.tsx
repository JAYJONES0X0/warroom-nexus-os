import { usePrices } from '@/hooks/usePrices';

const PAIRS = [
  { key: 'EURUSD', label: 'EUR/USD', dec: 4 },
  { key: 'GBPUSD', label: 'GBP/USD', dec: 4 },
  { key: 'XAUUSD', label: 'XAU/USD', dec: 2 },
  { key: 'USDJPY', label: 'USD/JPY', dec: 3 },
  { key: 'NAS100', label: 'NAS100', dec: 0 },
  { key: 'SPX',    label: 'SPX500', dec: 0 },
  { key: 'BTCUSD', label: 'BTC/USD', dec: 0 },
  { key: 'DXY',    label: 'DXY',    dec: 3 },
  { key: 'GBPJPY', label: 'GBP/JPY', dec: 3 },
  { key: 'AUDUSD', label: 'AUD/USD', dec: 4 },
  { key: 'NZDUSD', label: 'NZD/USD', dec: 4 },
];

function getSession() {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  if (h >= 7 && h < 10) return { label: 'London Killzone', color: 'text-yellow-400', dot: 'bg-yellow-400' };
  if (h >= 12 && h < 15) return { label: 'NY Killzone', color: 'text-blue-400', dot: 'bg-blue-400' };
  if (h >= 0 && h < 7) return { label: 'Asia Range', color: 'text-purple-400', dot: 'bg-purple-400' };
  return { label: 'Dead Zone', color: 'text-white/40', dot: 'bg-white/30' };
}

export const MarketsPanel = () => {
  const { prices, fetchedAt, loading, error } = usePrices();
  const session = getSession();

  const riskOn = (prices['NAS100']?.changePct ?? 0) > 0 && (prices['DXY']?.changePct ?? 0) < 0;
  const riskOff = (prices['NAS100']?.changePct ?? 0) < -0.3 && (prices['DXY']?.changePct ?? 0) > 0.2;
  const biasLabel = riskOn ? '🟢 RISK-ON' : riskOff ? '🔴 RISK-OFF' : '🟡 MIXED';
  const biasColor = riskOn ? 'text-green-400' : riskOff ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="space-y-4">
      {/* Session + Bias row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="text-xs text-white/50 uppercase tracking-wider mb-1 font-bold">Session</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${session.dot} animate-pulse`} />
            <span className={`font-black text-sm ${session.color}`}>{session.label}</span>
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="text-xs text-white/50 uppercase tracking-wider mb-1 font-bold">Bias</div>
          <div className={`font-black text-sm ${biasColor}`}>{biasLabel}</div>
        </div>
      </div>

      {/* Live price grid */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b border-primary/10">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Live Prices</span>
          <span className="text-xs text-white/30 font-mono">
            {loading ? 'fetching...' : error ? '⚠️ feed error' : fetchedAt ? `↻ ${new Date(fetchedAt).toLocaleTimeString('en-GB')}` : ''}
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {PAIRS.map(({ key, label, dec }) => {
            const p = prices[key];
            const up = (p?.changePct ?? 0) > 0;
            const flat = Math.abs(p?.changePct ?? 0) < 0.02;
            const changeColor = flat ? 'text-white/50' : up ? 'text-green-400' : 'text-red-400';
            const arrow = flat ? '→' : up ? '↑' : '↓';
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${flat ? 'text-white/30' : up ? 'text-green-400/60' : 'text-red-400/60'}`}>{arrow}</span>
                  <span className="text-sm font-bold text-primary/90">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-white/80">
                    {p ? p.price.toFixed(dec) : '—'}
                  </span>
                  <span className={`text-xs font-bold w-16 text-right ${changeColor}`}>
                    {p ? `${up ? '+' : ''}${p.changePct.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-white/20 text-center">Updates every 30s · Yahoo Finance</p>
    </div>
  );
};
