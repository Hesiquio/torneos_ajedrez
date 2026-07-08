import React, { useEffect, useState } from 'react';
import { fetchApi, logout } from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [publicTournaments, setPublicTournaments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentRounds, setNewTournamentRounds] = useState(5);
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const cRes = await fetchApi('/admin/clubs');
      setClubs(cRes);
      const tRes = await fetchApi('/tournaments?club_id=null');
      setPublicTournaments(tRes);
    } catch (e) {
      console.error(e);
      navigate('/admin');
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchApi('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name: newTournamentName,
          totalRounds: newTournamentRounds,
          adminKey: newTournamentAdminKey,
          clubId: null,
          isGrandPrix: false
        })
      });
      setShowCreateModal(false);
      loadData();
    } catch(err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="layout-container">
      <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1 className="brand-title">Super Admin Dashboard</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>Cerrar Sesión</button>
      </header>

      <main className="main-content" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="card-panel">
            <h2>Clubes Registrados</h2>
            <ul>
              {clubs.map(c => (
                <li key={c.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd' }}>
                  <strong>{c.name}</strong>
                  <br />
                  <Link to={`/club/${c.id}`} style={{ color: 'var(--color-primary)' }}>Ver Lobby</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="card-panel">
            <h2>Torneos Públicos (Libres)</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginBottom: '1rem' }}>+ Crear Torneo Libre</button>
            <ul>
              {publicTournaments.map(t => (
                <li key={t.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd' }}>
                  <strong>{t.name}</strong> - {t.status}
                  <br />
                  <Link to={`/tournament/${t.id}`} style={{ color: 'var(--color-primary)' }}>Ver Torneo</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Crear Torneo Libre</h3>
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Nombre del Torneo</label>
                <input type="text" className="input-text" required value={newTournamentName} onChange={e => setNewTournamentName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Número de Rondas</label>
                <input type="number" className="input-text" min="1" max="15" required value={newTournamentRounds} onChange={e => setNewTournamentRounds(parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Clave de Árbitro</label>
                <input type="password" className="input-text" required value={newTournamentAdminKey} onChange={e => setNewTournamentAdminKey(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
