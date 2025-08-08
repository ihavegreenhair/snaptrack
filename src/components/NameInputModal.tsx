import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface NameInputModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  partyCode: string;
}

export default function NameInputModal({ isOpen, onSubmit, partyCode }: NameInputModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader className="text-center space-y-3 pb-4">
          <div className="flex items-center justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">Welcome to Party {partyCode}!</DialogTitle>
          <DialogDescription>
            Enter your name so others can see who's adding great music to the queue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="display-name" className="text-sm font-medium text-foreground">
              Your Name
            </label>
            <input
              id="display-name"
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
              maxLength={50}
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 h-12 font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
              disabled={!name.trim()}
            >
              Join Party
            </Button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Your name will be visible to other party members when you add songs
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}