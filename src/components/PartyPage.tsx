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
import { Music, QrCode } from 'lucide-react';
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
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // Close QR code when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qrCodeRef.current && !qrCodeRef.current.contains(event.target as Node)) {
        setShowQRCode(false);
      }
    };
    
    if (showQRCode) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQRCode]);
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
            <div className="relative" ref={qrCodeRef}>
              <button 
                onClick={() => setShowQRCode(!showQRCode)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
                title="Toggle QR code for joining"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Join QR</span>
              </button>
              
              {/* Inline QR Code Dropdown */}
              {showQRCode && (
                <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-border rounded-lg shadow-lg z-50 min-w-64">
                  <div className="text-center space-y-3">
                    <h3 className="font-semibold text-sm">Join This Party</h3>
                    <div className="bg-white p-3 rounded border">
                      <QRCode 
                        value={process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`} 
                        size={150} 
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Party Code</p>
                      <p className="text-lg font-bold tracking-wider">{partyCode}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const partyUrl = process.env.VITE_LOCAL_URL ? `${process.env.VITE_LOCAL_URL}/party/${partyCode}` : `${window.location.origin}/party/${partyCode}`;
                        try {
                          await navigator.clipboard.writeText(partyUrl);
                          alert('Party URL copied to clipboard!');
                        } catch {
                          alert(`Share this link: ${partyUrl}`);
                        }
                      }}
                      className="text-xs bg-muted hover:bg-muted/80 px-3 py-1 rounded transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!isHost && (
              <button 
                onClick={() => setShowHostModal(true)}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Become Host
              </button>
            )}
            <AddSongModal
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="h-full" ref={nowPlayingEl}>
            <NowPlaying
              song={nowPlayingSong}
              onEnded={handleSongEnd}
              onSkip={skipSong}
              onClearQueue={clearQueue}
              onSongStartedPlaying={(songId) => console.log('Song started playing:', songId)}
              isHost={isHost}
            />
          </div>
          <div className="h-full">
            <QueueList 
              title="Up Next" 
              queue={queue} 
              currentSongId={nowPlayingSong?.id} 
              isHost={isHost} 
              height={nowPlayingHeight}
              onSkipSong={skipSongById}
              skipVotesRequired={3}
            />
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <PhotoGallery title="Previously Played" queue={history} />
        </div>
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
