import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PublicLobby from './pages/PublicLobby';
import ClubLobby from './pages/ClubLobby';
import TournamentView from './pages/TournamentView';
import AdminLogin from './pages/AdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminClubDashboard from './pages/AdminClubDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/public" element={<PublicLobby />} />
        <Route path="/club/:clubId" element={<ClubLobby />} />
        <Route path="/tournament/:id" element={<TournamentView />} />
        
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/super" element={<SuperAdminDashboard />} />
        <Route path="/admin/club/:clubId" element={<AdminClubDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
