import { useState, useEffect, useMemo, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Star, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type QueueItem } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { formatTimeAgo } from '../lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PhotoZoom from './PhotoZoom';
import { useToast } from './ui/toast';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface QueueListProps {
  queue: QueueItem[];
  currentSongId?: string;
  title: string;
  isHistory?: boolean;
  isHost: boolean;
  height?: number;
  isHostView?: boolean;
  userProfiles?: {[fingerprint: string]: string};
  onPin?: (id: string, pinned: boolean) => void;
  onBlacklist?: (song: QueueItem) => void;
  loading?: boolean;
  compact?: boolean;
}

interface UserVotes {
  [queueId: string]: number;
}


export default function QueueList({ 
  queue, 
  currentSongId, 
  title, 
  isHistory, 
  isHost, 
  height, 
  isHostView, 
  userProfiles = {},
  onPin,
  onBlacklist,
  loading,
  compact
}: QueueListProps) {
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [fingerprint, setFingerprint] = useState<string>('');
  const [voting, setVoting] = useState<string | null>(null);
  const [animatingVotes, setAnimatingVotes] = useState<{[key: string]: number}>({});
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const toast = useToast();

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

    try {
      if (existingVote === voteValue) {
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
      } else {
        await supabase
          .from('votes')
          .upsert({ queue_id: queueId, fingerprint, vote: voteValue }, { onConflict: 'queue_id,fingerprint' });

        setUserVotes(prev => ({
          ...prev,
          [queueId]: voteValue,
        }));
      }
      
      setAnimatingVotes(prev => ({ ...prev, [queueId]: Date.now() }));
      setTimeout(() => {
        setAnimatingVotes(prev => {
          const updated = { ...prev };
          delete updated[queueId];
          return updated;
        });
      }, 600);
    } catch (error) {
      console.error('Error handling vote:', error);
      toast.error('Failed to cast vote. Please try again.');
    } finally {
      setVoting(null);
    }
  };


  return (
    <Card className={`flex flex-col ${!height ? 'h-auto' : ''}`} style={height ? { height } : {}}>
      <CardHeader className="pb-4 xl:pb-6 flex flex-row items-center justify-between">
        <CardTitle className="xl:text-xl 2xl:text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${height ? 'flex-grow overflow-y-auto min-h-0' : 'max-h-[1200px] overflow-y-auto xl:min-h-[500px] 2xl:min-h-[600px]'} xl:px-6 2xl:px-8`}>
        {loading && queue.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg p-4 flex flex-col justify-center min-h-[200px]">
            <p className="text-lg font-medium">No songs in {isHistory ? 'history' : 'queue'}</p>
            {!isHistory && <p className="text-muted-foreground text-sm mt-2">Be the first to add a song!</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Featured Next Up Section */}
            {sortedQueue.length > 0 && !isHistory && (
              <Card className="relative overflow-hidden border-accent/50 ring-2 ring-accent/20 shadow-lg bg-gradient-to-br from-accent/10 to-transparent">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary" />
                <CardContent className={`${isHostView ? 'p-4' : 'p-4 sm:p-6 xl:p-6 2xl:p-8'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 xl:w-6 xl:h-6 text-accent" />
                      <h3 className="text-lg xl:text-xl 2xl:text-2xl font-bold text-foreground">Next Up</h3>
                      {sortedQueue[0].is_pinned && (
                        <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full uppercase tracking-wider">Pinned</span>
                      )}
                    </div>
                    {isHost && (
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={`h-8 w-8 rounded-full ${sortedQueue[0].is_pinned ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={() => onPin?.(sortedQueue[0].id, !sortedQueue[0].is_pinned)}
                          title={sortedQueue[0].is_pinned ? "Unpin from top" : "Pin to top"}
                        >
                          <Star className={`h-4 w-4 ${sortedQueue[0].is_pinned ? 'fill-current' : ''}`} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Veto this song? It will be removed and banned from this party.')) {
                              onBlacklist?.(sortedQueue[0]);
                            }
                          }}
                          title="Veto & Blacklist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {(() => {
                    const nextSong = sortedQueue[0];
                    const userVote = userVotes[nextSong.id] || 0;
                    
                    return isHostView ? (
                      // Compact host version with larger image
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm xl:text-base">
                            1
                          </div>
                          <PhotoZoom 
                            src={nextSong.photo_url} 
                            alt="Submitter photo"
                            song={nextSong}
                            isCurrentSong={false}
                            queue={queue}
                            currentIndex={0}
                            currentSongId={currentSongId}
                            className="transition-all duration-200 hover:scale-105 flex-shrink-0"
                            submitterName={userProfiles[nextSong.submitted_by] || 'Anonymous'}
                          >
                            <img
                              src={nextSong.photo_url}
                              alt="Submitter photo"
                              className="w-16 h-16 xl:w-20 xl:h-20 object-cover border-2 border-accent/50 rounded-full shadow-lg"
                            />
                          </PhotoZoom>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base xl:text-lg text-foreground line-clamp-2 mb-1">
                            {nextSong.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            By {userProfiles[nextSong.submitted_by] || 'Anonymous'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-accent" />
                            <span className="text-sm xl:text-base font-bold text-accent">
                              {nextSong.votes}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              onClick={() => handleVote(nextSong.id, 1)}
                              disabled={voting === nextSong.id}
                              size="icon"
                              variant={userVote === 1 ? "default" : "outline"}
                              className={`rounded-full w-7 h-7 xl:w-8 xl:h-8 ${
                                userVote === 1 ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3 xl:w-3.5 xl:h-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleVote(nextSong.id, -1)}
                              disabled={voting === nextSong.id}
                              size="icon"
                              variant={userVote === -1 ? "destructive" : "outline"}
                              className={`rounded-full w-7 h-7 xl:w-8 xl:h-8 ${
                                userVote === -1 ? 'shadow-sm' : 'hover:bg-red-50'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3 xl:w-3.5 xl:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Full guest version with large showcase image
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg xl:text-xl">
                            1
                          </div>
                          <PhotoZoom 
                            src={nextSong.photo_url} 
                            alt="Submitter photo"
                            song={nextSong}
                            isCurrentSong={false}
                            queue={queue}
                            currentIndex={0}
                            currentSongId={currentSongId}
                            className="transition-all duration-200 hover:scale-105 shadow-xl"
                            submitterName={userProfiles[nextSong.submitted_by] || 'Anonymous'}
                          >
                            <img
                              src={nextSong.photo_url}
                              alt="Submitter photo"
                              className="w-24 h-24 sm:w-28 sm:h-28 xl:w-32 xl:h-32 2xl:w-36 2xl:h-36 object-cover border-4 border-accent/60 rounded-xl shadow-xl"
                            />
                          </PhotoZoom>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl text-foreground line-clamp-2 leading-tight mb-2">
                            {nextSong.title}
                          </h4>
                          <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground mb-4">
                            Submitted by <span className="font-medium text-accent">{userProfiles[nextSong.submitted_by] || 'Anonymous'}</span>
                          </p>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <ThumbsUp className="w-5 h-5 xl:w-6 xl:h-6 text-accent" />
                                <span className="text-lg xl:text-xl font-bold text-accent">
                                  {nextSong.votes} votes
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {formatTimeAgo(nextSong.submitted_at)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleVote(nextSong.id, 1)}
                                disabled={voting === nextSong.id}
                                size="icon"
                                variant={userVote === 1 ? "default" : "outline"}
                                className={`rounded-full w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 transition-all duration-300 hover:scale-110 active:scale-95 ${
                                  userVote === 1 ? 'bg-green-600 hover:bg-green-700 shadow-lg' : 'hover:bg-green-50'
                                }`}
                              >
                                <ThumbsUp className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />
                              </Button>
                              <Button
                                onClick={() => handleVote(nextSong.id, -1)}
                                disabled={voting === nextSong.id}
                                size="icon"
                                variant={userVote === -1 ? "destructive" : "outline"}
                                className={`rounded-full w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 transition-all duration-300 hover:scale-110 active:scale-95 ${
                                  userVote === -1 ? 'shadow-lg' : 'hover:bg-red-50'
                                }`}
                              >
                                <ThumbsDown className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
            
            {/* Rest of Queue */}
            {sortedQueue.length > 1 && (
              <div>
                {!isHistory && (
                  <h4 className="text-sm xl:text-base font-semibold text-muted-foreground mb-3 px-1">
                    Coming Up ({sortedQueue.length - 1} songs)
                  </h4>
                )}
                <div className={`${isHostView ? 'space-y-2 xl:space-y-2' : 'space-y-2 xl:space-y-4 2xl:space-y-6'}`}>
                  <AnimatePresence mode="popLayout">
                    {sortedQueue.slice(isHistory ? 0 : 1).map((song, index) => {
                      const actualIndex = isHistory ? index : index + 1;
                      const userVote = userVotes[song.id] || 0;
                      const isNextUp = false; // Never true for remaining items

                      return (
                        <motion.div
                          key={song.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 30, 
                            mass: 1 
                          }}
                        >
                          <Card
                            ref={(el) => { itemRefs.current[song.id] = el; }}
                            className={`relative overflow-hidden transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-accent/50 ${song.is_pinned ? 'border-primary/50' : ''}`}
                          >
                      {isNextUp && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
                      )}
                      <CardContent className={`${
                        isHostView ? 'p-2 xl:p-2' : (compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-3 xl:p-4 2xl:p-6')
                      }`}>
                        {isHostView ? (
                          // Ultra-compact host layout - minimal horizontal design
                          <div className={cn("flex items-center gap-2", compact && "gap-1.5")}>
                            {/* Position number - ultra small */}
                            {!isHistory && !compact && (
                              <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 bg-muted text-muted-foreground">
                                {actualIndex + 1}
                              </div>
                            )}
                            
                            {/* Compact indicator for Dashboard */}
                            {compact && actualIndex === 1 && (
                              <div className="w-1 h-6 bg-primary rounded-full mr-0.5" />
                            )}
                            
                            {/* Photo - ultra small */}
                            <PhotoZoom 
                              src={song.photo_url} 
                              alt="Submitter photo"
                              song={song}
                              isCurrentSong={false}
                              queue={queue}
                              currentIndex={actualIndex}
                              currentSongId={currentSongId}
                              className={cn("transition-all duration-200 hover:scale-105 flex-shrink-0", compact ? "w-7 h-7" : "w-8 h-8 xl:w-10 xl:h-10")}
                              submitterName={userProfiles[song.submitted_by] || 'Anonymous'}
                            >
                              <img
                                src={song.photo_url}
                                alt="Submitter photo"
                                className={cn(
                                  "object-cover border",
                                  isNextUp ? 'border-accent/50' : 'border-border',
                                  isHistory ? 'rounded-md' : 'rounded-full',
                                  compact ? "w-7 h-7" : "w-8 h-8 xl:w-10 xl:h-10"
                                )}
                              />
                            </PhotoZoom>
                            
                            {/* Song title - ultra condensed */}
                            <div className="flex-1 min-w-0 px-0.5">
                              <div className="flex items-center gap-1">
                                <h3 className={cn(
                                  "font-medium truncate leading-tight",
                                  isNextUp ? 'text-accent' : 'text-foreground',
                                  compact ? "text-[10px]" : "text-xs xl:text-sm"
                                )}>
                                  {song.title}
                                </h3>
                                {song.is_pinned && <Star className={cn("text-primary fill-current flex-shrink-0", compact ? "h-2 w-2" : "h-3 w-3")} />}
                              </div>
                            </div>
                            
                            {/* Ultra-compact voting controls */}
                            {!isHistory && !compact && (
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Button
                                  onClick={() => handleVote(song.id, 1)}
                                  disabled={voting === song.id}
                                  size="icon"
                                  variant={userVote === 1 ? "default" : "outline"}
                                  className={`rounded-full w-5 h-5 xl:w-6 xl:h-6 p-0 ${
                                    userVote === 1 ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
                                  }`}
                                >
                                  <ThumbsUp className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                                </Button>
                                <Button
                                  onClick={() => handleVote(song.id, -1)}
                                  disabled={voting === song.id}
                                  size="icon"
                                  variant={userVote === -1 ? "destructive" : "outline"}
                                  className={`rounded-full w-5 h-5 xl:w-6 xl:h-6 p-0 ${
                                    userVote === -1 ? 'shadow-sm' : 'hover:bg-red-50'
                                  }`}
                                >
                                  <ThumbsDown className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                                </Button>
                                {isHost && (
                                  <div className="flex gap-0.5 ml-1">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className={`h-5 w-5 xl:h-6 xl:w-6 rounded-full ${song.is_pinned ? 'text-primary' : 'text-muted-foreground'}`}
                                      onClick={() => onPin?.(song.id, !song.is_pinned)}
                                    >
                                      <Star className={`h-2.5 w-2.5 xl:h-3 xl:w-3 ${song.is_pinned ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (confirm('Veto this song?')) {
                                          onBlacklist?.(song);
                                        }
                                      }}
                                      size="icon"
                                      variant="destructive"
                                      className="rounded-full w-5 h-5 xl:w-6 xl:h-6 p-0"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Compact mobile layout - horizontal design on mobile
                          <div className="flex items-center gap-2 sm:gap-3 xl:gap-4">
                            {/* Left section - Position number and photo */}
                            <div className="flex items-center gap-2 sm:gap-3 xl:gap-4 flex-shrink-0">
                              {!isHistory && (
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 xl:w-10 xl:h-10 rounded-full flex items-center justify-center font-bold text-xs xl:text-sm ${
                                  isNextUp
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {actualIndex + 1}
                                </div>
                              )}
                              <PhotoZoom 
                                src={song.photo_url} 
                                alt="Submitter photo"
                                song={song}
                                isCurrentSong={false}
                                queue={queue}
                                currentIndex={actualIndex}
                                currentSongId={currentSongId}
                                className={`transition-all duration-200 hover:scale-105 ${
                                  isHistory ? 'w-10 h-10 sm:w-12 sm:h-12 xl:w-16 xl:h-16 rounded-lg' : 'w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-full'
                                }`}
                                submitterName={userProfiles[song.submitted_by] || 'Anonymous'}
                              >
                                <img
                                  src={song.photo_url}
                                  alt="Submitter photo"
                                  className={`w-full h-full object-cover border ${
                                    isNextUp 
                                      ? 'border-accent/50' 
                                      : 'border-border'
                                  } ${isHistory ? 'rounded-lg' : 'rounded-full'}`}
                                />
                              </PhotoZoom>
                            </div>
                            
                            {/* Middle section - Song info */}
                            <div className="flex-1 min-w-0 px-1">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <h3 className="font-medium text-sm sm:text-base xl:text-lg line-clamp-2 leading-tight mb-0.5">{song.title}</h3>
                                  {song.is_pinned && <Star className="h-3 w-3 text-primary fill-current flex-shrink-0" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    <span className={`transition-all duration-300 ${animatingVotes[song.id] ? 'scale-110 text-green-600' : ''}`}>
                                      {song.votes}
                                    </span>
                                  </span>
                                  <span className="truncate">
                                    {isHistory ? `Played ${formatTimeAgo(song.played_at ?? '')}` : formatTimeAgo(song.submitted_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right section - Compact voting controls */}
                            {!isHistory && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  onClick={() => handleVote(song.id, 1)}
                                  disabled={voting === song.id}
                                  size="icon"
                                  variant={userVote === 1 ? "default" : "outline"}
                                  className={`rounded-full w-7 h-7 sm:w-8 sm:h-8 xl:w-10 xl:h-10 ${
                                    userVote === 1 ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 xl:w-5 xl:h-5" />
                                </Button>
                                <Button
                                  onClick={() => handleVote(song.id, -1)}
                                  disabled={voting === song.id}
                                  size="icon"
                                  variant={userVote === -1 ? "destructive" : "outline"}
                                  className={`rounded-full w-7 h-7 sm:w-8 sm:h-8 xl:w-10 xl:h-10 ${
                                    userVote === -1 ? 'shadow-sm' : 'hover:bg-red-50'
                                  }`}
                                >
                                  <ThumbsDown className="w-3 h-3 sm:w-4 sm:h-4 xl:w-5 xl:h-5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}