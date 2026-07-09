import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PublicLobby from './pages/PublicLobby';
import ClubLobby from './pages/ClubLobby';
import ClubHistory from './pages/ClubHistory';
import PlayerProfile from './pages/PlayerProfile';
import TournamentView from './pages/TournamentView';
import AdminLogin from './pages/AdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminClubDashboard from './pages/AdminClubDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/public" element={<PublicLobby />} />
      <Route path="/club/:clubId" element={<ClubLobby />} />
      <Route path="/club/:clubId/history" element={<ClubHistory />} />
      <Route path="/club/:clubId/player/:playerId" element={<PlayerProfile />} />
      <Route path="/tournament/:id" element={<TournamentView />} />
      
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/super" element={<SuperAdminDashboard />} />
      <Route path="/admin/club/:clubId" element={<AdminClubDashboard />} />
    </Routes>
  );
}

export default App;
