import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { useParty } from '../lib/PartyContext';
import { useToast } from './ui/toast';
import { Loader2 } from 'lucide-react';

const HomePage: React.FC = () => {
  const [partyCode, setPartyCode] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsHost } = useParty();
  const toast = useToast();

  const handleCreateParty = async () => {
    if (!hostPassword) {
      toast.error('Please enter a host password.');
      return;
    }

    setIsLoading(true);
    try {
      const creatorFingerprint = await getUserFingerprint();
      
      const { data, error } = await supabase.functions.invoke('create-party', {
        body: { 
          host_password: hostPassword,
          creator_fingerprint: creatorFingerprint
        },
      });

      if (error) throw error;

      setIsHost(true);
      toast.success('Party created successfully!');
      navigate(`/party/${data.party.party_code}`);
    } catch (error) {
      console.error('Error creating party:', error);
      toast.error('Failed to create party. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinParty = () => {
    if (!partyCode) {
      toast.error('Please enter a party code.');
      return;
    }
    navigate(`/party/${partyCode}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full p-4 sm:p-8 space-y-6 sm:space-y-8 bg-card rounded-lg shadow-lg border border-border">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SnapTrack</h1>
          <p className="text-muted-foreground mt-2">The social jukebox for your party.</p>
        </div>
        
        <div className="space-y-8">
          {/* Join Party Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Join a Party
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Party Code (e.g., A1B2)"
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value.trim().toUpperCase())}
                className="flex-grow p-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase placeholder:normal-case font-mono"
              />
              <button 
                onClick={handleJoinParty} 
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold transition-colors"
              >
                Join
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or create new</span>
            </div>
          </div>

          {/* Create Party Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Create a Party</h2>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Set Host Password"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                className="flex-grow p-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all"
              />
              <button 
                onClick={handleCreateParty} 
                disabled={isLoading} 
                className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              As host, you'll control playback and manage the queue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;