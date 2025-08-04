
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { History } from 'lucide-react';
import { type QueueItem } from '../lib/supabase';
import { formatTimeAgo } from '../lib/time';

interface HistoryDropdownProps {
  history: QueueItem[];
}

export default function HistoryDropdown({ history }: HistoryDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <History className="w-5 h-5" />
        History
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Played Songs</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {history.length === 0 ? (
          <DropdownMenuItem className="text-muted-foreground italic">No songs played yet.</DropdownMenuItem>
        ) : (
          history.map((song) => (
            <DropdownMenuItem key={song.id} className="flex items-center gap-3 py-2">
              <img src={song.photo_url} alt="Submitter" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <p className="font-medium text-sm truncate">{song.title}</p>
                <p className="text-xs text-muted-foreground">Played {formatTimeAgo(song.played_at ?? '')}</p>
                <p className="text-xs text-muted-foreground">Requested {formatTimeAgo(song.submitted_at)}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}