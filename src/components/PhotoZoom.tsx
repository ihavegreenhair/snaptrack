import { useState, useEffect } from 'react';
import { X, ZoomIn, Play, Clock, ChevronUp, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatTimeAgo } from '../lib/time';
import { type QueueItem } from '../lib/supabase';

interface PhotoZoomProps {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
  song?: QueueItem;
  isCurrentSong?: boolean;
  isHistory?: boolean;
  queue?: QueueItem[]; // Array of all queue items for navigation
  currentIndex?: number; // Current item index in the queue
  currentSongId?: string; // ID of currently playing song
}

export default function PhotoZoom({ 
  src, 
  alt, 
  className, 
  children, 
  song, 
  isCurrentSong, 
  isHistory, 
  queue = [], 
  currentIndex = 0,
  currentSongId 
}: PhotoZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || queue.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(queue.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, queue.length]);

  return (
    <>
      {/* Clickable photo/trigger */}
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setIsOpen(true)}
      >
        {children || (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Zoom overlay indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-75 group-hover:scale-100" />
        </div>
      </div>

      {/* Image-focused modal with navigation */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setActiveIndex(currentIndex); // Reset to original index when opening
      }}>
        <DialogContent className="max-w-5xl w-full h-[90vh] p-0 border-0 bg-black/95 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 z-20 bg-black/70 hover:bg-black/90 rounded-full p-3 transition-colors shadow-lg"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {queue.length > 0 ? (
              /* Navigable queue view */
              (() => {
                const currentSong = queue[activeIndex];
                const isCurrentlyPlaying = currentSong?.id === currentSongId;
                const currentSongIndex = queue.findIndex(s => s.id === currentSongId);
                const isNextUp = activeIndex === currentSongIndex + 1 && currentSongIndex >= 0;
                
                return (
                  <div className="flex items-center justify-center w-full h-full">
                    {/* Previous button */}
                    {queue.length > 1 && (
                      <Button
                        onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                        disabled={activeIndex === 0}
                        variant="ghost"
                        size="icon"
                        className="absolute left-6 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full w-12 h-12 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </Button>
                    )}

                    {/* Main content */}
                    <div className="flex items-center justify-center gap-8 max-w-4xl w-full px-20">
                      {/* Large image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={currentSong?.photo_url}
                          alt="Song submitter's photo"
                          className="w-80 h-80 object-cover rounded-3xl shadow-2xl border-4 border-white/20"
                        />
                        
                        {/* Status badges */}
                        {isCurrentlyPlaying && (
                          <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                            <Play className="w-4 h-4 inline mr-2" />
                            Now Playing
                          </div>
                        )}
                        {isNextUp && (
                          <div className="absolute -top-3 -right-3 bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
                            <Star className="w-4 h-4 inline mr-2" />
                            Next Up
                          </div>
                        )}
                        
                        {/* Position indicator */}
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white/90 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                          #{activeIndex + 1} of {queue.length}
                        </div>
                      </div>

                      {/* Song info sidebar */}
                      <div className="flex-1 text-white space-y-6 max-w-md">
                        <div>
                          <h2 className="text-3xl font-bold mb-2 text-white">{currentSong?.title}</h2>
                          <p className="text-white/70 text-lg">Submitted by a party-goer</p>
                        </div>
                        
                        {/* Quick stats */}
                        <div className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-green-600 rounded-full p-2">
                              <ChevronUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-white">{currentSong?.votes}</div>
                              <div className="text-sm text-white/70">Votes</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-600 rounded-full p-2">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm text-white/70">
                                {isHistory 
                                  ? `Played ${formatTimeAgo(currentSong?.played_at ?? '')}`
                                  : `Added ${formatTimeAgo(currentSong?.submitted_at ?? '')}`
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Navigation hints */}
                        {queue.length > 1 && (
                          <div className="text-white/50 text-sm">
                            Use ← → arrows or buttons to browse queue
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Next button */}
                    {queue.length > 1 && (
                      <Button
                        onClick={() => setActiveIndex(Math.min(queue.length - 1, activeIndex + 1))}
                        disabled={activeIndex === queue.length - 1}
                        variant="ghost"
                        size="icon"
                        className="absolute right-6 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full w-12 h-12 disabled:opacity-30"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </Button>
                    )}
                  </div>
                );
              })()
            ) : song ? (
              /* Single item fallback */
              <div className="flex items-center justify-center gap-8 max-w-4xl w-full px-20">
                <div className="relative">
                  <img
                    src={src}
                    alt={alt}
                    className="w-80 h-80 object-cover rounded-3xl shadow-2xl border-4 border-white/20"
                  />
                </div>
                <div className="flex-1 text-white space-y-6 max-w-md">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-white">{song.title}</h2>
                    <p className="text-white/70 text-lg">Submitted by a party-goer</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Basic image fallback */
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}