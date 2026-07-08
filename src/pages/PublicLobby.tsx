import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicLobby() {
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/tournaments?club_id=null').then(setTournaments).catch(console.error);
  }, []);

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Trophy className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title">Lobby Público</h1>
              <p className="brand-subtitle">Torneos Libres</p>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/admin" className="btn btn-secondary">Panel de Control</Link>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="card-panel">
          <div className="panel-header">
            <h2 className="card-title">Torneos Libres Activos</h2>
          </div>
          <div className="tournament-grid">
            {tournaments.map(t => (
              <Link to={`/tournament/${t.id}`} key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <h3 className="tournament-card-title">{t.name}</h3>
                  <span className={`status-badge status-${t.status}`}>
                    {t.status === 'created' ? 'Borrador' : t.status === 'in_progress' ? 'En Curso' : 'Finalizado'}
                  </span>
                </div>
                <div className="tournament-card-body">
                  <div className="tournament-stat">
                    <Swords size={16} /> <span>{t.total_rounds} Rondas (Suizo)</span>
                  </div>
                  <div className="tournament-stat">
                    <Calendar size={16} /> <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
            {tournaments.length === 0 && (
              <div className="empty-state">
                No hay torneos libres activos.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
