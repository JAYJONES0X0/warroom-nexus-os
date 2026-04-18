import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface MemoryTimelineProps {
  analyses: any[];
}

export function MemoryTimeline({ analyses }: MemoryTimelineProps) {
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'EXECUTE':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'WAIT':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'NO_TRADE':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30';
    }
  };

  if (analyses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-sm text-zinc-500">No analyses yet</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {analyses.map((analysis, idx) => (
          <Card key={idx} className="bg-zinc-900 border-zinc-800 p-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-sm text-white">{analysis.asset}</div>
              <Badge className={`text-xs ${getVerdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    analysis.confidence >= 0.85
                      ? 'bg-green-500'
                      : analysis.confidence >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400">
                {(analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="text-xs text-zinc-500">
              {new Date(analysis.timestamp).toLocaleString()}
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
