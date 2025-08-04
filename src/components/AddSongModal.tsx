import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import SubmitSong from './SubmitSong';
import { type SuggestedSong } from '../lib/gemini';

interface AddSongModalProps {
  onSongAdded?: () => void;
  suggestions: SuggestedSong[];
  suggestionsLoading: boolean;
  suggestionsType: 'instant' | 'personalized';
  onRefreshSuggestions: () => Promise<void>;
}

export default function AddSongModal({ onSongAdded, suggestions, suggestionsLoading, suggestionsType, onRefreshSuggestions }: AddSongModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSongAdded = () => {
    setIsOpen(false);
    onSongAdded?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Song to Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Add a Song to the Queue</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <SubmitSong 
            onSongAdded={handleSongAdded}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            suggestionsType={suggestionsType}
            onRefreshSuggestions={onRefreshSuggestions}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}