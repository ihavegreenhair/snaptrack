import React from 'react';
import { Users, Trophy, Music2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type QueueItem } from '../lib/supabase';

interface PartyInsightsProps {
  queue: QueueItem[];
  history: QueueItem[];
  userProfiles: {[fingerprint: string]: string};
}

const PartyInsights: React.FC<PartyInsightsProps> = ({ queue, history, userProfiles }) => {
  const allSongs = [...queue, ...history];
  
  // 1. Top Contributors
  const contributorStats: {[key: string]: number} = {};
  allSongs.forEach(song => {
    contributorStats[song.submitted_by] = (contributorStats[song.submitted_by] || 0) + 1;
  });

  const topContributors = Object.entries(contributorStats)
    .map(([fingerprint, count]) => ({
      name: userProfiles[fingerprint] || 'Anonymous',
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 2. Crowd Favorites (Highest Votes)
  const crowdFavorites = [...allSongs]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-secondary/10 to-transparent border-secondary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Top DJs</CardTitle>
          <Users className="h-4 w-4 text-secondary-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {topContributors.length > 0 ? topContributors.map((dj, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="truncate font-medium">{dj.name}</span>
                <span className="text-muted-foreground">{dj.count} songs</span>
              </div>
            )) : <div className="text-sm text-muted-foreground italic">No songs yet</div>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Crowd Favorites</CardTitle>
          <Trophy className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {crowdFavorites.length > 0 ? crowdFavorites.map((song, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="truncate font-medium flex items-center gap-1">
                  <Music2 className="h-3 w-3" />
                  {song.title}
                </span>
                <span className="text-accent font-bold">+{song.votes}</span>
              </div>
            )) : <div className="text-sm text-muted-foreground italic">No votes yet</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartyInsights;
