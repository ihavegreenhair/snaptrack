import { Play, Clock, ChevronUp } from 'lucide-react';
import { type QueueItem } from '../lib/supabase';
import { formatTimeAgo } from '../lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhotoZoom from './PhotoZoom';

interface PhotoGalleryProps {
  queue: QueueItem[];
  title: string;
}

export default function PhotoGallery({ queue, title }: PhotoGalleryProps) {
  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-muted rounded-lg p-4">
            <p className="text-lg font-medium">No songs in history</p>
            <p className="text-muted-foreground text-sm mt-2">Played songs will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({queue.length} song{queue.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {queue.map((song, index) => (
            <PhotoZoom
              key={song.id}
              src={song.photo_url}
              alt="Song submitter's photo"
              song={song}
              isCurrentSong={false}
              isHistory={true}
              queue={queue}
              currentIndex={index}
              className="group cursor-pointer"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted transition-all duration-300 hover:scale-105 hover:shadow-lg">
                {/* Photo */}
                <img
                  src={song.photo_url}
                  alt="Song submitter's photo"
                  className="w-full h-full object-cover"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                
                {/* Song info overlay */}
                <div className="absolute inset-0 p-2 sm:p-3 flex flex-col justify-end text-white">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">
                      {song.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <div className="flex items-center gap-1">
                        <ChevronUp className="w-3 h-3" />
                        <span>{song.votes}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(song.played_at ?? '')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hover indicator */}
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                    <Play className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
                
                {/* Position number */}
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/50 backdrop-blur-sm rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
              </div>
            </PhotoZoom>
          ))}
        </div>
        
        {/* Summary stats */}
        {queue.length > 0 && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-primary">{queue.length}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Songs Played</div>
              </div>
              
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {queue.reduce((sum, song) => sum + song.votes, 0)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total Votes</div>
              </div>
              
              <div>
                <div className="text-xl sm:text-2xl font-bold text-amber-600">
                  {Math.max(...queue.map(song => song.votes))}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Top Votes</div>
              </div>
              
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {queue.length > 0 ? Math.round(queue.reduce((sum, song) => sum + song.votes, 0) / queue.length * 10) / 10 : 0}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Avg Votes</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}