import React, { useState } from 'react';
import { Music2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MoodSelectorProps {
  onMoodChange: (mood: string) => void;
  currentMood?: string;
}

const PRESET_OPTIONS = [
  { label: 'Upbeat & Energetic', value: 'upbeat energetic dance party' },
  { label: 'Chill & Relaxed', value: 'chill relaxed ambient lounge' },
  { label: 'Nostalgic Hits', value: 'nostalgic throwback classic hits' },
  { label: 'Hip Hop & Rap', value: 'hip hop rap urban' },
  { label: 'Rock & Alternative', value: 'rock alternative indie' },
  { label: 'Pop & Top 40', value: 'pop top 40 mainstream hits' },
  { label: 'Electronic & EDM', value: 'electronic edm house techno' },
  { label: 'Indie & Alternative', value: 'indie alternative underground' },
  { label: 'Like Taylor Swift', value: 'similar to Taylor Swift pop country' },
  { label: 'Like The Weeknd', value: 'similar to The Weeknd R&B electronic' },
];

export default function MoodSelector({ onMoodChange, currentMood = '' }: MoodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMood, setCustomMood] = useState(currentMood);

  const handlePresetClick = (moodValue: string) => {
    setCustomMood(moodValue);
    onMoodChange(moodValue);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    onMoodChange(customMood);
    setIsOpen(false);
  };

  const handleClearMood = () => {
    setCustomMood('');
    onMoodChange('');
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={currentMood ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-2"
      >
        <Music2 className="w-4 h-4" />
        <span className="hidden sm:inline">
          {currentMood ? 'Style Set' : 'Music Style'}
        </span>
        <span className="sm:hidden">Style</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music2 className="w-5 h-5" />
              Set Music Style
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set a mood, genre, artist, or any musical preference to influence AI suggestions
            </p>

            {/* Preset Options */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Options
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handlePresetClick(option.value)}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-2"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <Label htmlFor="custom-mood" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Custom Style
              </Label>
              <div className="space-y-2">
                <Input
                  id="custom-mood"
                  placeholder="e.g., like Drake, 90s rock, romantic dinner, workout energy, jazz fusion..."
                  value={customMood}
                  onChange={(e) => setCustomMood(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomSubmit();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCustomSubmit}
                    size="sm"
                    className="flex-1"
                    disabled={!customMood.trim()}
                  >
                    Apply Style
                  </Button>
                  {currentMood && (
                    <Button
                      onClick={handleClearMood}
                      size="sm"
                      variant="outline"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {currentMood && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                  Current Style
                </Label>
                <p className="text-sm">{currentMood}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}