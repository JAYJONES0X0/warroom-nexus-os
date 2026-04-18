import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { getServerUrl } from '../../utils/supabase';
import { Upload, Trash2, FileText } from 'lucide-react';

interface PlaybookUploadProps {
  session: any;
  playbooks: any[];
  onUploadComplete: () => void;
}

export function PlaybookUpload({ session, playbooks, onUploadComplete }: PlaybookUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const content = await file.text();

        const response = await fetch(`${getServerUrl()}/playbooks/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            content,
            asset_class: 'GENERAL',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          toast.error(`Failed to upload ${file.name}: ${data.error}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }

      onUploadComplete();
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`${getServerUrl()}/playbooks/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success(`Deleted ${filename}`);
        onUploadComplete();
      } else {
        toast.error('Failed to delete playbook');
      }
    } catch (err) {
      toast.error('Error deleting playbook');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Playbook Management</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Upload your trading playbooks (XAUUSD_PLAYBOOK.txt, PROBABILISTIC_WEIGHTING_SYSTEM.txt, etc.)
          to provide context for tribunal analysis.
        </p>

        <label htmlFor="file-upload">
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 cursor-pointer">
            <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 mb-1">
              {uploading ? 'Uploading...' : 'Click to upload playbook files'}
            </p>
            <p className="text-xs text-zinc-600">.txt, .md files accepted</p>
          </div>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".txt,.md"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">
          UPLOADED PLAYBOOKS ({playbooks.length})
        </h3>
        
        {playbooks.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800 p-8 text-center">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No playbooks uploaded yet</p>
          </Card>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {playbooks.map((playbook, idx) => (
                <Card key={idx} className="bg-zinc-900 border-zinc-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-white">{playbook.filename}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(playbook.uploaded_at).toLocaleDateString()} • {playbook.asset_class}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDelete(playbook.filename)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
