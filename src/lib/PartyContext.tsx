import React, { createContext, useContext, useState, useEffect } from 'react';

interface PartyContextType {
  partyCode: string | null;
  isHost: boolean;
  setPartyCode: (code: string | null) => void;
  setIsHost: (isHost: boolean) => void;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partyCode, setPartyCode] = useState<string | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('snaptrack-party-code');
    }
    return null;
  });
  
  const [isHost, setIsHost] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const savedHostStatus = localStorage.getItem('snaptrack-is-host');
      return savedHostStatus === 'true';
    }
    return false;
  });

  // Save party code to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (partyCode) {
        localStorage.setItem('snaptrack-party-code', partyCode);
      } else {
        localStorage.removeItem('snaptrack-party-code');
      }
    }
  }, [partyCode]);

  // Save host status to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('snaptrack-is-host', isHost.toString());
      // Clear host status when it becomes false
      if (!isHost) {
        localStorage.removeItem('snaptrack-is-host');
      }
    }
  }, [isHost]);

  return (
    <PartyContext.Provider value={{ partyCode, isHost, setPartyCode, setIsHost }}>
      {children}
    </PartyContext.Provider>
  );
};

export const useParty = () => {
  const context = useContext(PartyContext);
  if (!context) {
    throw new Error('useParty must be used within a PartyProvider');
  }
  return context;
};
