import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Crown, ChevronLeft, Calendar, History, Settings } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function ClubLobby() {
  const { clubId } = useParams();
  const [club, setClub] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/clubs').then((clubs: any[]) => {
      const c = clubs.find((x: any) => x.id === clubId);
      if (c) setClub(c);
    }).catch(console.error);
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
              <h1 className="brand-title">{club?.name || 'Lobby del Club'}</h1>
              <p className="brand-subtitle">Torneos Oficiales Grand Prix</p>
            </div>
          </div>
          <Link to={`/admin/club/${clubId}`} className="btn btn-secondary" style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', opacity: 0.5 }} title="Panel de Administrador">
            <Settings size={16} />
          </Link>
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
                  {players.length > 0 ? (() => {
                    // Build tied ranking: players with same GP share the same rank
                    let rank = 1;
                    return players.map((p, i) => {
                      if (i > 0 && p.grand_prix_points < players[i - 1].grand_prix_points) {
                        rank = i + 1; // jump rank by how many tied above
                      }
                      const currentRank = rank;
                      const isTop3 = currentRank <= 3;
                      return (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            {currentRank === 1 ? <span className="rank-medal" title="Oro">🥇</span> :
                             currentRank === 2 ? <span className="rank-medal" title="Plata">🥈</span> :
                             currentRank === 3 ? <span className="rank-medal" title="Bronce">🥉</span> :
                             <span style={{ color: 'var(--color-text-muted)' }}>{currentRank}</span>}
                          </td>
                          <td style={{ fontWeight: isTop3 ? '600' : '400', color: isTop3 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                            {p.name}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                            {p.grand_prix_points} pts
                          </td>
                        </tr>
                      );
                    });
                  })() : (
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

        {/* Historial de Partidas - Botón a página aparte */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Link
            to={`/club/${clubId}/history`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem 2rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-light)',
              borderRadius: '20px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.3s ease',
            }}
            className="tournament-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <History size={28} color="var(--color-info)" />
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: '700' }}>Historial de Resultados</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Ver todas las partidas oficiales del club por torneo y jornada</div>
              </div>
            </div>
            <ChevronLeft size={20} style={{ transform: 'rotate(180deg)', color: 'var(--color-text-muted)' }} />
          </Link>
        </div>

      </main>
    </div>
  );
}
