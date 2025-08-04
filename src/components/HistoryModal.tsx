
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { type QueueItem } from '../lib/supabase';
import { formatTimeAgo } from '../lib/time';

interface HistoryModalProps {
  history: QueueItem[];
}

export default function HistoryModal({ history }: HistoryModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <History className="w-5 h-5" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px] lg:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Played Songs History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center">No songs played yet.</p>
          ) : (
            history.map((song) => (
              <div key={song.id} className="flex items-center gap-4 p-3 border rounded-lg bg-card">
                <img src={song.photo_url} alt="Submitter" className="w-16 h-16 rounded-full object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{song.title}</h3>
                  <p className="text-sm text-muted-foreground">Played {formatTimeAgo(song.played_at ?? '')}</p>
                  <p className="text-sm text-muted-foreground">Requested {formatTimeAgo(song.submitted_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}