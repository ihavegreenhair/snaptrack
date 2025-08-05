import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface HostAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  partyCode: string;
}

const HostAuthModal: React.FC<HostAuthModalProps> = ({ onClose, onSuccess, partyCode }) => {
  const [hostPassword, setHostPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('set-host', {
        body: { party_code: partyCode, host_password: hostPassword },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        onSuccess();
      } else {
        setError('Invalid password');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Enter Host Password</h2>
        <input
          type="password"
          value={hostPassword}
          onChange={(e) => setHostPassword(e.target.value)}
          className="w-full p-2 border rounded bg-input"
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
          <button onClick={handleAuth} disabled={isLoading} className="px-4 py-2 bg-primary rounded">
            {isLoading ? 'Verifying...' : 'Become Host'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostAuthModal;
