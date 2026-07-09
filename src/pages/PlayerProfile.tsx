import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { ChevronLeft, Trophy, Calendar, User, Award, Shield } from 'lucide-react';
import { getPlayerRank, CHESS_RANKS } from '../utils/ranks';

export default function PlayerProfile() {
  const { clubId, playerId } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi(`/players/${playerId}/profile`),
      fetchApi(`/players/${playerId}/history`)
    ])
      .then(([pData, hData]) => {
        setPlayer(pData);
        setHistory(hData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return <div className="layout-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando Perfil...</div>;
  }

  if (!player) {
    return (
      <div className="layout-container" style={{ justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <p>Jugador no encontrado.</p>
        <Link to={`/club/${clubId}`} className="btn btn-primary">Volver al Club</Link>
      </div>
    );
  }

  const gpPoints = player.grand_prix_points || 0;
  const currentRank = getPlayerRank(gpPoints);
  
  // Calculate next rank & progress
  const currentRankIndex = CHESS_RANKS.findIndex(r => r.name === currentRank.name);
  const nextRank = currentRankIndex < CHESS_RANKS.length - 1 ? CHESS_RANKS[currentRankIndex + 1] : null;
  
  let progressPercent = 100;
  let pointsNeeded = 0;
  if (nextRank) {
    const rangeTotal = nextRank.minPoints - currentRank.minPoints;
    const rangeCurrent = gpPoints - currentRank.minPoints;
    progressPercent = Math.min(100, Math.max(0, (rangeCurrent / rangeTotal) * 100));
    pointsNeeded = nextRank.minPoints - gpPoints;
  }

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to={`/club/${clubId}`} className="btn btn-secondary" style={{ padding: '0.6rem' }}>
              <ChevronLeft size={20} />
            </Link>
            <User className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{player.name}</h1>
              <p className="brand-subtitle">Expediente del Jugador</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        
        {/* Left Side: Stats & Ranks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignSelf: 'flex-start' }}>
          <div className="card-panel">
            <h2 className="card-title">Categoría & Puntos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0', gap: '1rem' }}>
              <div style={{
                fontSize: '4rem',
                lineHeight: '1',
                padding: '1.5rem',
                borderRadius: '50%',
                background: currentRank.bg,
                border: `2px dashed ${currentRank.color}`,
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 30px ${currentRank.bg}`
              }}>
                {currentRank.icon}
              </div>

              <div>
                <h3 style={{ fontSize: '1.4rem', color: currentRank.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {currentRank.name}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Rango Actual del Club
                </p>
              </div>

              <div style={{ display: 'flex', gap: '2rem', width: '100%', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)' }}>{gpPoints}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Puntos GP</div>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>{player.age || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Edad (Años)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress to Next Rank */}
          {nextRank && (
            <div className="card-panel">
              <h2 className="card-title" style={{ fontSize: '1.2rem' }}>Próximo Rango</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Progreso al siguiente nivel</span>
                <span style={{ fontWeight: '700', color: nextRank.color }}>{nextRank.icon} {nextRank.name}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: `linear-gradient(90deg, var(--color-primary), ${nextRank.color})`, borderRadius: '4px', transition: 'width 0.4s' }} />
              </div>
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Faltan <strong>{pointsNeeded} pts GP</strong> para ascender.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Game History */}
        <div style={{ flex: 1.5 }}>
          <div className="card-panel">
            <h2 className="card-title">Historial de Partidas</h2>
            <div className="table-wrapper">
              <table className="standings-table table-compact">
                <thead>
                  <tr>
                    <th>Torneo</th>
                    <th>Color</th>
                    <th>Rival</th>
                    <th style={{ textAlign: 'center' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? history.map(m => {
                    const isWhite = m.white_player_id === playerId;
                    const opponent = isWhite ? m.black_player_name : m.white_player_name;
                    
                    let outcome: 'win' | 'loss' | 'draw' = 'draw';
                    if (m.result === '1-0') outcome = isWhite ? 'win' : 'loss';
                    else if (m.result === '0-1') outcome = isWhite ? 'loss' : 'win';

                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600' }}>{m.tournament_name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Jornada {m.round_number} &bull; {new Date(m.tournament_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontSize: '1rem', fontWeight: 'bold' }}>
                          {isWhite ? <span title="Piezas Blancas">♙ B</span> : <span title="Piezas Negras" style={{ color: 'var(--color-text-secondary)' }}>♟ N</span>}
                        </td>
                        <td style={{ verticalAlign: 'middle', textTransform: 'uppercase', fontSize: '0.85rem' }}>{opponent}</td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            background: outcome === 'win'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : outcome === 'loss'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                            color: outcome === 'win'
                              ? 'var(--color-success)'
                              : outcome === 'loss'
                              ? 'var(--color-danger)'
                              : 'var(--color-text-secondary)'
                          }}>
                            {outcome === 'win' ? 'Victoria' : outcome === 'loss' ? 'Derrota' : 'Tablas'}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                        Sin partidas registradas todavía.
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
