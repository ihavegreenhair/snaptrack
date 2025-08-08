import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, type QueueItem, type UserProfile } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { clearSuggestionsCache, getAISuggestionsBackground, getInstantSuggestions, type SuggestedSong } from '../lib/gemini';
import { searchYouTubeVideos, getSongLengthError } from '../lib/youtube';
import NowPlaying from './NowPlaying';
import QueueList from './QueueList';
import AddSongModal from './AddSongModal';
import PhotoGallery from './PhotoGallery';
import HostAuthModal from './HostAuthModal';
import QRCode from './QRCode';
import MoodSelector from './MoodSelector';
import NameInputModal from './NameInputModal';
import { Music, QrCode, X, Copy } from 'lucide-react';
import { useParty } from '../lib/PartyContext';

function PartyPage() {
  const { partyCode } = useParams<{ partyCode: string }>();
  const { isHost, setIsHost } = useParty();
  const [partyId, setPartyId] = useState<string | null>(null);
  const [nowPlayingSong, setNowPlayingSong] = useState<QueueItem | null>(null);
  const nowPlayingRef = useRef<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedSong[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsType, setSuggestionsType] = useState<'instant' | 'personalized'>('instant');
  const [autoAddInProgress, setAutoAddInProgress] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const addSongModalRef = useRef<{ openModal: () => void }>(null);
  const [userFingerprint, setUserFingerprint] = useState<string>('');
  const [partyMood, setPartyMood] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[fingerprint: string]: string}>({});

  // Skip vote state
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [hasSkipVoted, setHasSkipVoted] = useState(false);
  const [skipVoting, setSkipVoting] = useState(false);

  const nowPlayingEl = useRef<HTMLDivElement>(null);
  const [nowPlayingHeight, setNowPlayingHeight] = useState<number | undefined>(undefined);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const element = nowPlayingEl.current;
    if (element) {
      const resizeObserver = new ResizeObserver(() => {
        setNowPlayingHeight(element.offsetHeight);
      });
      resizeObserver.observe(element);
      setNowPlayingHeight(element.offsetHeight);
      return () => resizeObserver.disconnect();
    }
  }, [nowPlayingSong, isHost]);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const verifyHostStatus = async (fingerprint: string, partyCode: string) => {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('host_fingerprint')
        .eq('party_code', partyCode)
        .single();

      if (error) {
        setIsHost(false);
        return false;
      }

      const isHostFromDB = data.host_fingerprint === fingerprint;
      setIsHost(isHostFromDB);
      return isHostFromDB;
    } catch (error) {
      console.error('Host verification failed:', error);
      setIsHost(false);
      return false;
    }
  };

  const checkUserProfile = async (fingerprint: string, partyId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('fingerprint', fingerprint)
        .eq('party_id', partyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error checking user profile:', error);
      return null;
    }
  };

  const createUserProfile = async (fingerprint: string, partyId: string, displayName: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          fingerprint,
          party_id: partyId,
          display_name: displayName
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  };

  const loadUserProfiles = async (partyId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('fingerprint, display_name')
        .eq('party_id', partyId);

      if (error) {
        console.error('Error loading user profiles:', error);
        return;
      }

      const profilesMap: {[fingerprint: string]: string} = {};
      data?.forEach(profile => {
        profilesMap[profile.fingerprint] = profile.display_name;
      });
      
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  };

  const handleNameSubmit = async (displayName: string) => {
    if (!partyId || !userFingerprint) return;

    const profile = await createUserProfile(userFingerprint, partyId, displayName);
    if (profile) {
      setUserProfile(profile);
      setUserProfiles(prev => ({ ...prev, [userFingerprint]: displayName }));
      setShowNameModal(false);
    }
  };

  useEffect(() => {
    const initializeParty = async () => {
      if (!partyCode) return;
      
      const fingerprint = await getUserFingerprint();
      setUserFingerprint(fingerprint);

      const { data: partyData, error } = await supabase
        .from('parties')
        .select('id, host_fingerprint')
        .eq('party_code', partyCode)
        .single();

      if (error || !partyData) {
        console.error('Error fetching party info:', error);
        return;
      }
      
      setPartyId(partyData.id);
      
      await verifyHostStatus(fingerprint, partyCode);
      
      // Load all user profiles for the party
      await loadUserProfiles(partyData.id);
      
      // Check if current user has a profile
      const existingProfile = await checkUserProfile(fingerprint, partyData.id);
      if (existingProfile) {
        setUserProfile(existingProfile);
      } else {
        // Show name input modal for new users
        setShowNameModal(true);
      }
    };

    initializeParty();

    clearSuggestionsCache();
    loadQueue();

    const channel = supabase
      .channel(`party-${partyCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `party_id=eq.${partyId}` },
        () => {
          // console.log('Queue item changed:', payload);
          loadQueue();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (_payload) => {
          setTimeout(() => loadQueue(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyCode, partyId]);

  useEffect(() => {
    if (partyId) {
      loadSuggestions();
    }
  }, [nowPlayingSong, partyId]);
  
  // Auto-add suggestion when queue is empty (host only)
  useEffect(() => {
    if (isHost && queue.length === 0 && suggestions.length > 0 && history.length > 0 && !autoAddInProgress) {
      // Delay to avoid rapid-fire auto-adds
      const timer = setTimeout(() => {
        autoAddSuggestion();
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [isHost, queue.length, suggestions.length, history.length, autoAddInProgress]);

  useEffect(() => {
    if (!nowPlayingSong || !userFingerprint) {
      setHasSkipVoted(false);
      setSkipVoteCount(0);
      return;
    }

    const loadSkipVotes = async () => {
      const { data: _data, count } = await supabase
        .from('skip_votes')
        .select('id', { count: 'exact' })
        .eq('queue_id', nowPlayingSong.id);

      setSkipVoteCount(count || 0);

      const { data: userVote } = await supabase
        .from('skip_votes')
        .select('id')
        .eq('queue_id', nowPlayingSong.id)
        .eq('fingerprint', userFingerprint)
        .single();

      setHasSkipVoted(!!userVote);
    };

    loadSkipVotes();

    const channel = supabase
      .channel(`skip-votes-${nowPlayingSong.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'skip_votes', filter: `queue_id=eq.${nowPlayingSong.id}` },
        (_payload) => {
          loadSkipVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nowPlayingSong, userFingerprint]);

  const loadQueue = async () => {
    if (!partyId) return;
    const { data, error } = await supabase
      .from('queue_items')
      .select('*')
      .eq('party_id', partyId)
      .order('votes', { ascending: false })
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error("Error loading queue:", error);
      return;
    }

    if (data) {
      const unplayed = data.filter(item => !item.played);
      const played = data.filter(item => item.played);
      
      const allSortedUnplayed = unplayed.sort((a, b) => {
        if (a.votes !== b.votes) {
          return b.votes - a.votes;
        }
        return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      });
      
      if (!nowPlayingRef.current && allSortedUnplayed.length > 0) {
        const firstSong = allSortedUnplayed[0];
        nowPlayingRef.current = firstSong;
        setNowPlayingSong(firstSong);
      } else if (nowPlayingRef.current && !unplayed.some(item => item.id === nowPlayingRef.current!.id)) {
        const nextSong = allSortedUnplayed[0] || null;
        nowPlayingRef.current = nextSong;
        setNowPlayingSong(nextSong);
      }
      
      const queueWithoutNowPlaying = nowPlayingRef.current 
        ? allSortedUnplayed.filter(item => item.id !== nowPlayingRef.current!.id)
        : allSortedUnplayed;
      
      setQueue(queueWithoutNowPlaying);
      setHistory(played.sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime()));
    }
  };

  const loadSuggestions = async () => {
    if (!partyId) return;
    setSuggestionsLoading(true);
    
    if (suggestions.length === 0) {
      const instantSuggestions = getInstantSuggestions();
      setSuggestions(instantSuggestions);
      setSuggestionsType('instant');
    }
    
    try {
      const { data: fullQueueData } = await supabase
        .from('queue_items')
        .select('*')
        .eq('party_id', partyId)
        .order('votes', { ascending: false })
        .order('submitted_at', { ascending: true });

      const fullQueue = fullQueueData || [];
      const playedHistory = fullQueue.filter(item => item.played);

      const currentSongForSuggestions = nowPlayingSong;
      const recentSongs = playedHistory
        .sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime())
        .slice(0, 10);

      try {
        await getAISuggestionsBackground(currentSongForSuggestions, recentSongs, fullQueue, partyMood, (personalizedSuggestions) => {
          setSuggestions(personalizedSuggestions);
          setSuggestionsType('personalized');
        }, partyId, userProfiles);
      } catch (aiError) {
        const instantSuggestions = getInstantSuggestions();
        setSuggestions(instantSuggestions);
        setSuggestionsType('instant');
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      const instantSuggestions = getInstantSuggestions();
      setSuggestions(instantSuggestions);
      setSuggestionsType('instant');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSongEnd = async () => {
    if (!partyId || !nowPlayingRef.current) return;
    
    await supabase
      .from('queue_items')
      .update({ played: true, played_at: new Date().toISOString() })
      .eq('id', nowPlayingRef.current.id)
      .eq('party_id', partyId);
    
    nowPlayingRef.current = null;
    setNowPlayingSong(null);
  };

  const skipSong = () => {
    handleSongEnd();
  };
  

  const autoAddSuggestion = async () => {
    if (!isHost || !partyId || autoAddInProgress) return;
    if (suggestions.length === 0) return;
    if (history.length === 0) return; // Only auto-add if there's history to base suggestions on
    if (queue.length > 0) return; // Only auto-add when queue is empty
    
    setAutoAddInProgress(true);
    
    try {
      const firstSuggestion = suggestions[0];
      const query = `${firstSuggestion.title} ${firstSuggestion.artist}`;
      
      console.log(`Host auto-adding suggestion: ${query}`);
      
      // Search for the song
      const searchResults = await searchYouTubeVideos(query);
      
      if (searchResults.length === 0) {
        console.log('No search results for auto-add');
        return;
      }
      
      // Find first valid result (under 6 minutes)
      const validResults = searchResults.filter(result => !getSongLengthError(result.duration));
      
      if (validResults.length === 0) {
        console.log('No valid length songs found for auto-add (all over 6 minutes)');
        return;
      }
      
      const selectedResult = validResults[0];
      console.log(`Auto-adding: ${selectedResult.title} (${selectedResult.duration}s)`);
      
      // Auto-add the song (use YouTube thumbnail as photo for auto-added songs)
      const { error: queueError } = await supabase.from('queue_items').insert({
        party_id: partyId,
        video_id: selectedResult.id,
        title: selectedResult.title,
        thumbnail_url: selectedResult.thumbnail,
        submitted_by: userFingerprint,
        photo_url: selectedResult.thumbnail, // Use YouTube thumbnail as the "photo"
        played: false,
      });
      
      if (queueError) {
        console.error('Auto-add failed:', queueError);
        
        // Check if this is a duplicate song error (unique constraint violation)
        if (queueError.code === '23505' && queueError.message?.includes('unique_unplayed_songs_per_party')) {
          console.log('Auto-add skipped: Song already in queue (detected by database constraint)');
        } else {
          console.error('Auto-add database error details:', queueError);
        }
        return;
      }
      
      console.log(`Auto-added: ${selectedResult.title}`);
      
    } catch (error) {
      console.error('Auto-add error:', error);
    } finally {
      setAutoAddInProgress(false);
    }
  };

  const clearQueue = async () => {
    if (!partyId) return;
    if (confirm('Are you sure you want to clear the entire queue?')) {
      await supabase
        .from('queue_items')
        .update({ played: true })
        .eq('played', false)
        .eq('party_id', partyId);
      
      nowPlayingRef.current = null;
      setNowPlayingSong(null);
    }
  };

  const handleMoodChange = (mood: string) => {
    setPartyMood(mood);
    // Clear suggestions cache when mood changes
    clearSuggestionsCache();
    // Reload suggestions with new mood
    loadSuggestions();
  };

  const handleSkipVote = async () => {
    if (!nowPlayingSong || !userFingerprint || skipVoting) return;

    setSkipVoting(true);

    try {
      if (hasSkipVoted) {
        await supabase
          .from('skip_votes')
          .delete()
          .eq('queue_id', nowPlayingSong.id)
          .eq('fingerprint', userFingerprint);
      } else {
        await supabase
          .from('skip_votes')
          .insert({ queue_id: nowPlayingSong.id, fingerprint: userFingerprint });
      }
    } catch (error) {
      console.error('Error handling skip vote:', error);
    } finally {
      setSkipVoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between p-4 xl:p-6 2xl:p-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 xl:h-12 xl:w-12 2xl:h-16 2xl:w-16 items-center justify-center rounded-lg bg-primary">
              <Music className="h-4 w-4 sm:h-6 sm:w-6 xl:h-7 xl:w-7 2xl:h-9 2xl:w-9 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight">SnapTrack</h1>
            <span className="text-muted-foreground text-sm sm:text-base xl:text-lg 2xl:text-xl">Party: {partyCode}</span>
            {isHost && (
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full">
                HOST
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <MoodSelector 
              onMoodChange={handleMoodChange}
              currentMood={partyMood}
            />
            <button 
              onClick={() => setShowQRCode(!showQRCode)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
              title="Toggle QR code for joining"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Join QR</span>
            </button>
            {!isHost && (
              <button 
                onClick={() => setShowHostModal(true)}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Become Host
              </button>
            )}
            <AddSongModal
              ref={addSongModalRef}
              onSongAdded={loadQueue}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              suggestionsType={suggestionsType}
              onRefreshSuggestions={loadSuggestions}
              partyId={partyId!}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4 sm:p-6 xl:p-8 2xl:p-12">
        
        
        {/* Main Content - Show AddSong when empty, otherwise show NowPlaying + Queue */}
        {!nowPlayingSong && queue.length === 0 ? (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 xl:mb-12 2xl:mb-16">
              <div className="w-20 h-20 xl:w-28 xl:h-28 2xl:w-36 2xl:h-36 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 xl:mb-6 2xl:mb-8">
                <Music className="w-10 h-10 xl:w-14 xl:h-14 2xl:w-18 2xl:h-18 text-muted-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-6xl font-bold mb-2 xl:mb-4">Let's Get This Party Started!</h2>
              <p className="text-muted-foreground text-lg xl:text-xl 2xl:text-2xl">
                {autoAddInProgress && isHost ? 'Adding a suggested song...' : 'Add the first song and invite friends to join'}
              </p>
            </div>
            
            {/* Single card with two column layout: AddSong + QR Code */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border rounded-xl p-8 xl:p-12 2xl:p-16 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 2xl:gap-24 min-h-[400px] xl:min-h-[500px] 2xl:min-h-[600px]">
                {/* Left: Add Song */}
                <div className="text-center flex flex-col">
                  <div className="flex-1 flex items-end justify-center pb-4">
                    <div className="space-y-3">
                      <h3 className="text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-foreground">Add First Song</h3>
                      <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground">Start the party by adding your first song</p>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 py-4">
                    {autoAddInProgress && isHost ? (
                      <div className="flex items-center justify-center gap-2 px-6 py-3 bg-primary/20 text-primary rounded-lg font-medium">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Auto-adding song...
                      </div>
                    ) : (
                      <AddSongModal
                        ref={addSongModalRef}
                        onSongAdded={loadQueue}
                        suggestions={suggestions}
                        suggestionsLoading={suggestionsLoading}
                        suggestionsType={suggestionsType}
                        onRefreshSuggestions={loadSuggestions}
                        partyId={partyId!}
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-start justify-center pt-4">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-secondary" />
                    </div>
                  </div>
                </div>
                
                {/* Right: QR Code */}
                {partyCode && (
                  <div className="text-center flex flex-col">
                    <div className="flex-1 flex items-end justify-center pb-4">
                      <div className="space-y-3">
                        <div className="w-40 h-40 mx-auto bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-3">
                          <QRCode 
                            value={`${window.location.origin}/party/${partyCode}`} 
                            size={140} 
                          />
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground">Join Party</h3>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 py-4">
                      <div className="bg-muted/50 rounded-lg p-3 border inline-block">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Code: <span className="text-lg font-bold tracking-wider font-mono text-foreground">{partyCode}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex items-start justify-center pt-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Scan this QR code with your phone to join the party
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 gap-4 sm:gap-6 xl:gap-6 2xl:gap-8 ${
              isHost ? 'xl:grid-cols-5 2xl:grid-cols-7' : 'xl:grid-cols-4 2xl:grid-cols-6'
            }`}>
              <div className={`h-full ${
                isHost ? 'xl:col-span-3 2xl:col-span-4' : 'xl:col-span-1 2xl:col-span-2'
              }`} ref={nowPlayingEl}>
                <NowPlaying
                  song={nowPlayingSong}
                  onEnded={handleSongEnd}
                  onSkip={skipSong}
                  onClearQueue={clearQueue}
                  onSongStartedPlaying={(songId) => console.log('Song started playing:', songId)}
                  isHost={isHost}
                  partyCode={partyCode || undefined}
                  onAddSong={() => addSongModalRef.current?.openModal()}
                  skipVotesRequired={3}
                  skipVoteCount={skipVoteCount}
                  hasSkipVoted={hasSkipVoted}
                  onSkipVote={handleSkipVote}
                  skipVoting={skipVoting}
                />
              </div>
              <div className={`space-y-4 ${
                isHost ? 'xl:col-span-2 2xl:col-span-3' : 'xl:col-span-3 2xl:col-span-4'
              }`}>
                {/* QR Code Section - Only appears above queue */}
                {showQRCode && (
                  <div className={`bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl ${
                    isHost ? 'p-4' : 'p-4 sm:p-6 xl:p-6 2xl:p-8'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold text-foreground ${
                        isHost ? 'text-base xl:text-lg' : 'text-lg xl:text-xl 2xl:text-2xl'
                      }`}>Join This Party</h3>
                      <button
                        onClick={() => setShowQRCode(false)}
                        className={`rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors ${
                          isHost ? 'w-6 h-6 xl:w-8 xl:h-8' : 'w-8 h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12'
                        }`}
                      >
                        <X className={`text-muted-foreground ${
                          isHost ? 'w-3 h-3 xl:w-4 xl:h-4' : 'w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6'
                        }`} />
                      </button>
                    </div>
                    
                    {isHost ? (
                      // Compact host layout - vertical stack
                      <div className="text-center space-y-4">
                        <div className="inline-block p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                          <QRCode 
                            value={`${window.location.origin}/party/${partyCode}`} 
                            size={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="bg-background border border-primary/20 rounded-md p-2">
                            <span className="text-lg xl:text-xl font-bold tracking-widest font-mono text-primary">{partyCode}</span>
                          </div>
                          <button
                            onClick={async () => {
                              const partyUrl = `${window.location.origin}/party/${partyCode}`;
                              try {
                                await navigator.clipboard.writeText(partyUrl);
                                const button = event?.target as HTMLButtonElement;
                                const originalText = button.textContent;
                                button.textContent = '✓ Copied!';
                                setTimeout(() => {
                                  button.textContent = originalText;
                                }, 2000);
                              } catch {
                                alert(`Share this link: ${partyUrl}`);
                              }
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Link
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Full guest layout - horizontal
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 2xl:gap-10 items-center">
                        {/* QR Code Section */}
                        <div className="flex justify-center xl:justify-start">
                          <div className="p-4 xl:p-5 2xl:p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                            <QRCode 
                              value={`${window.location.origin}/party/${partyCode}`} 
                              size={140}
                            />
                          </div>
                        </div>
                        
                        {/* Party Info Section */}
                        <div className="text-center xl:text-left space-y-4">
                          <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground">Scan QR code or share party code</p>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <span className="text-xs xl:text-sm 2xl:text-base font-medium text-muted-foreground uppercase tracking-wide block">Party Code:</span>
                              <div className="inline-block bg-background border-2 border-primary/20 rounded-lg p-3 xl:p-4 2xl:p-5 shadow-sm">
                                <span className="text-2xl xl:text-3xl 2xl:text-4xl font-bold tracking-widest font-mono text-primary">{partyCode}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={async () => {
                                const partyUrl = `${window.location.origin}/party/${partyCode}`;
                                try {
                                  await navigator.clipboard.writeText(partyUrl);
                                  const button = event?.target as HTMLButtonElement;
                                  const originalText = button.textContent;
                                  button.textContent = '✓ Copied!';
                                  setTimeout(() => {
                                    button.textContent = originalText;
                                  }, 2000);
                                } catch {
                                  alert(`Share this link: ${partyUrl}`);
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-3 xl:px-6 xl:py-4 2xl:px-8 2xl:py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg xl:rounded-xl font-medium xl:text-lg 2xl:text-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md"
                            >
                              <Copy className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />
                              Copy Party Link
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Queue List */}
                <QueueList 
                  title="Up Next" 
                  queue={queue} 
                  currentSongId={nowPlayingSong?.id} 
                  isHost={isHost} 
                  height={screenWidth < 640 ? undefined : (isHost ? (showQRCode ? undefined : nowPlayingHeight) : undefined)}
                  isHostView={isHost}
                  userProfiles={userProfiles}
                />
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <PhotoGallery title="Previously Played" queue={history} userProfiles={userProfiles} />
            </div>
            
            {/* Hidden AddSongModal for when we have content */}
            <div className="hidden">
              <AddSongModal
                ref={addSongModalRef}
                onSongAdded={loadQueue}
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
                suggestionsType={suggestionsType}
                onRefreshSuggestions={loadSuggestions}
                partyId={partyId!}
              />
            </div>
          </>
        )}
      </main>

      {showHostModal && (
        <HostAuthModal
          partyCode={partyCode!}
          onClose={() => setShowHostModal(false)}
          onSuccess={async () => {
            if (userFingerprint && partyCode) {
              await verifyHostStatus(userFingerprint, partyCode);
            }
            setShowHostModal(false);
          }}
        />
      )}

      {showNameModal && partyCode && (
        <NameInputModal
          isOpen={showNameModal}
          partyCode={partyCode}
          onSubmit={handleNameSubmit}
        />
      )}

    </div>
  );
}

export default PartyPage;
