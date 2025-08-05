import React, { createContext, useContext, useState } from 'react';

interface PartyContextType {
  partyCode: string | null;
  isHost: boolean;
  setPartyCode: (code: string | null) => void;
  setIsHost: (isHost: boolean) => void;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

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
