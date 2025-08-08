import { useState, forwardRef, useImperativeHandle } from 'react';
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
  partyId: string;
}

export default forwardRef<{ openModal: () => void }, AddSongModalProps>(function AddSongModal({ onSongAdded, suggestions, suggestionsLoading, suggestionsType, onRefreshSuggestions, partyId }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  
  useImperativeHandle(ref, () => ({
    openModal: () => setIsOpen(true)
  }));

  const handleSongAdded = () => {
    setIsOpen(false);
    onSongAdded?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto text-base px-4 py-3 sm:px-6">
          <Plus className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Add Song to Queue</span>
          <span className="sm:hidden">Add Song</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden w-[96vw] sm:w-auto mx-2 sm:mx-auto">
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
            partyId={partyId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});