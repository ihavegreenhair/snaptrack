
import { useState, useEffect, useMemo, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Star, Play, Trash2 } from 'lucide-react';
import { supabase, type QueueItem } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { formatTimeAgo } from '../lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoZoom from './PhotoZoom';

interface QueueListProps {
  queue: QueueItem[];
  currentSongId?: string;
  title: string;
  isHistory?: boolean;
  isHost: boolean;
}

interface UserVotes {
  [queueId: string]: number;
}

export default function QueueList({ queue, currentSongId, title, isHistory, isHost }: QueueListProps) {
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [fingerprint, setFingerprint] = useState<string>('');
  const [voting, setVoting] = useState<string | null>(null);
  const [animatingVotes, setAnimatingVotes] = useState<{[key: string]: number}>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const previousOrder = useRef<string[]>([]);
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Create a stable order for animations
  const sortedQueue = useMemo(() => {
    return queue.map((song, index) => ({ ...song, position: index }));
  }, [queue]);

  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await getUserFingerprint();
      setFingerprint(fp);
    };
    initializeFingerprint();
  }, []);

  useEffect(() => {
    if (fingerprint) {
      loadUserVotes();
    }
  }, [fingerprint, queue]);
  
  // FLIP animation for queue reordering
  useEffect(() => {
    const currentOrder = queue.map(song => song.id);
    
    // Skip animation on first render or if no previous order
    if (previousOrder.current.length === 0) {
      previousOrder.current = currentOrder;
      return;
    }
    
    // Skip if order hasn't changed
    if (JSON.stringify(previousOrder.current) === JSON.stringify(currentOrder)) {
      return;
    }
    
    // FLIP: First - record current positions
    const firstPositions: {[key: string]: DOMRect} = {};
    Object.keys(itemRefs.current).forEach(id => {
      const element = itemRefs.current[id];
      if (element) {
        firstPositions[id] = element.getBoundingClientRect();
      }
    });
    
    // Update the order (this causes a re-render)
    previousOrder.current = currentOrder;
    
    // FLIP: Last - get new positions after re-render
    requestAnimationFrame(() => {
      const lastPositions: {[key: string]: DOMRect} = {};
      Object.keys(itemRefs.current).forEach(id => {
        const element = itemRefs.current[id];
        if (element && firstPositions[id]) {
          lastPositions[id] = element.getBoundingClientRect();
          
          // All songs in the queue can be animated (queue only contains upcoming songs)
          
          // FLIP: Invert - calculate the difference
          const deltaY = firstPositions[id].top - lastPositions[id].top;
          
          if (Math.abs(deltaY) > 1) { // Only animate if there's a meaningful change
            // FLIP: Play - animate from old position to new with smooth transition
            element.style.transform = `translateY(${deltaY}px)`;
            element.style.transition = 'none';
            element.style.zIndex = '10'; // Elevate during animation
            
            requestAnimationFrame(() => {
              element.style.transform = 'translateY(0)';
              element.style.transition = 'transform 0.6s cubic-bezier(0.2, 0, 0.2, 1)';
              
              // Clean up after animation
              setTimeout(() => {
                element.style.transition = '';
                element.style.transform = '';
                element.style.zIndex = '';
              }, 600);
            });
          }
        }
      });
    });
  }, [queue]);

  const loadUserVotes = async () => {
    const queueIds = queue.map(item => item.id);
    if (queueIds.length === 0) return;

    const { data } = await supabase
      .from('votes')
      .select('queue_id, vote')
      .eq('fingerprint', fingerprint)
      .in('queue_id', queueIds);

    if (data) {
      const votes: UserVotes = {};
      data.forEach(vote => {
        votes[vote.queue_id] = vote.vote;
      });
      setUserVotes(votes);
    }
  };

  const handleVote = async (queueId: string, voteValue: number) => {
    if (!fingerprint || voting) return;

    setVoting(queueId);

    const existingVote = userVotes[queueId] || 0;
    console.log(`Voting: ${voteValue} for song ${queueId}, existing vote: ${existingVote}`);

    try {
      if (existingVote === voteValue) {
        // User is clicking the same button again, so remove the vote
        console.log('Removing vote (clicked same button)');
        await supabase
          .from('votes')
          .delete()
          .eq('queue_id', queueId)
          .eq('fingerprint', fingerprint);
        
        setUserVotes(prev => {
          const updated = { ...prev };
          delete updated[queueId];
          return updated;
        });
      } else if (existingVote === 0) {
        // No existing vote, add new vote
        console.log('Adding new vote:', voteValue);
        await supabase
          .from('votes')
          .insert({ queue_id: queueId, fingerprint, vote: voteValue });

        setUserVotes(prev => ({
          ...prev,
          [queueId]: voteValue,
        }));
      } else {
        // User has an existing opposite vote - change it to the new vote
        console.log('Changing vote from', existingVote, 'to', voteValue);
        await supabase
          .from('votes')
          .update({ vote: voteValue })
          .eq('queue_id', queueId)
          .eq('fingerprint', fingerprint);
        
        setUserVotes(prev => ({
          ...prev,
          [queueId]: voteValue,
        }));
      }
      
      // Trigger vote animation
      setAnimatingVotes(prev => ({
        ...prev,
        [queueId]: Date.now()
      }));
      
      // Clear animation after delay
      setTimeout(() => {
        setAnimatingVotes(prev => {
          const updated = { ...prev };
          delete updated[queueId];
          return updated;
        });
      }, 600);
    } catch (error) {
      console.error('Error handling vote:', error);
      alert('Failed to cast vote. Please try again.');
    } finally {
      setVoting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg p-4">
            <p className="text-lg font-medium">No songs in {isHistory ? 'history' : 'queue'}</p>
            {!isHistory && <p className="text-muted-foreground text-sm mt-2">Be the first to add a song and get the party started!</p>}
          </div>
        ) : (
        <div className="space-y-3">
          {sortedQueue.map((song, index) => {
            const userVote = userVotes[song.id] || 0;
            // Queue no longer contains current song, so first item (index 0) is "Next Up"
            const isNextUp = index === 0 && !isHistory;

            return (
              <Card
                key={song.id}
                ref={(el) => { itemRefs.current[song.id] = el; }}
                className={`relative overflow-hidden transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:scale-[1.01] ${
                  isNextUp
                    ? 'border-amber-500/50 ring-2 ring-amber-500/20 shadow-md bg-amber-50/50 dark:bg-amber-900/10'
                    : 'hover:shadow-md hover:bg-accent/50'
                }`}
              >
                {/* Status indicator bar */}
                {isNextUp && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                )}

                <CardContent className="p-3 sm:p-4 transition-all duration-300">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* Position indicator */}
                    {!isHistory && (
                      <div className={`flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                        isNextUp
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {`#${index + 1}`}
                      </div>
                    )}
                    
                    {/* Photo */}
                    <PhotoZoom 
                      src={song.photo_url} 
                      alt="Song submitter's photo"
                      song={song}
                      isCurrentSong={false}
                      isHistory={isHistory}
                      queue={queue}
                      currentIndex={index}
                      currentSongId={currentSongId}
                      className={`flex-shrink-0 transition-all duration-200 hover:scale-105 ${
                        isHistory ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl shadow-lg' : 'w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-md'
                      }`}
                    >
                      <img
                        src={song.photo_url}
                        alt="Song submitter's photo"
                        className={`w-full h-full object-cover border-2 ${
                          isNextUp 
                            ? 'border-amber-500/50' 
                            : 'border-border'
                        } ${isHistory ? 'rounded-xl' : 'rounded-full'}`}
                      />
                    </PhotoZoom>
                    
                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <h3 className="font-semibold text-base sm:text-lg break-words line-clamp-2">{song.title}</h3>
                        <div className="flex gap-1 sm:gap-2">
                          {isNextUp && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white flex-shrink-0">
                              <Star className="w-3 h-3" />
                              <span className="hidden sm:inline">Next Up</span>
                              <span className="sm:hidden">Next</span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span 
                            className={`transition-all duration-300 ${animatingVotes[song.id] ? 'vote-glow' : ''}`}
                            key={`votes-${song.votes}`}
                          >
                            {song.votes} votes
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {isHistory ? `Played ${formatTimeAgo(song.played_at ?? '')}` : `Added ${formatTimeAgo(song.submitted_at)}`}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground/70 mt-1 hidden sm:block">Click photo to view details</p>
                    </div>
                    
                    {/* Voting controls */}
                    {!isHistory && (
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        {isHost ? (
                          <Button
                            onClick={() => { /* Implement remove song logic */ }}
                            size="icon"
                            variant="destructive"
                            className="rounded-full w-10 h-10"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleVote(song.id, 1)}
                              disabled={voting === song.id}
                              size="icon"
                              variant={userVote === 1 ? "default" : "outline"}
                              className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 hover:scale-110 active:scale-95 transform ${
                                userVote === 1 ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25' : 'hover:bg-green-50 hover:border-green-300'
                              } ${voting === song.id ? 'animate-pulse' : ''} ${
                                animatingVotes[song.id] && userVote === 1 ? 'scale-125 shadow-lg shadow-green-600/50' : ''
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                            
                            <span className="text-lg sm:text-xl font-bold w-8 sm:w-12 text-center">
                              {song.votes}
                            </span>
                            
                            <Button
                              onClick={() => handleVote(song.id, -1)}
                              disabled={voting === song.id}
                              size="icon"
                              variant={userVote === -1 ? "destructive" : "outline"}
                              className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 hover:scale-110 active:scale-95 transform ${
                                userVote === -1 ? 'shadow-lg shadow-red-600/25' : 'hover:bg-red-50 hover:border-red-300'
                              } ${voting === song.id ? 'animate-pulse' : ''} ${
                                animatingVotes[song.id] && userVote === -1 ? 'scale-125 shadow-lg shadow-red-600/50' : ''
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
