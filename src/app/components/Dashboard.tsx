import { useState, useEffect } from 'react';
import { supabase, getServerUrl } from '../../utils/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { PlaybookUpload } from './PlaybookUpload';
import { TribunalPanel } from './TribunalPanel';
import { MemoryTimeline } from './MemoryTimeline';
import { AuditLog } from './AuditLog';
import { Settings } from './Settings';

interface DashboardProps {
  session: any;
}

export function Dashboard({ session }: DashboardProps) {
  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');
  const [query, setQuery] = useState('');
  const [tribunalResult, setTribunalResult] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  const assets = ['XAUUSD', 'GBPUSD', 'BTCUSD', 'EURUSD', 'SPX500', 'NASDAQ'];

  useEffect(() => {
    loadAnalyses();
    loadPlaybooks();
  }, []);

  const loadAnalyses = async () => {
    try {
      const response = await fetch(`${getServerUrl()}/analyses`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
      }
    } catch (err) {
      console.error('Failed to load analyses:', err);
    }
  };

  const loadPlaybooks = async () => {
    try {
      const response = await fetch(`${getServerUrl()}/playbooks`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaybooks(data.playbooks || []);
      }
    } catch (err) {
      console.error('Failed to load playbooks:', err);
    }
  };

  const handleRunAnalysis = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (playbooks.length === 0) {
      toast.warning('No playbooks uploaded. Analysis will run without playbook context.');
    }

    setLoading(true);
    setTribunalResult(null);

    try {
      const response = await fetch(`${getServerUrl()}/tribunal/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          asset: selectedAsset,
          query,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(`Tribunal execution failed: ${data.error}`);
        return;
      }

      setTribunalResult(data.tribunal);
      toast.success('Tribunal analysis complete');
      
      // Reload analyses to show new entry
      loadAnalyses();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="size-full bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-lg font-bold text-red-500">WN</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">WARROOM NEXUS</h1>
            <p className="text-xs text-zinc-500">Autonomous Financial Reasoning Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{session?.user?.email}</span>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-zinc-800 flex flex-col">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">ASSET SELECTION</h2>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {assets.map((asset) => (
                  <SelectItem key={asset} value={asset} className="text-white">
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 mb-3">QUERY INPUT</h2>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe market conditions, timeframe, specific questions..."
                className="bg-zinc-900 border-zinc-700 text-white min-h-32 resize-none"
              />
            </div>

            <Button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              {loading ? 'EXECUTING TRIBUNAL...' : 'RUN ANALYSIS'}
            </Button>

            {playbooks.length > 0 && (
              <div className="text-xs text-zinc-500 text-center">
                {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''} loaded
              </div>
            )}
          </div>
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="border-b border-zinc-800 rounded-none bg-black px-6">
              <TabsTrigger value="analysis" className="data-[state=active]:bg-zinc-900">
                Tribunal Analysis
              </TabsTrigger>
              <TabsTrigger value="playbooks" className="data-[state=active]:bg-zinc-900">
                Playbooks
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-900">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="flex-1 m-0">
              <TribunalPanel tribunalResult={tribunalResult} loading={loading} />
            </TabsContent>

            <TabsContent value="playbooks" className="flex-1 m-0 p-6">
              <PlaybookUpload
                session={session}
                playbooks={playbooks}
                onUploadComplete={loadPlaybooks}
              />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 m-0 p-6">
              <Settings session={session} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel */}
        <div className="w-96 border-l border-zinc-800 flex flex-col">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-400">MEMORY TIMELINE</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <MemoryTimeline analyses={analyses} />
          </div>
        </div>
      </div>

      {/* Bottom Panel - Audit Log */}
      <div className="h-48 border-t border-zinc-800">
        <AuditLog analyses={analyses} />
      </div>
    </div>
  );
}
