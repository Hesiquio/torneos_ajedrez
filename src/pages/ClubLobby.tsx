import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Crown, ChevronLeft, Calendar } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function ClubLobby() {
  const { clubId } = useParams();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetchApi(`/tournaments?club_id=${clubId}`).then(setTournaments).catch(console.error);
    fetchApi(`/players?club_id=${clubId}`).then(setPlayers).catch(console.error);
  }, [clubId]);

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.6rem' }}><ChevronLeft size={20} /></Link>
            <Trophy className="brand-icon" size={36} />
            <div>
              <h1 className="brand-title">Lobby del Club</h1>
              <p className="brand-subtitle">Torneos Oficiales Grand Prix</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        
        {/* Lado Izquierdo: Torneos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="card-panel">
            <h2 className="card-title">
              <Swords size={24} color="var(--color-primary)" /> Torneos Activos
            </h2>
            <div className="tournament-grid" style={{ gridTemplateColumns: '1fr' }}>
              {tournaments.length > 0 ? tournaments.map(t => (
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
              )) : (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No hay torneos activos en este club.</p>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Ranking */}
        <div>
          <div className="card-panel" style={{ background: 'linear-gradient(180deg, rgba(226, 184, 92, 0.05), transparent)' }}>
            <h2 className="card-title" style={{ borderColor: 'rgba(226, 184, 92, 0.2)' }}>
              <Crown size={24} color="var(--color-primary)" /> Ranking Global (GP)
            </h2>
            <div className="table-wrapper">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>Pos</th>
                    <th>Jugador</th>
                    <th style={{ textAlign: 'right' }}>Puntos GP</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length > 0 ? players.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {i === 0 ? <span className="rank-medal" title="Oro">🥇</span> :
                         i === 1 ? <span className="rank-medal" title="Plata">🥈</span> :
                         i === 2 ? <span className="rank-medal" title="Bronce">🥉</span> :
                         <span style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>}
                      </td>
                      <td style={{ fontWeight: i < 3 ? '600' : '400', color: i < 3 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                        {p.name}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                        {p.grand_prix_points} pts
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                        Aún no hay jugadores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
