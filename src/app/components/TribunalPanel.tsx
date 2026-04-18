import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

interface TribunalPanelProps {
  tribunalResult: any;
  loading: boolean;
}

export function TribunalPanel({ tribunalResult, loading }: TribunalPanelProps) {
  if (loading) {
    return (
      <div className="h-full p-6 space-y-4">
        <Skeleton className="h-48 w-full bg-zinc-800" />
        <Skeleton className="h-48 w-full bg-zinc-800" />
        <Skeleton className="h-48 w-full bg-zinc-800" />
      </div>
    );
  }

  if (!tribunalResult) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚖️</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Analysis Yet</h3>
          <p className="text-zinc-400 text-sm">
            Select an asset, enter your query, and click "RUN ANALYSIS" to execute the adversarial tribunal.
          </p>
        </div>
      </div>
    );
  }

  const { bull, bear, judge } = tribunalResult;

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

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'bullish_continuation':
        return 'text-green-500';
      case 'bearish_reversal':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Bull Advocate */}
        <Card className="bg-zinc-900 border-green-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="font-semibold text-green-500">BULL ADVOCATE</h3>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{bull}</p>
        </Card>

        {/* Bear Advocate */}
        <Card className="bg-zinc-900 border-red-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="font-semibold text-red-500">BEAR ADVOCATE</h3>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{bear}</p>
        </Card>

        {/* Judge Verdict */}
        <Card className="bg-zinc-900 border-yellow-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <h3 className="font-semibold text-yellow-500">NEUTRAL JUDGE</h3>
          </div>

          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">ASSET</div>
                <div className="font-semibold text-white">{judge.asset}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">BIAS</div>
                <div className={`font-semibold ${getBiasColor(judge.bias)}`}>
                  {judge.bias.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">CONFIDENCE</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        judge.confidence >= 0.85
                          ? 'bg-green-500'
                          : judge.confidence >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${judge.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {(judge.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">VERDICT</div>
                <Badge className={getVerdictColor(judge.verdict)}>
                  {judge.verdict}
                </Badge>
              </div>
            </div>

            {/* Key Levels */}
            {judge.key_levels && judge.key_levels.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">KEY LEVELS</div>
                <div className="flex flex-wrap gap-2">
                  {judge.key_levels.map((level: number, idx: number) => (
                    <Badge key={idx} variant="outline" className="border-zinc-700 text-zinc-300">
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tribunal Summary */}
            <div>
              <div className="text-xs text-zinc-500 mb-2">SUMMARY</div>
              <p className="text-zinc-300 text-sm">{judge.tribunal_summary}</p>
            </div>

            {/* Full Reasoning */}
            <div>
              <div className="text-xs text-zinc-500 mb-2">FULL REASONING</div>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                {judge.full_reasoning}
              </p>
            </div>

            {/* Prior Analysis Validation */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <div className="text-xs text-zinc-500">PRIOR ANALYSIS:</div>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                {judge.prior_analysis_validation.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
