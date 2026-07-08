import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  ChevronLeft, 
  Play, 
  Award,
  Lock,
  Unlock,
  Share2,
  Check,
  RefreshCw
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  status: 'created' | 'in_progress' | 'completed' | 'archived';
  total_rounds: number;
  created_at: string;
}

interface Player {
  id: string;
  name: string;
  age?: number | null;
  grand_prix_points: number;
}

interface Match {
  id: string;
  round_id: string;
  white_player_id: string;
  black_player_id: string;
  result: '1-0' | '0-1' | '0.5-0.5' | null;
  white_player_name: string;
  black_player_name: string;
  round_number: number;
}

interface Standing {
  id: string;
  name: string;
  played: number;
  points: number;
  sb: number;
}

interface Round {
  id: string;
  round_number: number;
  status: 'pending' | 'completed';
}

interface TournamentDetails {
  tournament: Tournament;
  players: Player[]; // these are the checked-in players
  rounds: Round[];
  matches: Match[];
  standings: Standing[];
}

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<Player[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails | null>(null);
  const [showArchivedLobby, setShowArchivedLobby] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentRounds, setNewTournamentRounds] = useState<number>(5);
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');

  const [adminKey, setAdminKey] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminKeyError, setAdminKeyError] = useState('');
  const [copied, setCopied] = useState(false);

  // Check-in state
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  const fetchGlobalPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setGlobalPlayers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTournaments = async (archived = showArchivedLobby) => {
    try {
      const res = await fetch(`/api/tournaments${archived ? '?archived=true' : ''}`);
      const data = await res.json();
      setTournaments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTournamentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTournamentDetails(data);
        const ids = new Set(data.players.map((p: any) => p.id) as string[]);
        setCheckedInIds(ids);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchGlobalPlayers();
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('t');
    if (tId) setSelectedTournamentId(tId);
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      fetchTournamentDetails(selectedTournamentId);
      setAdminKeyError('');
      const savedKey = localStorage.getItem(`admin_key_${selectedTournamentId}`);
      if (savedKey) {
        setAdminKey(savedKey);
        fetch(`/api/tournaments/${selectedTournamentId}/verify-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': savedKey }
        }).then(r => {
          if (r.ok) setIsAdminUnlocked(true);
          else {
            localStorage.removeItem(`admin_key_${selectedTournamentId}`);
            setAdminKey('');
            setIsAdminUnlocked(false);
          }
        }).catch(() => setIsAdminUnlocked(false));
      } else {
        setAdminKey('');
        setIsAdminUnlocked(false);
      }
      const newUrl = `${window.location.origin}${window.location.pathname}?t=${selectedTournamentId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } else {
      setTournamentDetails(null);
      setAdminKey('');
      setIsAdminUnlocked(false);
      const newUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  }, [selectedTournamentId]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || !newTournamentAdminKey.trim()) return;
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTournamentName, totalRounds: newTournamentRounds, adminKey: newTournamentAdminKey.trim() }),
      });
      const data = await res.json();
      localStorage.setItem(`admin_key_${data.id}`, newTournamentAdminKey.trim());
      setSelectedTournamentId(data.id);
      setShowCreateModal(false);
      setNewTournamentName('');
      setNewTournamentRounds(5);
      setNewTournamentAdminKey('');
      fetchTournaments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGlobalPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    try {
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim(), age: newPlayerAge ? parseInt(newPlayerAge) : null })
      });
      setNewPlayerName('');
      setNewPlayerAge('');
      setShowPlayerModal(false);
      fetchGlobalPlayers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckin = async () => {
    if (!selectedTournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ playerIds: Array.from(checkedInIds) })
      });
      if (res.ok) {
        alert('Check-in guardado exitosamente.');
        fetchTournamentDetails(selectedTournamentId);
      } else {
        alert('Error al hacer check-in.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTournament = async () => {
    if (!selectedTournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/start`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) {
        fetchTournamentDetails(selectedTournamentId);
        fetchTournaments();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al iniciar.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextRound = async () => {
    if (!selectedTournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/next-round`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) {
        fetchTournamentDetails(selectedTournamentId);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al generar ronda.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteTournament = async () => {
    if (!selectedTournamentId) return;
    if (!confirm('¿Finalizar torneo y repartir puntos Grand Prix a la liga global? Esta acción es irreversible.')) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/complete`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) {
        fetchTournamentDetails(selectedTournamentId);
        fetchTournaments();
        fetchGlobalPlayers(); // refresh points
      } else {
        alert('Error al finalizar el torneo.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResultChange = async (matchId: string, result: string | null) => {
    if (!selectedTournamentId) return;
    try {
      const formattedResult = result === 'pending' ? null : result;
      const res = await fetch(`/api/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ result: formattedResult }),
      });
      if (res.ok) {
        fetchTournamentDetails(selectedTournamentId);
      } else {
        alert('Error al guardar el resultado.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCheckin = (playerId: string) => {
    const newSet = new Set(checkedInIds);
    if (newSet.has(playerId)) newSet.delete(playerId);
    else newSet.add(playerId);
    setCheckedInIds(newSet);
  };

  const getMatchesByRound = () => {
    if (!tournamentDetails) return {};
    const grouped: { [key: number]: Match[] } = {};
    tournamentDetails.matches.forEach((m) => {
      if (!grouped[m.round_number]) grouped[m.round_number] = [];
      grouped[m.round_number].push(m);
    });
    return grouped;
  };

  const matchesByRound = getMatchesByRound();
  const currentRoundNumber = tournamentDetails && tournamentDetails.rounds.length > 0 
    ? Math.max(...tournamentDetails.rounds.map(r => r.round_number)) 
    : 0;
  
  const currentRoundObj = tournamentDetails?.rounds.find(r => r.round_number === currentRoundNumber);
  const isCurrentRoundCompleted = currentRoundObj?.status === 'completed';

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container" onClick={() => setSelectedTournamentId(null)} style={{ cursor: 'pointer' }}>
          <span className="logo-icon">👑</span>
          <h1 className="logo-text">ChessLeague Grand Prix</h1>
        </div>
        {!selectedTournamentId && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowPlayerModal(true)}>
              <Users size={18} /> Inscribir Jugador
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} /> Crear Torneo Diario
            </button>
          </div>
        )}
      </header>

      <main className="main-content">
        {!selectedTournamentId ? (
          <div>
            <div className="hero-section">
              <h2 className="hero-title">Grand Prix de Ajedrez</h2>
              <p className="hero-subtitle">
                Sistema de liga global. Juega torneos suizos diarios y acumula puntos para la clasificación general.
              </p>
            </div>

            <div className="dashboard-layout">
              {/* Leaderboard Global */}
              <div className="card-panel" style={{ flex: 1 }}>
                <h3 className="card-title"><Award size={20}/> Ranking Global</h3>
                <div className="table-container">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Jugador</th>
                        <th style={{ textAlign: 'right' }}>Pts Liga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalPlayers.map((p, idx) => (
                        <tr key={p.id}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            {p.grand_prix_points}
                          </td>
                        </tr>
                      ))}
                      {globalPlayers.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center' }}>No hay jugadores registrados.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Torneos Diarios */}
              <div style={{ flex: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: 0 }}>
                    <Calendar size={24} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.5rem' }}/> 
                    {showArchivedLobby ? 'Torneos Archivados' : 'Torneos Diarios'}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`btn ${!showArchivedLobby ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setShowArchivedLobby(false); fetchTournaments(false); }}>Activos</button>
                    <button className={`btn ${showArchivedLobby ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setShowArchivedLobby(true); fetchTournaments(true); }}>Archivados</button>
                  </div>
                </div>
                
                {tournaments.length === 0 ? (
                  <div className="card-panel empty-state">
                    <p>No hay torneos creados aún.</p>
                  </div>
                ) : (
                  <div className="tournaments-grid">
                    {tournaments.map((t) => (
                      <div key={t.id} className="tournament-card" onClick={() => setSelectedTournamentId(t.id)}>
                        <div className="tournament-card-header">
                          <h4 className="tournament-title">{t.name}</h4>
                          <span className={`badge badge-${t.status}`}>
                            {t.status === 'created' ? 'Check-in' : t.status === 'in_progress' ? 'En Curso' : 'Finalizado'}
                          </span>
                        </div>
                        <div className="tournament-card-footer">
                          <span>{t.total_rounds} Rondas Suizas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          tournamentDetails && (
            <div>
              <div className="back-link" onClick={() => setSelectedTournamentId(null)}>
                <ChevronLeft size={20} /> Volver
              </div>

              <div className="hero-section" style={{ padding: '2rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="hero-title">{tournamentDetails.tournament.name}</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Formato Suizo a <strong>{tournamentDetails.tournament.total_rounds} Rondas</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?t=${selectedTournamentId}`);
                        setCopied(true); setTimeout(() => setCopied(false), 2000);
                      }}>
                      <Share2 size={16} /> {copied ? 'Copiado' : 'Compartir'}
                    </button>
                    <span className={`badge badge-${tournamentDetails.tournament.status}`}>
                      {tournamentDetails.tournament.status === 'created' ? 'Check-in' : tournamentDetails.tournament.status === 'in_progress' ? 'En Curso' : 'Finalizado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isAdminUnlocked ? <Unlock size={20} color="var(--color-primary)" /> : <Lock size={20} color="var(--color-text-secondary)" />}
                    <span style={{ fontWeight: '600' }}>
                      {isAdminUnlocked ? 'Modo Administrador' : 'Modo Espectador'}
                    </span>
                  </div>
                  {!isAdminUnlocked ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        className="input-text"
                        placeholder="Clave de admin..."
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                      />
                      <button className="btn btn-primary" onClick={async () => {
                        const res = await fetch(`/api/tournaments/${selectedTournamentId}/verify-admin`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }
                        });
                        if (res.ok) { setIsAdminUnlocked(true); localStorage.setItem(`admin_key_${selectedTournamentId}`, adminKey); }
                        else setAdminKeyError('Clave incorrecta');
                      }}>Activar</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary" onClick={() => { setIsAdminUnlocked(false); setAdminKey(''); localStorage.removeItem(`admin_key_${selectedTournamentId}`); }}>Cerrar Admin</button>
                  )}
                </div>
              </div>

              {tournamentDetails.tournament.status === 'created' ? (
                <div className="card-panel">
                  <h3 className="card-title">Check-in de Jugadores</h3>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    Selecciona los jugadores presentes hoy para el sistema Suizo.
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {globalPlayers.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" disabled={!isAdminUnlocked} checked={checkedInIds.has(p.id)} onChange={() => toggleCheckin(p.id)} />
                        {p.name}
                      </label>
                    ))}
                  </div>

                  {isAdminUnlocked && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-secondary" onClick={handleCheckin}>Guardar Check-in</button>
                      <button className="btn btn-primary" disabled={checkedInIds.size < 2} onClick={handleStartTournament}>
                        <Play size={18} /> Generar Ronda 1
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="dashboard-layout">
                  <div style={{ flex: 1 }}>
                    <div className="card-panel">
                      <h3 className="card-title">Clasificación del Día (Suizo)</h3>
                      <table className="standings-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>Pts</th>
                            <th>Buchholz</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tournamentDetails.standings.map((s, idx) => (
                            <tr key={s.id}>
                              <td>{idx + 1}</td>
                              <td>{s.name}</td>
                              <td style={{ fontWeight: 'bold' }}>{s.points}</td>
                              <td>{s.sb}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {isAdminUnlocked && tournamentDetails.tournament.status === 'in_progress' && (
                      <div className="card-panel" style={{ marginTop: '1.5rem' }}>
                        <h3 className="card-title">Siguiente Acción</h3>
                        {currentRoundNumber < tournamentDetails.tournament.total_rounds ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%' }}
                            disabled={!isCurrentRoundCompleted}
                            onClick={handleNextRound}
                          >
                            <RefreshCw size={18} /> Generar Ronda {currentRoundNumber + 1}
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', backgroundColor: 'var(--color-primary)' }}
                            disabled={!isCurrentRoundCompleted}
                            onClick={handleCompleteTournament}
                          >
                            <Check size={18} /> Finalizar y Repartir Puntos GP
                          </button>
                        )}
                        {!isCurrentRoundCompleted && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-accent-red)', marginTop: '0.5rem', textAlign: 'center' }}>
                            Termina la ronda actual para continuar.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1.5 }}>
                    <div className="card-panel">
                      <h3 className="card-title">Emparejamientos (Ronda {currentRoundNumber} de {tournamentDetails.tournament.total_rounds})</h3>
                      <div className="matches-list">
                        {(matchesByRound[currentRoundNumber] || []).map(m => (
                          <div key={m.id} className="match-card">
                            <div className="match-players">
                              <div className="match-player white-player">
                                <span className="piece-icon">♙</span> {m.white_player_name}
                              </div>
                              <div className="match-vs">vs</div>
                              <div className="match-player black-player">
                                {m.black_player_name} <span className="piece-icon" style={{color: '#000'}}>♟</span>
                              </div>
                            </div>
                            {isAdminUnlocked && m.black_player_id !== 'BYE' && tournamentDetails.tournament.status !== 'completed' ? (
                              <div className="match-actions">
                                <select
                                  className="result-select"
                                  value={m.result || 'pending'}
                                  onChange={(e) => handleResultChange(m.id, e.target.value)}
                                >
                                  <option value="pending">Pendiente...</option>
                                  <option value="1-0">Gana Blancas</option>
                                  <option value="0-1">Gana Negras</option>
                                  <option value="0.5-0.5">Tablas</option>
                                </select>
                              </div>
                            ) : (
                              <div className="match-result-badge">
                                {m.black_player_id === 'BYE' ? 'Descanso (Bye)' : m.result === '1-0' ? '1 - 0' : m.result === '0-1' ? '0 - 1' : m.result === '0.5-0.5' ? '½ - ½' : 'Pendiente'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Modals for Create Tournament & Player */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Crear Torneo del Día</h3>
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Nombre del Torneo</label>
                <input type="text" className="input-text" required value={newTournamentName} onChange={e => setNewTournamentName(e.target.value)} placeholder="Ej. Torneo Semana 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Número de Rondas (Suizo)</label>
                <input type="number" className="input-text" min="1" max="15" required value={newTournamentRounds} onChange={e => setNewTournamentRounds(parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Clave de Administración</label>
                <input type="password" className="input-text" required value={newTournamentAdminKey} onChange={e => setNewTournamentAdminKey(e.target.value)} placeholder="Contraseña..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlayerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Inscribir Jugador a la Liga Global</h3>
            <form onSubmit={handleCreateGlobalPlayer}>
              <div className="form-group">
                <label className="form-label">Nombre del Jugador</label>
                <input type="text" className="input-text" required value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Edad (opcional)</label>
                <input type="number" className="input-text" value={newPlayerAge} onChange={e => setNewPlayerAge(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPlayerModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Inscribir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
