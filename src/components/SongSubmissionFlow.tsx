import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Loader2, 
  Plus, 
  ChevronLeft, 
  RefreshCw, 
  Heart,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { type YouTubeVideo, getSongLengthError } from '../lib/youtube';
import { clearSuggestionsCache, type SuggestedSong } from '../lib/gemini';
import YouTubeSearch from './YouTubeSearch';
import { Button } from '@/components/ui/button';
import { useToast } from './ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SongSubmissionFlowProps {
  onSongAdded: () => void;
  suggestions: SuggestedSong[];
  suggestionsLoading: boolean;
  suggestionsType: 'instant' | 'personalized';
  onRefreshSuggestions: () => Promise<void>;
  partyId: string;
}

type Step = 'discover' | 'personalize' | 'capture' | 'success';
type CameraStatus = 'idle' | 'initializing' | 'active' | 'countdown' | 'captured' | 'error';

export default React.forwardRef<{ openModal: () => void }, SongSubmissionFlowProps>(function SongSubmissionFlow({ 
  onSongAdded, 
  suggestions, 
  suggestionsLoading, 
  suggestionsType, 
  onRefreshSuggestions,
  partyId 
}, ref) {
  const [isOpen, setIsOpen] = useState(false);

  React.useImperativeHandle(ref, () => ({
    openModal: () => setIsOpen(true)
  }));

  const [step, setStep] = useState<Step>('discover');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [dedication, setDedication] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera & Photo State
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  
  const toast = useToast();

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopCamera();
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const stopCamera = useCallback((keepStatus = false) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (!keepStatus) {
      setCameraStatus('idle');
    }
  }, []);

  const startCamera = async () => {
    setCameraStatus('initializing');
    setCameraError(null);
    
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints: MediaStreamConstraints = {
        video: isMobile ? { facingMode: 'user' } : {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStatus('active');
        
        // Auto-start countdown after a brief stabilization period
        setTimeout(() => startCountdown(), 1000);
      }
    } catch (err: any) {
      console.error('Camera Error:', err);
      setCameraStatus('error');
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Could not access camera');
    }
  };

  // Auto-start camera when reaching capture step
  useEffect(() => {
    if (step === 'capture' && !photoUrl && cameraStatus === 'idle') {
      startCamera();
    }
  }, [step, photoUrl, cameraStatus]);

  const startCountdown = () => {
    setCameraStatus('countdown');
    setCountdown(3);
    
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
          takePhoto();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Flip for selfie
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPhotoBlob(blob);
          setPhotoUrl(url);
          setCameraStatus('captured');
          stopCamera(true); // PASS TRUE TO KEEP STATUS
        }
      }, 'image/jpeg', 0.85);
    }
  };

  const handleVideoSelect = async (video: YouTubeVideo) => {
    // Length check
    const lengthError = getSongLengthError(video.duration);
    if (lengthError) {
      toast.error(lengthError);
      return;
    }

    // Blacklist check
    const { data: blacklisted } = await supabase
      .from('blacklisted_songs')
      .select('id')
      .eq('video_id', video.id)
      .eq('party_id', partyId)
      .single();

    if (blacklisted) {
      toast.error('This song has been banned from this party');
      return;
    }

    setSelectedVideo(video);
    setStep('personalize');
  };

  const handleSuggestionSelect = (suggestion: SuggestedSong) => {
    setSearchQuery(`${suggestion.title} ${suggestion.artist}`);
    setHasSearched(true);
  };

  const handleSubmit = async () => {
    if (!selectedVideo || !photoBlob) return;

    setIsSubmitting(true);
    try {
      const fingerprint = await getUserFingerprint();
      const fileName = `${fingerprint}/${Date.now()}.jpg`;
      
      // 1. Upload Photo
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // 2. Insert Song
      const { error: dbError } = await supabase.from('queue_items').insert({
        video_id: selectedVideo.id,
        title: selectedVideo.title,
        thumbnail_url: selectedVideo.thumbnail,
        photo_url: publicUrl,
        submitted_by: fingerprint,
        party_id: partyId,
        dedication: dedication.trim() || null
      });

      if (dbError) {
        if (dbError.code === '23505') {
          toast.error('This song is already in the queue!');
          return;
        }
        throw dbError;
      }

      // Success
      clearSuggestionsCache();
      onRefreshSuggestions();
      setStep('success');
      setTimeout(() => {
        setIsOpen(false);
        resetFlow();
        onSongAdded();
      }, 2000);

    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error('Failed to add song. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep('discover');
    setSelectedVideo(null);
    setDedication('');
    setPhotoBlob(null);
    setPhotoUrl(null);
    setCameraStatus('idle');
    setHasSearched(false);
    setSearchQuery('');
    stopCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetFlow();
    }}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto font-bold gap-2 shadow-lg">
          <Plus className="w-5 h-5" />
          Add Song
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:rounded-2xl border-none shadow-2xl bg-background">
        <div className="flex flex-col h-[90vh] sm:h-auto max-h-[800px]">
          
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              {step !== 'discover' && step !== 'success' && (
                <Button variant="ghost" size="icon" className="rounded-full -ml-2" onClick={() => {
                  if (step === 'personalize') setStep('discover');
                  if (step === 'capture') setStep('personalize');
                }}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <DialogTitle className="text-xl font-bold">
                {step === 'discover' && 'Add a Song'}
                {step === 'personalize' && 'Add a Message'}
                {step === 'capture' && 'Selfie Time!'}
                {step === 'success' && 'Banger Added!'}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Step 1: Discover */}
            {step === 'discover' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <YouTubeSearch 
                  onSelectVideo={handleVideoSelect}
                  searchQuery={searchQuery}
                  onSearchMade={() => setHasSearched(true)}
                  onQueryChange={setSearchQuery}
                />

                {!hasSearched && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <RefreshCw className={cn("w-4 h-4", suggestionsLoading && "animate-spin")} />
                      {suggestionsType === 'personalized' ? 'Recommended for the vibe' : 'Party Starters'}
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group"
                        >
                          <div className="font-bold group-hover:text-primary transition-colors">{suggestion.title}</div>
                          <div className="text-sm text-muted-foreground">{suggestion.artist}</div>
                          <div className="text-xs text-muted-foreground/70 italic mt-2 flex items-center gap-1">
                            <Heart className="w-3 h-3 text-primary/50" />
                            {suggestion.reason}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Personalize */}
            {step === 'personalize' && selectedVideo && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-muted/50">
                  <img src={selectedVideo.thumbnail} className="w-24 aspect-video rounded-lg object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{selectedVideo.title}</div>
                    <div className="text-sm text-muted-foreground">{selectedVideo.channelTitle}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Who is this for?
                  </label>
                  <textarea
                    placeholder="Add a dedication (optional)..."
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-xl bg-muted/30 border-2 border-transparent focus:border-primary/50 focus:bg-background outline-none transition-all resize-none text-lg"
                    maxLength={100}
                  />
                  <div className="text-right text-xs text-muted-foreground">
                    {dedication.length}/100
                  </div>
                </div>

                <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => setStep('capture')}>
                  Next: Take Selfie
                </Button>
              </div>
            )}

            {/* Step 3: Capture */}
            {step === 'capture' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                
                {(cameraStatus === 'idle' || cameraStatus === 'initializing' || cameraStatus === 'active' || cameraStatus === 'countdown') && (
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black shadow-2xl">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" autoPlay playsInline muted />
                    
                    {isFlashing && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}
                    
                    {cameraStatus === 'countdown' && countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40">
                        <div className="text-8xl font-black text-white animate-in zoom-in duration-300">
                          {countdown}
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold flex items-center gap-2">
                        {cameraStatus === 'initializing' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Warming up...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            Get ready!
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {cameraStatus === 'captured' && photoUrl && (
                  <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="relative group mx-auto w-48 h-48 sm:w-64 sm:h-64">
                      <img src={photoUrl} className="w-full h-full object-cover rounded-full border-4 border-primary shadow-2xl" />
                      <button 
                        onClick={() => {
                          setPhotoUrl(null);
                          setPhotoBlob(null);
                          setCameraStatus('idle');
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-lg font-bold">Lookin' good! 🔥</div>
                      <Button 
                        size="lg" 
                        className="w-full h-14 text-xl font-black rounded-xl shadow-xl shadow-primary/20" 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          'ADD TO QUEUE'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {cameraStatus === 'error' && (
                  <div className="py-12 space-y-6">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                      <AlertCircle className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Camera Issue</h3>
                      <p className="text-muted-foreground">{cameraError}</p>
                    </div>
                    <Button variant="outline" onClick={() => setCameraStatus('idle')}>
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
                  <Check className="w-12 h-12 text-white stroke-[4]" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black italic tracking-tighter text-green-500">BANGER ADDED!</h2>
                  <p className="text-lg font-medium text-muted-foreground">Your track is in the mix.</p>
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
});
