import React, { useState } from 'react';
import { Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        className={`flex items-center gap-2 transition-all duration-200 ${
          currentMood ? 'shadow-md hover:shadow-lg' : 'hover:shadow-md'
        }`}
      >
        <Music2 className="w-4 h-4" />
        <span className="hidden sm:inline font-medium">
          {currentMood ? 'Style Set' : 'Music Style'}
        </span>
        <span className="sm:hidden font-medium">Style</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader className="text-center space-y-2 pb-4">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <div className="p-2 rounded-full bg-primary/10">
                <Music2 className="w-5 h-5 text-primary" />
              </div>
              Set Music Style
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choose a mood, genre, artist, or any musical preference to influence AI suggestions
            </p>
          </DialogHeader>

          <div className="space-y-6">

            {/* Preset Options */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Popular Styles
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handlePresetClick(option.value)}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-3">
              <label htmlFor="custom-mood" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Custom Style
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    id="custom-mood"
                    type="text"
                    placeholder="e.g., like Drake, 90s rock, romantic dinner, workout energy, jazz fusion..."
                    value={customMood}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomMood(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        handleCustomSubmit();
                      }
                    }}
                    className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCustomSubmit}
                    size="sm"
                    className="flex-1 h-10 font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
                    disabled={!customMood.trim()}
                  >
                    Apply Style
                  </Button>
                  {currentMood && (
                    <Button
                      onClick={handleClearMood}
                      size="sm"
                      variant="outline"
                      className="px-6 h-10 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {currentMood && (
              <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Active Style
                </label>
                <p className="text-sm font-medium text-primary bg-background/60 px-3 py-2 rounded-md border">
                  {currentMood}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}