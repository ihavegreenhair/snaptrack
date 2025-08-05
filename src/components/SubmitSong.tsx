
import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import YouTubeSearch from './YouTubeSearch';
import PhotoUploader from './PhotoUploader';
import { supabase } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { type YouTubeVideo, getSongLengthError } from '../lib/youtube';
import { clearSuggestionsCache, type SuggestedSong } from '../lib/gemini';
import { Button } from '@/components/ui/button';

interface SubmitSongProps {
  onSongAdded?: () => void;
  suggestions: SuggestedSong[];
  suggestionsLoading: boolean;
  suggestionsType: 'instant' | 'personalized';
  onRefreshSuggestions: () => Promise<void>;
  partyId: string;
}

const SubmitSong: React.FC<SubmitSongProps> = ({ onSongAdded, suggestions, suggestionsLoading, suggestionsType, onRefreshSuggestions, partyId }) => {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedSong | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submissionInProgress = useRef(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has made a search
  const [searchQuery, setSearchQuery] = useState<string>(''); // Query to pass to search

  // Suggestions are now managed by the parent App component


  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setSelectedSuggestion(null); // Clear suggestion selection
    setShowPhotoUploader(true); // Show photo uploader
  };

  const handleSuggestionSelect = (suggestion: SuggestedSong) => {
    // Use the suggestion as a search query
    const query = `${suggestion.title} ${suggestion.artist}`;
    setSearchQuery(query);
    setHasSearched(true); // Hide suggestions since we're now searching
  };

  const handlePhotoSelected = async (file: File | null) => {
    console.log('handlePhotoSelected called', { file: !!file, submitting, hasSubmitted, submissionInProgress: submissionInProgress.current });
    if (!file || submitting || hasSubmitted || submissionInProgress.current) {
      console.log('handlePhotoSelected early return');
      return;
    }
    
    console.log('handlePhotoSelected proceeding with submission');
    setPhoto(file);
    setHasSubmitted(true);
    
    // Auto-submit once photo is taken
    await handleSubmit(file);
  };

  const handleSubmit = async (photoFile?: File) => {
    console.log('handleSubmit called', { submitting, hasSubmitted, photoFile: !!photoFile, submissionInProgress: submissionInProgress.current });
    if (submitting || submissionInProgress.current) {
      console.log('handleSubmit early return - already submitting');
      return; // Prevent double submission
    }
    
    // Set submission flags immediately
    submissionInProgress.current = true;
    setSubmitting(true);
    
    const photoToUse = photoFile || photo;
    if ((!selectedVideo && !selectedSuggestion) || !photoToUse) {
      // Reset flags if submission fails early
      submissionInProgress.current = false;
      setSubmitting(false);
      return;
    }

    // Determine which song data to use
    const songData = selectedVideo || {
      id: selectedSuggestion!.videoId,
      title: `${selectedSuggestion!.title} - ${selectedSuggestion!.artist}`,
      thumbnail: `https://img.youtube.com/vi/${selectedSuggestion!.videoId}/hqdefault.jpg`,
      duration: 0 // We don't have duration for suggestions
    };

    // Check song length before proceeding (skip for personalized suggestions)
    if (selectedVideo) {
      const lengthError = getSongLengthError(selectedVideo.duration);
      if (lengthError) {
        // Reset flags if song is too long
        submissionInProgress.current = false;
        setSubmitting(false);
        return;
      }
    }

    // 0. Check for duplicates
    const { data: existingSongs, error: existingError } = await supabase
      .from('queue_items')
      .select('id')
      .eq('video_id', songData.id)
      .eq('played', false);

    if (existingError) {
      console.error('Error checking for existing songs:', existingError);
      submissionInProgress.current = false;
      setSubmitting(false);
      return;
    }

    if (existingSongs.length > 0) {
      console.log('Song already in queue, skipping');
      submissionInProgress.current = false;
      setSubmitting(false);
      return;
    }

    const fingerprint = await getUserFingerprint();

    // 1. Upload photo to Supabase Storage
    const photoPath = `${fingerprint}/${Date.now()}_${photoToUse.name}`;
    const { error: photoError } = await supabase.storage
      .from('photos')
      .upload(photoPath, photoToUse);

    if (photoError) {
      console.error('Error uploading photo:', photoError);
      submissionInProgress.current = false;
      setSubmitting(false);
      return;
    }

    // 2. Get public URL for the photo
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(photoPath);

    // 3. Add song to the queue
    console.log('About to insert song to database:', songData.id, songData.title);
    const { error: queueError } = await supabase.from('queue_items').insert({
      video_id: songData.id,
      title: songData.title,
      thumbnail_url: songData.thumbnail,
      submitted_by: fingerprint,
      photo_url: publicUrl,
      party_id: partyId,
    });
    console.log('Database insert completed:', { error: queueError });

    if (queueError) {
      console.error('Error adding song to queue:', queueError);
    } else {
      console.log('Song added successfully - clearing cache and refreshing suggestions');
      // SUCCESS FLOW: Clear cache → Trigger fresh suggestions throughout system
      clearSuggestionsCache();
      
      // Immediately trigger fresh suggestions request
      onRefreshSuggestions().then(() => {
        console.log('Fresh suggestions loaded after song submission');
      }).catch((error) => {
        console.error('Failed to refresh suggestions after song submission:', error);
      });
      
      // Close modal
      onSongAdded?.();
    }

    setSubmitting(false);
    submissionInProgress.current = false;
    
    // Reset form
    setSelectedVideo(null);
    setSelectedSuggestion(null);
    setPhoto(null);
    setShowPhotoUploader(false);
    setHasSearched(false);
    setHasSubmitted(false);
    setSearchQuery('');
  };

  const currentSelection = selectedVideo || selectedSuggestion;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
      {!showPhotoUploader ? (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold">Search for a Song</h3>
          
          {/* YouTube Search */}
          <YouTubeSearch 
            onSelectVideo={handleVideoSelect} 
            onSearchMade={() => setHasSearched(true)}
            searchQuery={searchQuery}
            onQueryChange={(query) => {
              setSearchQuery(query);
              if (query.trim()) {
                setHasSearched(true);
              }
            }}
          />

          {/* Suggestions (show only if no search has been made) */}
          {!hasSearched && (
            <div className="space-y-4">
              {suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                    {suggestionsType === 'personalized' ? 'Personalized suggestions:' : 'Popular suggestions:'}
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="bg-card border rounded-lg p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer max-w-full"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-semibold text-sm sm:text-base mb-1 break-words leading-tight">
                              {suggestion.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-1 break-words leading-tight">
                              by {suggestion.artist}
                            </p>
                            <p className="text-xs text-muted-foreground/80 italic break-words leading-tight line-clamp-2">
                              {suggestion.reason}
                            </p>
                          </div>
                          
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionSelect(suggestion);
                            }}
                            size="sm"
                            className="flex-shrink-0 px-2 sm:px-3"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">Search</span>
                            <span className="sm:hidden">+</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suggestionsLoading && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Loading suggestions...
                  </h4>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted rounded-lg p-4">
                        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold">Take Your Photo</h3>
          {currentSelection && (
            <div className="flex items-center gap-3 sm:gap-4 p-3 bg-muted rounded-lg">
              <img 
                src={selectedVideo ? selectedVideo.thumbnail : `https://img.youtube.com/vi/${selectedSuggestion!.videoId}/hqdefault.jpg`} 
                alt={selectedVideo ? selectedVideo.title : selectedSuggestion!.title} 
                className="w-16 sm:w-20 h-auto rounded-md flex-shrink-0" 
              />
              <p className="text-base sm:text-lg font-medium break-words leading-tight">
                {selectedVideo ? selectedVideo.title : `${selectedSuggestion!.title} - ${selectedSuggestion!.artist}`}
              </p>
            </div>
          )}
          
          {submitting && (
            <div className="text-center py-4">
              <div className="text-lg font-medium">Adding song to queue...</div>
            </div>
          )}
          
          {!submitting && (
            <PhotoUploader onPhotoSelected={handlePhotoSelected} autoStart={true} />
          )}
          
          <Button
            onClick={() => {
              setShowPhotoUploader(false);
              setSelectedVideo(null);
              setSelectedSuggestion(null);
              setHasSubmitted(false);
              setSearchQuery('');
              submissionInProgress.current = false;
            }}
            variant="outline"
            className="w-full"
            disabled={submitting}
          >
            Back to Song Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubmitSong;
