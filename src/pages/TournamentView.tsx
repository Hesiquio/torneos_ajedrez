import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { Lock, Unlock, ChevronLeft, RefreshCw, Check, AlertTriangle, ShieldCheck, Trophy, Plus, Eye, EyeOff } from 'lucide-react';
import { getPlayerRank } from '../utils/ranks';

export default function TournamentView() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [adminKey, setAdminKey] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [viewingRound, setViewingRound] = useState<number | null>(null);

  // New Player Form States
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [showUnlockKey, setShowUnlockKey] = useState(false);

  useEffect(() => {
    loadTournament();
    checkAutoUnlock();
  }, [id]);

  async function checkAutoUnlock() {
    try {
      await fetchApi(`/tournaments/${id}/verify-admin`, { method: 'POST', body: '{}' });
      setIsAdminUnlocked(true);
    } catch(e) {}
  }

  async function loadTournament() {
    try {
      const res = await fetchApi(`/tournaments/${id}`);
      setData(res);
      if (res.tournament.status === 'created') {
        // Load players from the club (or global players if no club)
        const clubParam = res.tournament.club_id ? res.tournament.club_id : 'null';
        const pRes = await fetchApi(`/players?club_id=${clubParam}`);
        setAllPlayers(pRes);
        const set = new Set<string>();
        res.players.forEach((p:any) => set.add(p.id));
        setSelectedPlayerIds(set);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreatePlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    if (isCreatingPlayer) return;
    setIsCreatingPlayer(true);
    try {
      const p = await fetchApi('/players', {
        method: 'POST',
        body: JSON.stringify({
          name: newPlayerName,
          age: newPlayerAge || null,
          clubId: data?.tournament?.club_id || null
        })
      });
      // Refresh players list
      const clubParam = data?.tournament?.club_id ? data.tournament.club_id : 'null';
      const pRes = await fetchApi(`/players?club_id=${clubParam}`);
      setAllPlayers(pRes);
      
      // Auto check-in
      const newSet = new Set(selectedPlayerIds);
      newSet.add(p.id);
      setSelectedPlayerIds(newSet);
      
      setNewPlayerName('');
      setNewPlayerAge('');
    } catch(err: any) {
      alert(err.message);
    } finally {
      setIsCreatingPlayer(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchApi(`/tournaments/${id}/verify-admin`, {
        method: 'POST',
        body: JSON.stringify({ adminKey })
      });
      setIsAdminUnlocked(true);
    } catch (e) {
      alert('Clave incorrecta');
    }
  }

  async function handleAction(action: string, payload: any = {}) {
    try {
      await fetchApi(`/tournaments/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, adminKey })
      });
      loadTournament();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleResult(matchId: string, result: string) {
    try {
      await fetchApi(`/matches/${matchId}/result`, {
        method: 'POST',
        body: JSON.stringify({ result, adminKey })
      });
      loadTournament();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (!data) return <div className="layout-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando Torneo...</div>;

  const t = data.tournament;
  const lastRound = data.rounds.length > 0 ? data.rounds[data.rounds.length - 1] : null;
  // viewingRound null means "show the last/current round"
  const currentRoundNum = viewingRound ?? lastRound?.round_number ?? 1;
  const matchesByRound = data.matches.reduce((acc: any, m: any) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {});

  const currentRoundMatches = matchesByRound[currentRoundNum] ?? [];
  const lastRoundMatches = matchesByRound[lastRound?.round_number] ?? [];
  const isCurrentRoundCompleted = lastRoundMatches.every((m: any) => m.is_bye === 1 || m.result !== null);
  const isViewingLast = currentRoundNum === lastRound?.round_number;

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to={t.club_id ? `/club/${t.club_slug || t.club_id}` : '/public'} className="btn btn-secondary" style={{ padding: '0.6rem' }}>
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>{t.name}</h1>
              <p className="brand-subtitle">{t.is_grand_prix === 1 ? 'Oficial Grand Prix' : 'Torneo Libre'} &bull; {t.total_rounds} Rondas</p>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
              {!isAdminUnlocked ? (
              <form onSubmit={handleUnlock} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', position: 'relative', alignItems: 'center' }}>
                  <input 
                    type={showUnlockKey ? "text" : "password"} 
                    placeholder="Clave de Árbitro" 
                    className="input-text" 
                    style={{ padding: '0.5rem 2.5rem 0.5rem 1rem', width: '200px' }} 
                    value={adminKey} 
                    onChange={e => setAdminKey(e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowUnlockKey(!showUnlockKey)} 
                    style={{ 
                      position: 'absolute', 
                      right: '0.6rem', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-text-secondary)', 
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showUnlockKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showUnlockKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" className="btn btn-primary" title="Desbloquear panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem 0.8rem' }}>
                  <Unlock size={18} />
                </button>
              </form>
            ) : (
              <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} /> Árbitro Activo
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="main-content" style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        
        {/* Left Side: Controls & Standings */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {isAdminUnlocked && t.status === 'in_progress' && (
            <div className="card-panel" style={{ border: '1px solid var(--color-primary)', background: 'linear-gradient(180deg, rgba(226,184,92,0.05), transparent)' }}>
              <h2 className="card-title" style={{ fontSize: '1.25rem', borderColor: 'rgba(226,184,92,0.2)', color: 'var(--color-primary)' }}>
                <AlertTriangle size={20} /> Controles del Árbitro
              </h2>
              {lastRound?.round_number < t.total_rounds ? (
                <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} disabled={!isCurrentRoundCompleted} onClick={() => handleAction('next-round')}>
                  <RefreshCw size={20} /> Generar Ronda {lastRound.round_number + 1}
                </button>
              ) : (
                <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'var(--color-success)' }} disabled={!isCurrentRoundCompleted} onClick={() => handleAction('complete')}>
                  <Check size={20} /> Finalizar Torneo
                </button>
              )}
              {!isCurrentRoundCompleted && (
                <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Faltan partidas por reportar en la ronda actual.
                </p>
              )}
            </div>
          )}

          <div className="card-panel" style={{ alignSelf: 'flex-start' }}>
            <h2 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Tabla de Posiciones</h2>
            <div className="table-wrapper">
              <table className="standings-table table-compact">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>Pos</th>
                    <th>Jugador</th>
                    <th>Pts</th>
                    <th>BUCH</th>
                    {t.status === 'completed' && t.is_grand_prix === 1 && (
                      <th style={{ color: 'var(--color-primary)', textAlign: 'center', width: '70px' }}>🏆 GP</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((s:any, idx:number) => {
                    const GP_MAP = [10, 8, 6, 4, 2];
                    const gpEarned = idx < GP_MAP.length ? GP_MAP[idx] : 2;
                    
                    // Find matching player details to retrieve their Grand Prix points
                    const plDetails = data.players?.find((x: any) => x.id === s.id);
                    const gpPoints = plDetails ? plDetails.grand_prix_points : 0;
                    const rankInfo = getPlayerRank(gpPoints);

                    return (
                      <tr key={s.id}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td style={{ textTransform: 'uppercase', letterSpacing: '0.3px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{s.name}</span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              letterSpacing: '0.5px',
                              color: rankInfo.color,
                              background: rankInfo.bg,
                              padding: '0.05rem 0.35rem',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}>
                              {rankInfo.icon} {rankInfo.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-primary)', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '0.95rem' }}>{s.points}</td>
                        <td style={{ color: 'var(--color-text-secondary)', verticalAlign: 'middle', fontSize: '0.85rem' }}>{s.sb}</td>
                        {t.status === 'completed' && t.is_grand_prix === 1 && (
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              background: idx < 3
                                ? 'rgba(226,184,92,0.18)'
                                : 'rgba(255,255,255,0.06)',
                              color: idx < 3
                                ? 'var(--color-primary)'
                                : 'var(--color-text-secondary)',
                            }}>
                              +{gpEarned}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Matches / Check-in */}
        <div style={{ flex: 1.5, minWidth: '320px' }}>
          {t.status === 'created' ? (
            <div className="card-panel">
              <h2 className="card-title">Inscripción (Check-in)</h2>
              
              {isAdminUnlocked && (
                <form onSubmit={handleCreatePlayer} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <input 
                      type="text" 
                      placeholder="Registrar nuevo jugador..." 
                      className="input-text" 
                      required 
                      value={newPlayerName} 
                      onChange={e => setNewPlayerName(e.target.value)} 
                      style={{ padding: '0.5rem 0.8rem', width: '100%', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ width: '80px' }}>
                    <input 
                      type="number" 
                      placeholder="Edad" 
                      className="input-text" 
                      value={newPlayerAge} 
                      onChange={e => setNewPlayerAge(e.target.value)} 
                      style={{ padding: '0.5rem 0.8rem', width: '100%', fontSize: '0.9rem' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={isCreatingPlayer}>
                    <Plus size={16} /> {isCreatingPlayer ? 'Registrando...' : 'Agregar'}
                  </button>
                </form>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                {allPlayers.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-light)', cursor: isAdminUnlocked ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={selectedPlayerIds.has(p.id)} onChange={(e) => {
                      const newSet = new Set(selectedPlayerIds);
                      e.target.checked ? newSet.add(p.id) : newSet.delete(p.id);
                      setSelectedPlayerIds(newSet);
                    }} disabled={!isAdminUnlocked} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '1.1rem' }}>{p.name}</span>
                  </label>
                ))}
              </div>
              {isAdminUnlocked && (
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => handleAction('checkin', { playerIds: Array.from(selectedPlayerIds) })}>
                    Guardar Selección
                  </button>
                  <button className="btn btn-primary" onClick={() => handleAction('start')}>
                    <Trophy size={18} /> Iniciar Ronda 1
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card-panel">
              {/* Round Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className="card-title" style={{ fontSize: '1.35rem', borderBottom: 'none', margin: 0, padding: 0 }}>
                  Emparejamientos &bull; Ronda {currentRoundNum} de {t.total_rounds}
                </h2>
                {data.rounds.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.375rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '0.3rem', border: '1px solid var(--border-light)' }}>
                    {data.rounds.map((r: any) => (
                      <button
                        key={r.round_number}
                        onClick={() => setViewingRound(r.round_number)}
                        style={{
                          minWidth: '36px', height: '36px',
                          borderRadius: '8px', border: 'none',
                          cursor: 'pointer',
                          fontWeight: '700', fontSize: '0.9rem',
                          fontFamily: 'var(--font-sans)',
                          transition: 'all 0.2s ease',
                          background: currentRoundNum === r.round_number
                            ? 'linear-gradient(135deg, rgba(226,184,92,0.3), rgba(240,203,118,0.15))'
                            : 'transparent',
                          color: currentRoundNum === r.round_number
                            ? 'var(--color-primary)'
                            : 'var(--color-text-secondary)',
                          boxShadow: currentRoundNum === r.round_number
                            ? '0 2px 8px rgba(226,184,92,0.2)'
                            : 'none',
                        }}
                      >
                        {r.round_number}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }} />
              <div className="matches-list">
                {currentRoundMatches?.map((m:any) => (
                  <div key={m.id} className="match-card">
                    <div className="match-players">
                      <div className="match-player white">
                        <span className="piece-icon white">♙</span> {m.white_player_name}
                      </div>
                      <div className="match-vs">vs</div>
                      <div className="match-player black">
                        {m.black_player_name} <span className="piece-icon black">♟</span>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 -1.25rem', paddingTop: '1rem', paddingInline: '1.25rem' }}>
                      {isAdminUnlocked && m.is_bye === 0 && t.status === 'in_progress' && isViewingLast ? (
                        <select className="result-select" value={m.result || 'pending'} onChange={(e) => handleResult(m.id, e.target.value)}>
                          <option value="pending" disabled hidden>Seleccionar Resultado...</option>
                          <option value="1-0">Ganan Blancas (1-0)</option>
                          <option value="0-1">Ganan Negras (0-1)</option>
                          <option value="0.5-0.5">Tablas (½-½)</option>
                        </select>
                      ) : (
                        <div className="match-result-badge">
                          {m.is_bye === 1 ? 'Descanso Automático (Bye)' : 
                           m.result === '1-0' ? 'Victoria Blancas (1 - 0)' :
                           m.result === '0-1' ? 'Victoria Negras (0 - 1)' :
                           m.result === '0.5-0.5' ? 'Tablas (½ - ½)' :
                           'Partida en curso...'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {currentRoundMatches?.length === 0 && (
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>Sin emparejamientos en esta ronda.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
