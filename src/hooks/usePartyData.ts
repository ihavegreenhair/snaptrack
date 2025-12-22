import { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '../lib/supabase';
import { getUserFingerprint } from '../lib/fingerprint';
import { useParty as usePartyContext } from '../lib/PartyContext';

export function usePartyData(partyCode: string | undefined) {
  const { setIsHost } = usePartyContext();
  const [partyId, setPartyId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[fingerprint: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!partyCode) throw new Error("No party code provided");

        // 1. Get Fingerprint
        const fp = await getUserFingerprint();
        setFingerprint(fp);

        // 2. Get Party Details
        const { data: party, error: partyError } = await supabase
          .from('parties')
          .select('id, host_fingerprint')
          .eq('party_code', partyCode)
          .single();

        if (partyError || !party) {
          throw new Error("Party not found");
        }

        setPartyId(party.id);

        // 3. Verify Host Status
        const isHost = party.host_fingerprint === fp;
        setIsHost(isHost);

        // 4. Load All User Profiles for this party
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('fingerprint, display_name')
          .eq('party_id', party.id);

        if (!profilesError && profiles) {
          const map: {[key: string]: string} = {};
          profiles.forEach(p => map[p.fingerprint] = p.display_name);
          setUserProfiles(map);
        }

        // 5. Check Current User Profile
        const { data: myProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('fingerprint', fp)
            .eq('party_id', party.id)
            .single();
            
        setUserProfile(myProfile);

      } catch (err: any) {
        console.error("Party initialization failed:", err);
        setError(err.message || "Failed to join party");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [partyCode, setIsHost]);

  const createProfile = async (displayName: string) => {
    if (!partyId || !fingerprint) return null;

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

      if (error) throw error;
      
      setUserProfile(data);
      setUserProfiles(prev => ({ ...prev, [fingerprint]: displayName }));
      return data;
    } catch (err) {
      console.error("Failed to create profile:", err);
      return null;
    }
  };

  const updateProfile = async (displayName: string) => {
    if (!partyId || !fingerprint) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ display_name: displayName })
        .eq('fingerprint', fingerprint)
        .eq('party_id', partyId)
        .select()
        .single();

      if (error) throw error;
      
      setUserProfile(data);
      setUserProfiles(prev => ({ ...prev, [fingerprint]: displayName }));
      return data;
    } catch (err) {
      console.error("Failed to update profile:", err);
      return null;
    }
  };

  return {
    partyId,
    fingerprint,
    userProfile,
    userProfiles,
    loading,
    error,
    createProfile,
    updateProfile
  };
}
