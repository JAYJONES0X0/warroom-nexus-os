import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface AuditLogProps {
  analyses: any[];
}

export function AuditLog({ analyses }: AuditLogProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400">AUDIT LOG</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1 font-mono text-xs">
          {analyses.length === 0 ? (
            <div className="text-zinc-600">No tribunal executions recorded</div>
          ) : (
            analyses.map((analysis, idx) => (
              <div key={idx} className="flex items-center gap-3 text-zinc-400 hover:text-zinc-300">
                <span className="text-zinc-600">
                  {new Date(analysis.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-white">{analysis.asset}</span>
                <Badge
                  className={`text-xs ${
                    analysis.verdict === 'EXECUTE'
                      ? 'bg-green-500/20 text-green-500'
                      : analysis.verdict === 'WAIT'
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}
                >
                  {analysis.verdict}
                </Badge>
                <span>
                  conf: {(analysis.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-zinc-600">|</span>
                <span className="truncate">{analysis.tribunal_summary}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
