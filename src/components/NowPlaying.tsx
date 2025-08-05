
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, Trash2 } from 'lucide-react';
import { type QueueItem } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoZoom from './PhotoZoom';

interface NowPlayingProps {
  song: QueueItem | null;
  onEnded: () => void;
  onSkip: () => void;
  onClearQueue: () => void;
  onSongStartedPlaying: (songId: string) => void;
  isHost: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function NowPlaying({ song, onEnded, onSkip, onClearQueue, onSongStartedPlaying, isHost }: NowPlayingProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Initialize YouTube API and create player when DOM is ready
  useEffect(() => {
    console.log('🎵 NowPlaying useEffect triggered - hasUserInteracted:', hasUserInteracted, 'song:', song?.title);

    const initializePlayer = () => {
      console.log('🚀 initializePlayer called - containerRef.current:', !!containerRef.current, 'playerRef.current:', !!playerRef.current);
      
      // Wait for container to be available
      if (!containerRef.current) {
        console.log('📭 Container not available yet, will retry when container ref changes');
        return;
      }

      // If player exists, destroy it before creating a new one
      if (playerRef.current) {
        console.log('🗑️ Destroying existing player');
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.log('⚠️ Error destroying player:', e);
        }
        playerRef.current = null;
      }

      console.log('📦 Container available, creating YT.Player with videoId:', song?.video_id, 'autoplay:', hasUserInteracted);
      console.log('🔧 YouTube API available:', !!window.YT, 'YT.Player:', !!window.YT?.Player);
      
      if (!window.YT?.Player) {
        console.error('❌ YouTube Player constructor not available');
        return;
      }

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId: song?.video_id || '',
          events: {
            onReady: (event: any) => {
              console.log('✅ YouTube player ready, setting isPlayerReady to true');
              setIsPlayerReady(true);
              setPlayerError(null);
              // When the player is ready, if there's a song, it should start playing
              // if autoplay is enabled.
              if (song && hasUserInteracted) {
                console.log('▶️ Auto-playing video after ready');
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              console.log('🎬 Player state changed:', event.data);
              if (event.data === window.YT.PlayerState.ENDED) {
                console.log('🏁 Video ended, calling onEnded callback');
                onEnded();
              }
              if (event.data === window.YT.PlayerState.PLAYING && song && onSongStartedPlaying) {
                onSongStartedPlaying(song.id);
              }
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            },
            onError: (event: any) => {
              console.error('💥 YouTube player error:', event.data);
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
        console.log('🎉 Player created successfully:', !!playerRef.current);
      } catch (error) {
        console.error('💀 Error creating YouTube player:', error);
      }
    };

    if (!window.YT) {
      console.log('📥 YouTube API not loaded, loading script...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        console.log('🎯 YouTube API ready callback triggered');
        // Use setTimeout to ensure DOM is ready
        setTimeout(initializePlayer, 100);
      };
    } else {
      console.log('✨ YouTube API already loaded, initializing player');
      // Use setTimeout to ensure DOM is ready
      setTimeout(initializePlayer, 100);
    }

    // Cleanup function to destroy the player instance
    return () => {
      console.log('🧹 Cleanup function called');
      if (playerRef.current) {
        // Check if destroy is a function before calling it
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          console.log('🗑️ Destroying player in cleanup');
          playerRef.current.destroy();
        }
        playerRef.current = null;
      }
    };
  }, [song?.video_id, hasUserInteracted]); // Re-initialize when song or user interaction changes

  useEffect(() => {
    const loadVideo = () => {
      if (playerRef.current && song && isPlayerReady && typeof playerRef.current.loadVideoById === 'function') {
        console.log('Loading video:', song.video_id, '| Autoplay:', hasUserInteracted);
        setPlayerError(null);

        const videoId = song.video_id;
        // Always use loadVideoById. The `autoplay` playerVar will handle whether it plays.
        playerRef.current.loadVideoById(videoId, 0);

      } else if (playerRef.current && !song && isPlayerReady && typeof playerRef.current.stopVideo === 'function') {
        console.log('No song, stopping video');
        playerRef.current.stopVideo();
        setIsPlaying(false);
      } else {
        console.log('Cannot load video - playerRef:', !!playerRef.current, 'song:', !!song, 'isPlayerReady:', isPlayerReady, 'loadVideoById function exists:', playerRef.current && typeof playerRef.current.loadVideoById === 'function');
      }
    };

    loadVideo();
  }, [song?.video_id, isPlayerReady, hasUserInteracted]);


  

  const handlePlayButtonClick = () => {
    console.log('🖱️ Play button clicked - hasUserInteracted:', hasUserInteracted, 'isPlayerReady:', isPlayerReady, 'playerRef.current:', !!playerRef.current);
    
    // This is the first and most important user interaction.
    if (!hasUserInteracted) {
      console.log('👆 First user interaction - setting hasUserInteracted to true');
      setHasUserInteracted(true);
    }

    if (!playerRef.current) {
      console.log('⏳ Player not ready yet, interaction will trigger re-initialization');
      return;
    }

    if (!isPlayerReady) {
      console.log('⏳ Player not ready yet, waiting...');
      return;
    }

    const state = playerRef.current.getPlayerState();
    console.log('🎮 Current player state:', state);
    
    if (state === window.YT.PlayerState.PLAYING) {
      console.log('⏸️ Pausing video');
      playerRef.current.pauseVideo();
    } else {
      console.log('▶️ Playing video');
      playerRef.current.playVideo();
    }
  };

  if (!song) {
    return (
      <Card className="h-full min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No songs in queue</h2>
          <p className="text-muted-foreground text-center">Add a song to get the party started!</p>
        </CardContent>
      </Card>
    );
  }

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
