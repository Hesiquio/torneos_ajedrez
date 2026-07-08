import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Calendar, ChevronLeft } from 'lucide-react';
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
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.6rem' }}><ChevronLeft size={20} /></Link>
            <Trophy className="brand-icon" size={36} />
            <div>
              <h1 className="brand-title">Lobby Público</h1>
              <p className="brand-subtitle">Torneos Libres e Informales</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="card-panel">
          <h2 className="card-title">
            <Swords size={24} color="var(--color-info)" /> Torneos Libres Activos
          </h2>
          <div className="tournament-grid">
            {tournaments.map(t => (
              <Link to={`/tournament/${t.id}`} key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <h3 className="tournament-card-title">{t.name}</h3>
                  <span className={`status-badge status-${t.status}`}>
                    {t.status === 'created' ? 'Borrador' : t.status === 'in_progress' ? 'En Curso' : 'Finalizado'}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginTop: 'auto' }}>
                  <Calendar size={16} /> {new Date(t.created_at).toLocaleDateString()} &bull; {t.total_rounds} Rondas
                </div>
              </Link>
            ))}
            {tournaments.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0', gridColumn: '1 / -1' }}>
                No hay torneos libres activos en este momento.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
