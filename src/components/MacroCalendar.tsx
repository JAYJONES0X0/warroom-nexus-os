import { useState, useEffect } from 'react';

interface CalEvent {
  title: string;
  country: string;
  date: string;
  impact: 'High' | 'Medium';
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  minsAway: number;
}

// Currency → which pairs it affects
const PAIR_IMPACT: Record<string, string[]> = {
  USD: ['EURUSD','GBPUSD','USDJPY','XAUUSD','NAS100','DXY'],
  EUR: ['EURUSD','GBPJPY'],
  GBP: ['GBPUSD','GBPJPY'],
  JPY: ['USDJPY','GBPJPY'],
  AUD: ['AUDUSD'],
  NZD: ['NZDUSD'],
};

function formatCountdown(mins: number): string {
  if (mins < 0) return `${Math.abs(mins)}m ago`;
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `in ${h}h ${m > 0 ? `${m}m` : ''}`;
}

export const MacroCalendar = ({ activePair }: { activePair?: string }) => {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Highlight events that affect the active pair
  const isRelevant = (e: CalEvent) =>
    !activePair || (PAIR_IMPACT[e.country] ?? []).includes(activePair);

  // Flag: any high-impact event within 15min that affects active pair
  const hotEvent = events.find(e => e.impact === 'High' && Math.abs(e.minsAway) <= 15 && isRelevant(e));

  if (loading) {
    return (
      <div className="text-[10px] text-white/20 font-mono py-3 text-center">
        Loading macro calendar...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-[10px] text-white/20 font-mono py-3 text-center">
        No high-impact events in next 48h
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Signal freeze warning */}
      {hotEvent && (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-red-500/40 bg-red-500/[0.08] mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
          <div className="text-[10px] font-black text-red-400 uppercase tracking-wider">
            SIGNAL FREEZE — {hotEvent.title} {formatCountdown(hotEvent.minsAway)}
          </div>
        </div>
      )}

      {events.slice(0, 8).map((e, i) => {
        const relevant = isRelevant(e);
        const past = e.minsAway < 0;
        const imminent = e.minsAway >= 0 && e.minsAway <= 30;
        const impactColor = e.impact === 'High' ? '#ef4444' : '#f59e0b';

        return (
          <div key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
            style={{
              background:   relevant && imminent ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
              borderLeft:   `2px solid ${relevant ? impactColor : 'rgba(255,255,255,0.06)'}`,
              opacity:      past ? 0.4 : 1,
            }}>
            {/* Impact dot */}
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: past ? '#ffffff20' : impactColor }} />

            {/* Country flag-ish */}
            <span className="text-[9px] font-black text-white/40 w-8 shrink-0">{e.country}</span>

            {/* Title */}
            <span className="text-[10px] font-black flex-1 truncate"
              style={{ color: relevant ? '#ffffff' : 'rgba(255,255,255,0.35)' }}>
              {e.title}
            </span>

            {/* Actual / forecast */}
            {e.actual ? (
              <span className="text-[9px] font-black text-emerald-400 tabular-nums shrink-0">{e.actual}</span>
            ) : e.forecast ? (
              <span className="text-[9px] text-white/25 tabular-nums shrink-0">f:{e.forecast}</span>
            ) : null}

            {/* Countdown */}
            <span className="text-[9px] font-mono tabular-nums shrink-0"
              style={{ color: imminent && relevant ? '#ef4444' : 'rgba(255,255,255,0.2)' }}>
              {formatCountdown(e.minsAway)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
