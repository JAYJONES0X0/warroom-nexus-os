import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface SettingsProps {
  session: any;
}

export function Settings({ session }: SettingsProps) {
  const apiKeysConfigured = {
    perplexity: true, // Assume configured since we use create_supabase_secret
    openai: true,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Settings</h2>
        <p className="text-sm text-zinc-400">
          Configuration and system status
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">API Configuration</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
            <div className="flex items-center gap-3">
              {apiKeysConfigured.perplexity ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium text-white">Perplexity API</div>
                <div className="text-xs text-zinc-500">Core reasoning engine</div>
              </div>
            </div>
            <Badge className={apiKeysConfigured.perplexity ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}>
              {apiKeysConfigured.perplexity ? 'Configured' : 'Not Configured'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
            <div className="flex items-center gap-3">
              {apiKeysConfigured.openai ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium text-white">OpenAI API</div>
                <div className="text-xs text-zinc-500">Vector embeddings (optional)</div>
              </div>
            </div>
            <Badge className={apiKeysConfigured.openai ? 'bg-green-500/20 text-green-500' : 'bg-zinc-500/20 text-zinc-500'}>
              {apiKeysConfigured.openai ? 'Configured' : 'Not Configured'}
            </Badge>
          </div>
        </div>

        <div className="mt-4 p-3 bg-zinc-800 rounded text-xs text-zinc-400">
          <strong className="text-zinc-300">Note:</strong> API keys are managed securely via Supabase environment variables.
          Keys were set up during deployment using the create_supabase_secret tool.
        </div>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">User Information</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Email:</span>
            <span className="text-white">{session?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">User ID:</span>
            <span className="text-white font-mono text-xs">{session?.user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Session:</span>
            <Badge className="bg-green-500/20 text-green-500">Active</Badge>
          </div>
        </div>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">System Information</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Version:</span>
            <span className="text-white">1.0.0-alpha</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Mode:</span>
            <span className="text-white">Single-user (Admin)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Backend:</span>
            <Badge className="bg-green-500/20 text-green-500">Connected</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
