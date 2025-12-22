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
  onClose?: () => void;
  partyCode: string;
  initialValue?: string;
  isMandatory?: boolean;
}

export default function NameInputModal({ 
  isOpen, 
  onSubmit, 
  onClose,
  partyCode, 
  initialValue = '',
  isMandatory = true
}: NameInputModalProps) {
  const [name, setName] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isMandatory && onClose) onClose(); }}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader className="text-center space-y-3 pb-4">
          <div className="flex items-center justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {isMandatory ? `Welcome to Party ${partyCode}!` : 'Change Your Name'}
          </DialogTitle>
          <DialogDescription>
            {isMandatory 
              ? "Enter your name so others can see who's adding great music to the queue" 
              : "Update your name for other party members to see"}
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
            {!isMandatory && (
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1 h-12 font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
              disabled={!name.trim() || name === initialValue}
            >
              {isMandatory ? 'Join Party' : 'Update Name'}
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