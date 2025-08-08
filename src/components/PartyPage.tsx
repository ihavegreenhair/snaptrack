import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, type QueueItem } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { clearSuggestionsCache, getAISuggestionsBackground, getInstantSuggestions, type SuggestedSong } from '../lib/gemini';
import NowPlaying from './NowPlaying';
import QueueList from './QueueList';
import AddSongModal from './AddSongModal';
import PhotoGallery from './PhotoGallery';
import HostAuthModal from './HostAuthModal';
import QRCode from './QRCode';
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
  const [showHostModal, setShowHostModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const addSongModalRef = useRef<{ openModal: () => void }>(null);
  const [userFingerprint, setUserFingerprint] = useState<string>('');

  const nowPlayingEl = useRef<HTMLDivElement>(null);
  const [nowPlayingHeight, setNowPlayingHeight] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    const initializeParty = async () => {
      if (!partyCode) return;
      
      const fingerprint = await getUserFingerprint();
      setUserFingerprint(fingerprint);

      const { data, error } = await supabase
        .from('parties')
        .select('id, host_fingerprint')
        .eq('party_code', partyCode)
        .single();

      if (error || !data) {
        console.error('Error fetching party info:', error);
        return;
      }
      
      setPartyId(data.id);
      
      await verifyHostStatus(fingerprint, partyCode);
    };

    initializeParty();

    clearSuggestionsCache();
    loadQueue();

    const channel = supabase
      .channel(`party-${partyCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `party_id=eq.${partyId}` },
        (payload) => {
          console.log('Queue item changed:', payload);
          loadQueue();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          console.log('Vote changed:', payload);
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
        await getAISuggestionsBackground(currentSongForSuggestions, recentSongs, fullQueue, (personalizedSuggestions) => {
          setSuggestions(personalizedSuggestions);
          setSuggestionsType('personalized');
        });
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
  
  const skipSongById = async (songId: string) => {
    if (!partyId) return;
    
    try {
      // Mark the specific song as played (skipped)
      await supabase
        .from('queue_items')
        .update({ played: true, played_at: new Date().toISOString() })
        .eq('id', songId)
        .eq('party_id', partyId);
        
      // If it's the currently playing song, move to next
      if (nowPlayingSong?.id === songId) {
        handleSongEnd();
      }
    } catch (error) {
      console.error('Error skipping song:', error);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 gap-4 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
              <Music className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SnapTrack</h1>
            <span className="text-muted-foreground text-sm sm:text-base">Party: {partyCode}</span>
            {isHost && (
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full">
                HOST
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
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

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        
        
        {/* Main Content - Show AddSong when empty, otherwise show NowPlaying + Queue */}
        {!nowPlayingSong && queue.length === 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Let's Get This Party Started!</h2>
              <p className="text-muted-foreground text-lg">Add the first song and invite friends to join</p>
            </div>
            
            {/* Single card with two column layout: AddSong + QR Code */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border rounded-xl p-8 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-h-[400px]">
                {/* Left: Add Song */}
                <div className="text-center flex flex-col">
                  <div className="flex-1 flex items-end justify-center pb-4">
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-foreground">Add First Song</h3>
                      <p className="text-sm text-muted-foreground">Start the party by adding your first song</p>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 py-4">
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
                            value={process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`} 
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-full" ref={nowPlayingEl}>
                <NowPlaying
                  song={nowPlayingSong}
                  onEnded={handleSongEnd}
                  onSkip={skipSong}
                  onClearQueue={clearQueue}
                  onSongStartedPlaying={(songId) => console.log('Song started playing:', songId)}
                  isHost={isHost}
                  partyCode={partyCode || undefined}
                  onAddSong={() => addSongModalRef.current?.openModal()}
                />
              </div>
              <div className="space-y-4">
                {/* QR Code Section - Only appears above queue */}
                {showQRCode && (
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Join This Party</h3>
                      <button
                        onClick={() => setShowQRCode(false)}
                        className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                        <QRCode 
                          value={process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`} 
                          size={120} 
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm text-muted-foreground mb-3">Scan QR code or share party code</p>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Code:</span>
                            <span className="text-xl font-bold tracking-wider font-mono bg-background px-3 py-2 rounded border">{partyCode}</span>
                          </div>
                          <button
                            onClick={async () => {
                              const partyUrl = process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`;
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
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Queue List */}
                <QueueList 
                  title="Up Next" 
                  queue={queue} 
                  currentSongId={nowPlayingSong?.id} 
                  isHost={isHost} 
                  height={showQRCode ? undefined : nowPlayingHeight}
                  onSkipSong={skipSongById}
                  skipVotesRequired={3}
                />
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <PhotoGallery title="Previously Played" queue={history} />
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

    </div>
  );
}

export default PartyPage;
