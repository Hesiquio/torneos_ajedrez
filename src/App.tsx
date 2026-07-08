import { Routes, Route } from 'react-router-dom';
import PublicLobby from './pages/PublicLobby';
import ClubLobby from './pages/ClubLobby';
import TournamentView from './pages/TournamentView';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLobby />} />
      <Route path="/club/:clubId" element={<ClubLobby />} />
      <Route path="/tournament/:id" element={<TournamentView />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/super" element={<SuperAdminDashboard />} />
    </Routes>
  );
}

export default App;
