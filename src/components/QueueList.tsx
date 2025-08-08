import { useState, useEffect, useMemo, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Clock, Star, Trash2, SkipForward } from 'lucide-react';
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
  height?: number;
  onSkipSong?: (songId: string) => void;
  skipVotesRequired?: number;
}

interface UserVotes {
  [queueId: string]: number;
}

interface UserSkipVotes {
  [queueId: string]: boolean;
}

export default function QueueList({ queue, currentSongId, title, isHistory, isHost, height, onSkipSong, skipVotesRequired = 3 }: QueueListProps) {
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [userSkipVotes, setUserSkipVotes] = useState<UserSkipVotes>({});
  const [fingerprint, setFingerprint] = useState<string>('');
  const [voting, setVoting] = useState<string | null>(null);
  const [animatingVotes, setAnimatingVotes] = useState<{[key: string]: number}>({});
  const [skipVoteCounts, setSkipVoteCounts] = useState<{[key: string]: number}>({});
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

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
      loadUserSkipVotes();
      loadSkipVoteCounts();
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

  const loadUserSkipVotes = async () => {
    const queueIds = queue.map(item => item.id);
    if (queueIds.length === 0) return;

    const { data } = await supabase
      .from('skip_votes')
      .select('queue_id')
      .eq('fingerprint', fingerprint)
      .in('queue_id', queueIds);

    if (data) {
      const skipVotes: UserSkipVotes = {};
      data.forEach(skipVote => {
        skipVotes[skipVote.queue_id] = true;
      });
      setUserSkipVotes(skipVotes);
    }
  };

  const loadSkipVoteCounts = async () => {
    const queueIds = queue.map(item => item.id);
    if (queueIds.length === 0) return;

    const { data } = await supabase
      .from('skip_votes')
      .select('queue_id')
      .in('queue_id', queueIds);

    if (data) {
      const counts: {[key: string]: number} = {};
      data.forEach(skipVote => {
        counts[skipVote.queue_id] = (counts[skipVote.queue_id] || 0) + 1;
      });
      setSkipVoteCounts(counts);
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
      alert('Failed to cast vote. Please try again.');
    } finally {
      setVoting(null);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!isHost) return;

    if (window.confirm('Are you sure you want to remove this song?')) {
      try {
        await supabase.from('queue_items').delete().eq('id', songId);
      } catch (error) {
        console.error('Error removing song:', error);
        alert('Failed to remove song. Please try again.');
      }
    }
  };

  const handleSkipVote = async (queueId: string) => {
    if (!fingerprint || voting) return;

    setVoting(queueId);
    
    try {
      const hasSkipVoted = userSkipVotes[queueId];
      
      if (hasSkipVoted) {
        // Remove skip vote
        await supabase
          .from('skip_votes')
          .delete()
          .eq('queue_id', queueId)
          .eq('fingerprint', fingerprint);
          
        setUserSkipVotes(prev => {
          const updated = { ...prev };
          delete updated[queueId];
          return updated;
        });
        
        // Update skip vote count
        setSkipVoteCounts(prev => ({
          ...prev,
          [queueId]: Math.max(0, (prev[queueId] || 0) - 1)
        }));
      } else {
        // Add skip vote
        await supabase
          .from('skip_votes')
          .insert({ queue_id: queueId, fingerprint });
          
        setUserSkipVotes(prev => ({
          ...prev,
          [queueId]: true
        }));
        
        // Update skip vote count and check if we should skip
        const newCount = (skipVoteCounts[queueId] || 0) + 1;
        setSkipVoteCounts(prev => ({
          ...prev,
          [queueId]: newCount
        }));
        
        // If we've reached the required votes or host voted, skip the song
        if ((newCount >= skipVotesRequired || isHost) && onSkipSong) {
          onSkipSong(queueId);
        }
      }
    } catch (error) {
      console.error('Error handling skip vote:', error);
      alert('Failed to cast skip vote. Please try again.');
    } finally {
      setVoting(null);
    }
  };

  return (
    <Card className={`flex flex-col ${!height ? 'h-auto' : ''}`} style={height ? { height } : {}}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${height ? 'flex-grow overflow-y-auto min-h-0' : 'min-h-[400px]'}`}>
        {queue.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg p-4 flex flex-col justify-center min-h-[200px]">
            <p className="text-lg font-medium">No songs in {isHistory ? 'history' : 'queue'}</p>
            {!isHistory && <p className="text-muted-foreground text-sm mt-2">Be the first to add a song!</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQueue.map((song, index) => {
              const userVote = userVotes[song.id] || 0;
              const userSkipVote = userSkipVotes[song.id] || false;
              const skipVoteCount = skipVoteCounts[song.id] || 0;
              const isNextUp = index === 0 && !isHistory;

              return (
                <Card
                  key={song.id}
                  ref={(el) => { itemRefs.current[song.id] = el; }}
                  className={`relative overflow-hidden transition-all duration-200 ease-out hover:scale-[1.01] ${
                    isNextUp
                      ? 'border-amber-500/50 ring-2 ring-amber-500/20 shadow-md bg-amber-50/50 dark:bg-amber-900/10'
                      : 'hover:shadow-md hover:bg-accent/50'
                  }`}
                >
                  {isNextUp && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  )}
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                      {!isHistory && (
                        <div className={`flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                          isNextUp
                            ? 'bg-amber-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {`#${index + 1}`}
                        </div>
                      )}
                      <PhotoZoom 
                        src={song.photo_url} 
                        alt="Submitter photo"
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
                          alt="Submitter photo"
                          className={`w-full h-full object-cover border-2 ${
                            isNextUp 
                              ? 'border-amber-500/50' 
                              : 'border-border'
                          } ${isHistory ? 'rounded-xl' : 'rounded-full'}`}
                        />
                      </PhotoZoom>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-base sm:text-lg break-words line-clamp-2">{song.title}</h3>
                          {isNextUp && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white flex-shrink-0">
                              <Star className="w-3 h-3" />
                              <span className="hidden sm:inline">Next Up</span>
                              <span className="sm:hidden">Next</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className={`transition-all duration-300 ${animatingVotes[song.id] ? 'scale-110 text-green-600' : ''}`}>
                              {song.votes} votes
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            {isHistory ? `Played ${formatTimeAgo(song.played_at ?? '')}` : `Added ${formatTimeAgo(song.submitted_at)}`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1 hidden sm:block">Click photo for details</p>
                      </div>
                      {!isHistory && (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {isHost && (
                            <Button
                              onClick={() => handleRemoveSong(song.id)}
                              size="icon"
                              variant="destructive"
                              className="rounded-full w-8 h-8 mb-1"
                              title="Remove song (Host only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleVote(song.id, 1)}
                            disabled={voting === song.id}
                            size="icon"
                            variant={userVote === 1 ? "default" : "outline"}
                            className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 hover:scale-110 active:scale-95 transform ${
                              userVote === 1 ? 'bg-green-600 hover:bg-green-700 shadow-lg' : 'hover:bg-green-50'
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
                              userVote === -1 ? 'shadow-lg' : 'hover:bg-red-50'
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Button>
                          
                          {/* Skip vote button - separate from regular voting */}
                          <div className="mt-2 pt-2 border-t border-border/20">
                            <Button
                              onClick={() => handleSkipVote(song.id)}
                              disabled={voting === song.id}
                              size="sm"
                              variant={userSkipVote ? "destructive" : "outline"}
                              className={`rounded-full px-3 py-1 text-xs transition-all duration-300 hover:scale-105 ${
                                userSkipVote ? 'bg-orange-600 hover:bg-orange-700 shadow-lg text-white' : 'hover:bg-orange-50 hover:border-orange-300'
                              }`}
                              title={isHost ? 'Skip song (Host - immediate)' : `Skip song (${skipVoteCount}/${skipVotesRequired} votes)`}
                            >
                              <SkipForward className="w-3 h-3 mr-1" />
                              {isHost ? 'Skip' : `${skipVoteCount}/${skipVotesRequired}`}
                            </Button>
                          </div>
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