
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, Trash2, Plus, QrCode, Copy } from 'lucide-react';
import { type QueueItem, supabase } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoZoom from './PhotoZoom';
import QRCode from './QRCode';

interface NowPlayingProps {
  song: QueueItem | null;
  onEnded: () => void;
  onSkip: () => void;
  onClearQueue: () => void;
  onSongStartedPlaying: (songId: string) => void;
  isHost: boolean;
  partyCode?: string;
  onAddSong?: () => void;
  skipVotesRequired?: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function NowPlaying({ song, onEnded, onSkip, onClearQueue, onSongStartedPlaying, isHost, partyCode, onAddSong, skipVotesRequired = 3 }: NowPlayingProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  // Vote skip functionality
  const [fingerprint, setFingerprint] = useState<string>('');
  const [hasSkipVoted, setHasSkipVoted] = useState(false);
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [skipVoting, setSkipVoting] = useState(false);

  // Initialize fingerprint
  useEffect(() => {
    getUserFingerprint().then(setFingerprint);
  }, []);

  // Load skip votes when song changes
  useEffect(() => {
    if (!song || !fingerprint) {
      setHasSkipVoted(false);
      setSkipVoteCount(0);
      return;
    }

    const loadSkipVotes = async () => {
      // Get user's skip vote for this song
      const { data: userVote } = await supabase
        .from('skip_votes')
        .select('id')
        .eq('queue_id', song.id)
        .eq('fingerprint', fingerprint)
        .single();

      setHasSkipVoted(!!userVote);

      // Get total skip vote count for this song
      const { data: skipVotes } = await supabase
        .from('skip_votes')
        .select('id')
        .eq('queue_id', song.id);

      setSkipVoteCount(skipVotes?.length || 0);
    };

    loadSkipVotes();
  }, [song?.id, fingerprint]);

  // Handle skip vote functionality
  const handleSkipVote = async () => {
    if (!song || !fingerprint || skipVoting) return;

    setSkipVoting(true);
    
    try {
      if (hasSkipVoted) {
        // Remove skip vote
        await supabase
          .from('skip_votes')
          .delete()
          .eq('queue_id', song.id)
          .eq('fingerprint', fingerprint);

        setHasSkipVoted(false);
        setSkipVoteCount(prev => Math.max(0, prev - 1));
      } else {
        // Add skip vote
        const { error } = await supabase
          .from('skip_votes')
          .insert({
            queue_id: song.id,
            fingerprint: fingerprint,
            party_id: song.party_id
          });

        if (!error) {
          setHasSkipVoted(true);
          const newCount = skipVoteCount + 1;
          setSkipVoteCount(newCount);

          // Check if we've reached the threshold or if user is host
          if (newCount >= skipVotesRequired || isHost) {
            onSkip();
          }
        }
      }
    } catch (error) {
      console.error('Error handling skip vote:', error);
    } finally {
      setSkipVoting(false);
    }
  };

  // Initialize YouTube API and create player when DOM is ready - ONLY FOR HOSTS
  useEffect(() => {
    // Only initialize YouTube player for hosts
    if (!isHost) {
      return;
    }

    const initializePlayer = () => {
      // Wait for container to be available
      if (!containerRef.current) {
        return;
      }

      // If player exists, destroy it before creating a new one
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }

      if (!window.YT?.Player) {
        return;
      }

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId: song?.video_id || '',
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              setPlayerError(null);
              if (song && hasUserInteracted) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                onEnded();
              }
              if (event.data === window.YT.PlayerState.PLAYING && song && onSongStartedPlaying) {
                onSongStartedPlaying(song.id);
              }
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            },
            onError: (event: any) => {
              const errorMessages: { [key: number]: string } = {
                2: 'Invalid video ID - the video may have been removed or is private',
                5: 'HTML5 player error - try refreshing the page',
                100: 'Video not found - it may have been removed or is private',
                101: 'Video cannot be embedded - copyright restrictions',
                150: 'Video cannot be embedded - copyright restrictions'
              };
              setPlayerError(errorMessages[event.data] || 'Unknown playback error occurred');
              setIsPlaying(false);
            }
          },
          playerVars: {
            autoplay: hasUserInteracted ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin
          },
        });
      } catch (error) {
        console.error('Error creating YouTube player:', error);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        setTimeout(initializePlayer, 100);
      };
    } else {
      setTimeout(initializePlayer, 100);
    }

    // Cleanup function to destroy the player instance
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [song?.video_id, hasUserInteracted, isHost]); // Re-initialize when song, user interaction, or host status changes

  useEffect(() => {
    // Only load videos for hosts
    if (!isHost) {
      return;
    }

    const loadVideo = () => {
      if (playerRef.current && song && isPlayerReady && typeof playerRef.current.loadVideoById === 'function') {
        setPlayerError(null);
        const videoId = song.video_id;
        playerRef.current.loadVideoById(videoId, 0);
      } else if (playerRef.current && !song && isPlayerReady && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
        setIsPlaying(false);
      }
    };

    loadVideo();
  }, [song?.video_id, isPlayerReady, hasUserInteracted, isHost]);


  

  const handlePlayButtonClick = () => {
    // Only hosts can control playback
    if (!isHost) {
      return;
    }
    
    // First user interaction enables autoplay
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }

    if (!playerRef.current || !isPlayerReady) {
      return;
    }

    const state = playerRef.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  if (!song) {
    const partyUrl = process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`;
    
    return (
      <Card className="h-full min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center h-full p-4 sm:p-6">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Play className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">No songs in queue</h2>
          <p className="text-muted-foreground text-center mb-6">Add a song to get the party started!</p>
          
          {/* Action buttons for empty state */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            {onAddSong && (
              <Button
                onClick={onAddSong}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                Add First Song
              </Button>
            )}
            
            {partyCode && (
              <div className="relative group">
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-muted-foreground hover:text-primary rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <QrCode className="w-5 h-5" />
                  Invite Friends
                </Button>
                
                {/* QR Code tooltip on hover */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-4 min-w-64">
                    <div className="text-center space-y-3">
                      <div className="inline-block p-3 bg-white rounded-lg shadow-inner border border-gray-100">
                        <QRCode value={partyUrl} size={120} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Party Code</p>
                        <p className="text-lg font-bold tracking-wider text-foreground font-mono">{partyCode}</p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(partyUrl);
                            // Could add toast notification here
                          } catch {
                            // Fallback handled
                          }
                        }}
                        className="flex items-center justify-center gap-2 text-xs bg-muted hover:bg-muted/80 px-3 py-1 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed max-w-sm">
            {partyCode ? 'Share the QR code with friends so they can add songs and join the fun!' : 'Start the party by adding your first song!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show different content for host vs guests
  if (!isHost) {
    // GUEST VIEW: Just show the song info card
    return (
      <Card>
        <CardHeader>
          <CardTitle>Now Playing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-2">{song.title}</h3>
              <p className="text-sm text-muted-foreground">Host is controlling playback</p>
            </div>
          </div>
          
          {/* Vote to skip button for guests */}
          <div className="flex justify-center">
            <Button
              onClick={handleSkipVote}
              disabled={skipVoting}
              size="sm"
              variant={hasSkipVoted ? "destructive" : "outline"}
              className={`rounded-full px-4 py-2 text-sm transition-all duration-300 hover:scale-105 ${
                hasSkipVoted ? 'bg-orange-600 hover:bg-orange-700 shadow-lg text-white' : 'hover:bg-orange-50 hover:border-orange-300'
              }`}
              title={isHost ? 'Skip song (Host - immediate)' : `Vote to skip (${skipVoteCount}/${skipVotesRequired} votes needed)`}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              {isHost ? 'Skip Song' : `Vote Skip (${skipVoteCount}/${skipVotesRequired})`}
            </Button>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Only the host can control music playback
          </div>
        </CardContent>
      </Card>
    );
  }

  // HOST VIEW: Full YouTube player controls
  return (
    <Card>
      <CardHeader>
        <CardTitle>Now Playing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
          {playerError ? (
            <div className="w-full h-full flex items-center justify-center bg-red-50 border-2 border-red-200">
              <div className="text-center p-6">
                <div className="text-red-600 text-lg font-semibold mb-2">Playback Error</div>
                <div className="text-red-700 text-sm mb-4">{playerError}</div>
                <Button 
                  onClick={onSkip} 
                  variant="destructive" 
                  size="sm"
                  className="mr-2"
                >
                  Skip This Song
                </Button>
                <Button 
                  onClick={() => {
                    setPlayerError(null);
                    if (playerRef.current && song && typeof playerRef.current.loadVideoById === 'function') {
                      playerRef.current.loadVideoById(song.video_id);
                    }
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                className="w-full h-full"
              />
              {!hasUserInteracted && song && !isPlaying && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                  onClick={handlePlayButtonClick}
                >
                  <div className="text-center text-white p-4 bg-black/60 rounded-lg">
                    <div className="text-lg font-semibold mb-2">Click to Play</div>
                    <div className="text-sm opacity-80">This will enable autoplay for subsequent songs.</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <PhotoZoom 
            src={song.photo_url} 
            alt="Song submitter's photo"
            song={song}
            isCurrentSong={true}
            isHistory={false}
            className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-primary/30 hover:border-primary shadow-lg flex-shrink-0"
          >
            <img
              src={song.photo_url}
              alt="Song submitter's photo"
              className="w-full h-full rounded-full object-cover"
            />
          </PhotoZoom>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold mb-1 break-words">{song.title}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-2">Submitted by a party-goer</p>
            <p className="text-xs text-muted-foreground/80 hidden sm:block">Click photo to view details</p>
          </div>
        </div>

        {isHost && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 bg-muted/50 p-3 sm:p-4 rounded-xl">
            <Button
              onClick={handlePlayButtonClick}
              variant="ghost"
              size="icon"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 hover:bg-primary/30"
              disabled={!isPlayerReady || !!playerError}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-primary" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />}
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              size="icon"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary/20 hover:bg-secondary/30 transition-transform duration-200 ease-in-out hover:scale-105"
              disabled={!isPlayerReady || !!playerError}
              aria-label="Skip song"
            >
              <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 text-secondary-foreground" />
            </Button>
            <Button
              onClick={onClearQueue}
              variant="ghost"
              size="icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/20 hover:bg-destructive/30"
              title="Clear entire queue"
              aria-label="Clear queue"
            >
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-destructive-foreground" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
