import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import PartyPage from './components/PartyPage';
import { PartyProvider } from './lib/PartyContext';

const App: React.FC = () => {
  return (
    <Router>
      <PartyProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/party/:partyCode" element={<PartyPage />} />
        </Routes>
      </PartyProvider>
    </Router>
  );
};

export default App;
