import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useParty as usePartyContext } from '../lib/PartyContext';
import { usePartyData } from '../hooks/usePartyData';
import { useQueue } from '../hooks/useQueue';
import { usePlayback } from '../hooks/usePlayback';
import { useSuggestions } from '../hooks/useSuggestions';

// Components
import NowPlaying from './NowPlaying';
import QueueList from './QueueList';
import SongSubmissionFlow from './SongSubmissionFlow';
import PhotoGallery from './PhotoGallery';
import HostAuthModal from './HostAuthModal';
import QRCode from './QRCode';
import MoodSelector from './MoodSelector';
import NameInputModal from './NameInputModal';
import PartyInsights from './PartyInsights';
import UserMenu from './UserMenu';
import Visualizer, { type VisualizerMode } from './Visualizer';
import { Button } from './ui/button';
import { Music, QrCode, X, Share2, Check, Plus } from 'lucide-react';
import { useToast } from './ui/toast';
import { useTheme } from '../lib/ThemeContext';

function PartyPage() {
  const { partyCode } = useParams<{ partyCode: string }>();
  const { isHost } = usePartyContext(); // Context still holds the isHost global state
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const toast = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handlePrePopulate = async () => {
    if (!partyId || !isHost) return;
    
    toast.info(`Populating queue with ${theme}-themed tracks...`);
    
    try {
      // 1. Get Theme-specific suggestions from AI context
      // We use the current suggestions if available, or fetch fresh ones based on theme
      const themeContext = partyMood || `${theme} party vibe`;
      
      const { data: aiData, error: aiError } = await supabase.functions.invoke('get-song-suggestions', {
        body: { 
          musicStyle: themeContext,
          recentSongs: [],
          fullQueue: queue.map(s => s.title)
        }
      });

      if (aiError) throw aiError;

      const suggestedSongs = aiData.suggestions || [];
      if (suggestedSongs.length === 0) throw new Error('No suggestions returned');

      // 2. Search YouTube for each suggestion (limit to first 10)
      const insertPromises = suggestedSongs.slice(0, 10).map(async (s: any) => {
        const { searchYouTubeVideos } = await import('../lib/youtube');
        const results = await searchYouTubeVideos(`${s.title} ${s.artist}`);
        if (results.length > 0) {
          const video = results[0];
          return {
            party_id: partyId,
            video_id: video.id,
            title: video.title,
            thumbnail_url: video.thumbnail,
            submitted_by: fingerprint,
            photo_url: video.thumbnail,
            played: false,
            dedication: `AI Choice: ${s.reason}`
          };
        }
        return null;
      });

      const songsToInsert = (await Promise.all(insertPromises)).filter(Boolean);

      if (songsToInsert.length === 0) {
        toast.error('Could not find enough matching videos');
        return;
      }

      // 3. Insert into database
      const { error: dbError } = await supabase.from('queue_items').insert(songsToInsert);

      if (dbError) throw dbError;
      toast.success(`Added ${songsToInsert.length} ${theme} tracks to queue!`);
    } catch (err) {
      console.error('Pre-populate failed:', err);
      toast.error('Failed to populate queue with AI tracks');
    }
  };
  
  // 1. Party Data & User Profile
  const {
    partyId,
    fingerprint,
    userProfile,
    userProfiles,
    loading: partyLoading,
    createProfile,
    updateProfile
  } = usePartyData(partyCode);
  // 2. Queue & History
  const {
    queue,
    history,
    nowPlaying,
    loading: queueLoading,
    refreshQueue,
    markAsPlayed,
    pinSong,
    blacklistSong
  } = useQueue({ partyId, fingerprint });

  // 3. Suggestions (AI)
  const [partyMood, setPartyMood] = useState<string>('');
  const {
    suggestions,
    loading: suggestionsLoading,
    type: suggestionsType,
    refresh: refreshSuggestions
  } = useSuggestions({
    partyId,
    nowPlaying,
    history,
    queue,
    partyMood,
    userProfiles
  });

  // 4. Playback Logic (Host Controls, Auto-Add)
  const {
    autoAddInProgress,
    autoAddEnabled,
    setAutoAddEnabled,
    skipVoteCount,
    hasSkipVoted,
    skipVoting,
    handleSkipVote,
    clearQueue
  } = usePlayback({
    partyId,
    isHost,
    nowPlaying,
    queue,
    history,
    suggestions,
    userFingerprint: fingerprint,
    markAsPlayed
  });

  // UI States
  const [showHostModal, setShowHostModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const addSongModalRef = useRef<{ openModal: () => void }>(null);
  
  // Layout Logic (Height Calc)
  const nowPlayingEl = useRef<HTMLDivElement>(null);
  const [nowPlayingHeight, setNowPlayingHeight] = useState<number | undefined>(undefined);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const element = nowPlayingEl.current;
    if (element) {
      const resizeObserver = new ResizeObserver(() => setNowPlayingHeight(element.offsetHeight));
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }
  }, [nowPlaying, isHost]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived State
  const showNameModal = !partyLoading && !!partyId && !userProfile;
  const isLoading = partyLoading || (queueLoading && queue.length === 0 && !nowPlaying);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-muted-foreground">Joining Party...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden relative">
      <Visualizer mode={visualizerMode} isPlaying={isPlaying} />
      
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
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
              onMoodChange={setPartyMood}
              currentMood={partyMood}
            />
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
              title="Copy invite link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">Invite</span>
            </button>
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
            <SongSubmissionFlow
              ref={addSongModalRef}
              onSongAdded={refreshQueue}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              suggestionsType={suggestionsType}
              onRefreshSuggestions={async () => refreshSuggestions()}
              partyId={partyId!}
            />
            {userProfile && (
              <UserMenu 
                displayName={userProfile.display_name}
                isHost={isHost}
                onRename={() => setShowRenameModal(true)}
                onBecomeHost={() => setShowHostModal(true)}
                onClearQueue={isHost ? clearQueue : undefined}
                onPrePopulate={isHost ? handlePrePopulate : undefined}
                autoAddEnabled={autoAddEnabled}
                onToggleAutoAdd={isHost ? () => setAutoAddEnabled(!autoAddEnabled) : undefined}
                visualizerMode={visualizerMode}
                onVisualizerChange={setVisualizerMode}
                onEndParty={isHost ? () => {
                  if (confirm('Are you sure you want to end the party for everyone?')) {
                    // Logic to delete party or just logout
                    window.location.href = '/';
                  }
                } : undefined}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4 sm:p-6 xl:p-8 2xl:p-12">
        
        {/* Empty State / Welcome Screen */}
        {!nowPlaying && queue.length === 0 ? (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8 xl:mb-12 2xl:mb-16">
              <div className="w-20 h-20 xl:w-28 xl:h-28 2xl:w-36 2xl:h-36 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 xl:mb-6 2xl:mb-8 shadow-inner">
                <Music className="w-10 h-10 xl:w-14 xl:h-14 2xl:w-18 2xl:h-18 text-muted-foreground" />
              </div>
              <h2 className="text-2xl sm:text-3xl xl:text-4xl 2xl:text-6xl font-bold mb-2 xl:mb-4">Let's Get This Party Started!</h2>
              <p className="text-muted-foreground text-lg xl:text-xl 2xl:text-2xl">
                {autoAddInProgress && isHost ? 'Adding a suggested song...' : 'Add the first song and invite friends to join'}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border rounded-xl p-8 xl:p-12 2xl:p-16 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 2xl:gap-24 min-h-[400px] xl:min-h-[500px] 2xl:min-h-[600px]">
                {/* Left: Add Song */}
                <div className="text-center flex flex-col justify-center h-full">
                  <div className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-foreground">Add First Song</h3>
                        <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground">Kick things off with a banger</p>
                      </div>
                      
                      <div className="flex justify-center">
                        {autoAddInProgress && isHost ? (
                          <div className="flex items-center gap-2 px-6 py-3 bg-primary/20 text-primary rounded-lg font-medium">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Auto-adding song...
                          </div>
                        ) : (
                          <Button size="lg" className="h-14 font-bold rounded-xl px-8 shadow-xl hover:scale-105 transition-transform" onClick={() => addSongModalRef.current?.openModal()}>
                            <Plus className="w-6 h-6 mr-2" />
                            Add First Song
                          </Button>
                        )}
                      </div>
                  </div>
                </div>
                
                {/* Right: QR Code */}
                {partyCode && (
                  <div className="text-center flex flex-col justify-center h-full border-t lg:border-t-0 lg:border-l border-border pt-12 lg:pt-0 lg:pl-12">
                    <div className="space-y-6">
                      <div className="w-48 h-48 mx-auto bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center p-4">
                        <QRCode value={`${window.location.origin}/party/${partyCode}`} size={160} />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-semibold text-foreground mb-2">Join Party</h3>
                        <div className="bg-muted/50 rounded-lg p-3 border inline-block cursor-pointer hover:bg-muted transition-colors" 
                             onClick={() => navigator.clipboard.writeText(partyCode)}>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Code</p>
                          <span className="text-3xl font-bold tracking-wider font-mono text-primary">{partyCode}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Scan with your phone or enter code <strong>{partyCode}</strong> on the home page
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active Party Layout */
          <>
            <PartyInsights 
              queue={queue} 
              history={history} 
              userProfiles={userProfiles} 
            />
            
            <div className={`grid grid-cols-1 gap-4 sm:gap-6 xl:gap-6 2xl:gap-8 ${
              isHost ? 'xl:grid-cols-5 2xl:grid-cols-7' : 'xl:grid-cols-4 2xl:grid-cols-6'
            }`}>
              {/* Left/Main Column: Player */}
              <div className={`h-full sticky top-20 sm:relative sm:top-0 z-30 ${
                isHost ? 'xl:col-span-3 2xl:col-span-4' : 'xl:col-span-1 2xl:col-span-2'
              }`} ref={nowPlayingEl}>
                <NowPlaying
                  song={nowPlaying}
                  onEnded={(progress) => {
                    nowPlaying && markAsPlayed(nowPlaying.id, progress);
                    setIsPlaying(false);
                  }}
                  onSkip={(progress) => {
                    nowPlaying && markAsPlayed(nowPlaying.id, progress);
                    setIsPlaying(false);
                  }}
                  onClearQueue={clearQueue}
                  onSongStartedPlaying={() => setIsPlaying(true)}
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

              {/* Right/Secondary Column: Queue & Info */}
              <div className={`space-y-4 ${
                isHost ? 'xl:col-span-2 2xl:col-span-3' : 'xl:col-span-3 2xl:col-span-4'
              }`}>
                {/* QR Code Overlay */}
                {showQRCode && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-6 items-center">
                        <div className="p-2 bg-white rounded-lg">
                           <QRCode value={`${window.location.origin}/party/${partyCode}`} size={100} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Join the Party</h3>
                          <p className="text-muted-foreground text-sm mb-2">Share this code with friends</p>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-lg font-mono font-bold">{partyCode}</code>
                            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/party/${partyCode}`)} className="text-primary hover:underline text-sm font-medium">Copy Link</button>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setShowQRCode(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <QueueList 
                  title="Up Next" 
                  queue={queue} 
                  currentSongId={nowPlaying?.id} 
                  isHost={isHost} 
                  height={screenWidth < 640 ? undefined : (isHost ? (showQRCode ? undefined : nowPlayingHeight) : undefined)}
                  isHostView={isHost}
                  userProfiles={userProfiles}
                  onPin={pinSong}
                  onBlacklist={blacklistSong}
                  loading={queueLoading}
                />
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <PhotoGallery title="Previously Played" queue={history} userProfiles={userProfiles} />
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showHostModal && partyCode && (
        <HostAuthModal
          partyCode={partyCode}
          onClose={() => setShowHostModal(false)}
          onSuccess={() => {
            // Force reload of host status if needed, but context usually handles it
            setShowHostModal(false);
          }}
        />
      )}

      {showNameModal && partyCode && (
        <NameInputModal
          isOpen={true} // Always open if showNameModal is true
          partyCode={partyCode}
          onSubmit={async (name) => {
            await createProfile(name);
          }}
        />
      )}

      {showRenameModal && partyCode && userProfile && (
        <NameInputModal
          isOpen={true}
          isMandatory={false}
          initialValue={userProfile.display_name}
          partyCode={partyCode}
          onClose={() => setShowRenameModal(false)}
          onSubmit={async (name) => {
            await updateProfile(name);
            setShowRenameModal(false);
            toast.success('Name updated!');
          }}
        />
      )}

    </div>
  );
}

export default PartyPage;