import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { Lock, Unlock, ArrowLeft, RefreshCw, Check, CheckSquare } from 'lucide-react';

export default function TournamentView() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [adminKey, setAdminKey] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

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
        const pRes = await fetchApi(`/players?club_id=${res.tournament.club_id || 'null'}`);
        setAllPlayers(pRes);
        const set = new Set<string>();
        res.players.forEach((p:any) => set.add(p.id));
        setSelectedPlayerIds(set);
      }
    } catch (e) {
      console.error(e);
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

  if (!data) return <div>Loading...</div>;

  const t = data.tournament;
  const currentRound = data.rounds.length > 0 ? data.rounds[data.rounds.length - 1] : null;
  const matchesByRound = data.matches.reduce((acc: any, m: any) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {});

  const currentRoundMatches = currentRound ? matchesByRound[currentRound.round_number] : [];
  const isCurrentRoundCompleted = currentRoundMatches?.every((m: any) => m.is_bye === 1 || m.result !== null);

  return (
    <div className="layout-container">
      <header className="main-header" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to={t.club_id ? `/club/${t.club_id}` : '/'} className="btn btn-secondary">
          <ArrowLeft size={18} /> Volver
        </Link>
        <div>
          <h1 className="brand-title">{t.name}</h1>
          <p className="brand-subtitle">{t.is_grand_prix === 1 ? 'Oficial Grand Prix' : 'Torneo Libre'}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {!isAdminUnlocked ? (
            <form onSubmit={handleUnlock} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="password" placeholder="Clave..." className="input-text" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
              <button type="submit" className="btn btn-primary"><Unlock size={16} /></button>
            </form>
          ) : (
            <span className="status-badge" style={{ backgroundColor: 'var(--color-accent-green)', color: '#fff' }}><Lock size={16} /> Árbitro Activo</span>
          )}
        </div>
      </header>

      <main className="main-content">
        {t.status === 'created' ? (
          <div className="card-panel">
            <h2>Check-in de Jugadores</h2>
            <div className="tournament-grid">
              {allPlayers.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                  <input type="checkbox" checked={selectedPlayerIds.has(p.id)} onChange={(e) => {
                    const newSet = new Set(selectedPlayerIds);
                    e.target.checked ? newSet.add(p.id) : newSet.delete(p.id);
                    setSelectedPlayerIds(newSet);
                  }} disabled={!isAdminUnlocked} />
                  {p.name}
                </label>
              ))}
            </div>
            {isAdminUnlocked && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => handleAction('checkin', { playerIds: Array.from(selectedPlayerIds) })}>Guardar Check-in</button>
                <button className="btn btn-primary" onClick={() => handleAction('start')}>Iniciar Torneo</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div className="card-panel">
                <h2>Clasificación (Suizo)</h2>
                <table className="standings-table">
                  <thead><tr><th>#</th><th>Jugador</th><th>Pts</th><th>Buchholz</th></tr></thead>
                  <tbody>
                    {data.standings.map((s:any, idx:number) => (
                      <tr key={s.id}><td>{idx + 1}</td><td>{s.name}</td><td>{s.points}</td><td>{s.sb}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdminUnlocked && t.status === 'in_progress' && (
                <div className="card-panel" style={{ marginTop: '1rem' }}>
                  {currentRound?.round_number < t.total_rounds ? (
                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={!isCurrentRoundCompleted} onClick={() => handleAction('next-round')}>
                      Generar Ronda {currentRound.round_number + 1}
                    </button>
                  ) : (
                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={!isCurrentRoundCompleted} onClick={() => handleAction('complete')}>
                      Finalizar Torneo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ flex: 1.5, minWidth: '300px' }}>
              <div className="card-panel">
                <h2>Ronda Actual ({currentRound?.round_number} de {t.total_rounds})</h2>
                <div className="matches-list">
                  {currentRoundMatches?.map((m:any) => (
                    <div key={m.id} className="match-card">
                      <div className="match-players">
                        <div className="match-player">{m.white_player_name}</div>
                        <div className="match-vs">vs</div>
                        <div className="match-player">{m.black_player_name}</div>
                      </div>
                      {isAdminUnlocked && m.is_bye === 0 && t.status === 'in_progress' ? (
                        <select className="result-select" value={m.result || 'pending'} onChange={(e) => handleResult(m.id, e.target.value)}>
                          <option value="pending">Pendiente...</option>
                          <option value="1-0">Gana Blancas</option>
                          <option value="0-1">Gana Negras</option>
                          <option value="0.5-0.5">Tablas</option>
                        </select>
                      ) : (
                        <div className="match-result-badge">
                          {m.is_bye === 1 ? 'Descanso' : m.result || 'Pendiente'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
