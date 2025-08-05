import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { useParty } from '../lib/PartyContext';

const HomePage: React.FC = () => {
  const [partyCode, setPartyCode] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsHost } = useParty();

  const handleCreateParty = async () => {
    if (!hostPassword) {
      alert('Please enter a host password.');
      return;
    }

    setIsLoading(true);
    try {
      // Get the creator's fingerprint to automatically set them as host
      const creatorFingerprint = await getUserFingerprint();
      
      const { data, error } = await supabase.functions.invoke('create-party', {
        body: { 
          host_password: hostPassword,
          creator_fingerprint: creatorFingerprint
        },
      });

      if (error) throw error;

      // Set the creator as host immediately
      setIsHost(true);
      navigate(`/party/${data.party.party_code}`);
    } catch (error) {
      console.error('Error creating party:', error);
      alert('Failed to create party. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinParty = () => {
    if (!partyCode) {
      alert('Please enter a party code.');
      return;
    }
    navigate(`/party/${partyCode}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full p-4 sm:p-8 space-y-6 sm:space-y-8 bg-card rounded-lg shadow-lg">
        <div>
          <h1 className="text-center text-3xl sm:text-4xl font-bold tracking-tight">SnapTrack</h1>
          <p className="text-center text-muted-foreground mt-2 text-sm sm:text-base">Create or join a party to start sharing music.</p>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Join a Party</h2>
            <div className="flex flex-col sm:flex-row mt-2 gap-2 sm:gap-0">
              <input
                type="text"
                placeholder="Enter Party Code"
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value.trim())}
                className="flex-grow p-3 sm:p-2 border rounded-md sm:rounded-l-md sm:rounded-r-none bg-input text-base sm:text-sm"
              />
              <button onClick={handleJoinParty} className="px-4 py-3 sm:py-2 bg-primary text-primary-foreground rounded-md sm:rounded-l-none sm:rounded-r-md font-semibold text-base sm:text-sm">
                Join
              </button>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Create a Party</h2>
            <div className="flex flex-col sm:flex-row mt-2 gap-2 sm:gap-0">
              <input
                type="password"
                placeholder="Set Host Password"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                className="flex-grow p-3 sm:p-2 border rounded-md sm:rounded-l-md sm:rounded-r-none bg-input text-base sm:text-sm"
              />
              <button onClick={handleCreateParty} disabled={isLoading} className="px-4 py-3 sm:py-2 bg-secondary text-secondary-foreground rounded-md sm:rounded-l-none sm:rounded-r-md font-semibold text-base sm:text-sm">
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
