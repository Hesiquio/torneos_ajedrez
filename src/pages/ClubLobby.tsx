import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Calendar, Users } from 'lucide-react';
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
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.5rem' }}>←</Link>
            <Trophy className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title">Lobby del Club</h1>
              <p className="brand-subtitle">Torneos Oficiales Grand Prix</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="card-panel">
            <div className="panel-header">
              <h2 className="card-title">Torneos Activos</h2>
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
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="card-panel">
            <h2 className="card-title">Ranking Global (Grand Prix)</h2>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Jugador</th>
                  <th>Puntos GP</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.name}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{p.grand_prix_points} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
