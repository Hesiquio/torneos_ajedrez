import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  ChevronLeft, 
  Play, 
  CheckCircle, 
  UserPlus, 
  Hourglass,
  Award,
  Lock,
  Unlock,
  Key,
  Share2,
  Edit2,
  X,
  Check,
  RotateCcw,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  type: 'single' | 'double';
  status: 'created' | 'in_progress' | 'completed';
  created_at: string;
}

interface Player {
  id: string;
  name: string;
  age?: number | null;
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
  won: number;
  drawn: number;
  lost: number;
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
  players: Player[];
  rounds: Round[];
  matches: Match[];
  standings: Standing[];
}

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'players'>('standings');
  const [showArchivedLobby, setShowArchivedLobby] = useState(false);
  
  // Modals / Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentType, setNewTournamentType] = useState<'single' | 'double'>('double');
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  // Admin Security States
  const [adminKey, setAdminKey] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [verifyingAdminKey, setVerifyingAdminKey] = useState(false);
  const [adminKeyError, setAdminKeyError] = useState('');
  
  // Sharing feedback state
  const [copied, setCopied] = useState(false);

  // Inline editing player states
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [editingPlayerAge, setEditingPlayerAge] = useState('');

  // Backup / Restore states
  const [exporting, setExporting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreAdminKey, setRestoreAdminKey] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Fetch all tournaments (active or archived)
  const fetchTournaments = async (archived = showArchivedLobby) => {
    try {
      const res = await fetch(`/api/tournaments${archived ? '?archived=true' : ''}`);
      const data = await res.json();
      setTournaments(data);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    }
  };

  // Fetch selected tournament details
  const fetchTournamentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const data = await res.json();
      setTournamentDetails(data);
    } catch (err) {
      console.error('Error fetching tournament details:', err);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // Parse URL parameter ?t=xxxx to load a shared tournament directly on page load
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('t');
    if (tournamentId) {
      setSelectedTournamentId(tournamentId);
    }
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      fetchTournamentDetails(selectedTournamentId);
      setAdminKeyError('');
      // Auto unlock admin key if saved in localStorage — verify with server first
      const savedKey = localStorage.getItem(`admin_key_${selectedTournamentId}`);
      if (savedKey) {
        setAdminKey(savedKey);
        // Silently verify stored key against the server
        fetch(`/api/tournaments/${selectedTournamentId}/verify-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': savedKey }
        }).then(r => {
          if (r.ok) {
            setIsAdminUnlocked(true);
          } else {
            // Key stored locally is no longer valid (e.g. changed on server)
            localStorage.removeItem(`admin_key_${selectedTournamentId}`);
            setAdminKey('');
            setIsAdminUnlocked(false);
          }
        }).catch(() => {
          // Network error: keep key in state but don't unlock
          setIsAdminUnlocked(false);
        });
      } else {
        setAdminKey('');
        setIsAdminUnlocked(false);
      }
      // Update URL search parameters without page reload
      const newUrl = `${window.location.origin}${window.location.pathname}?t=${selectedTournamentId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } else {
      setTournamentDetails(null);
      setAdminKey('');
      setIsAdminUnlocked(false);
      // Clear URL search parameters without page reload
      const newUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  }, [selectedTournamentId]);

  // Copy share link helper
  const handleCopyLink = () => {
    if (!selectedTournamentId) return;
    const url = `${window.location.origin}${window.location.pathname}?t=${selectedTournamentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Create new tournament
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || !newTournamentAdminKey.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTournamentName, 
          type: newTournamentType,
          adminKey: newTournamentAdminKey.trim() 
        }),
      });
      const data = await res.json();
      
      // Auto-save key to localStorage for the creator
      localStorage.setItem(`admin_key_${data.id}`, newTournamentAdminKey.trim());
      
      setSelectedTournamentId(data.id);
      setShowCreateModal(false);
      setNewTournamentName('');
      setNewTournamentAdminKey('');
      fetchTournaments();
    } catch (err) {
      console.error('Error creating tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !selectedTournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/players`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ 
          name: newPlayerName.trim(), 
          age: newPlayerAge ? parseInt(newPlayerAge) : null 
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Error al agregar jugador');
        return;
      }
      setNewPlayerName('');
      setNewPlayerAge('');
      fetchTournamentDetails(selectedTournamentId);
      fetchTournaments();
    } catch (err) {
      console.error('Error adding player:', err);
    }
  };

  // Export players to JSON
  const handleExportPlayers = () => {
    if (!tournamentDetails || tournamentDetails.players.length === 0) return;
    const exportData = tournamentDetails.players.map(p => ({
      name: p.name,
      age: p.age
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `jugadores_${tournamentDetails.tournament.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Import players from JSON
  const handleImportPlayers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedTournamentId) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          alert('El archivo JSON debe contener un arreglo de jugadores.');
          return;
        }
        const res = await fetch(`/api/tournaments/${selectedTournamentId}/players/bulk`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': adminKey
          },
          body: JSON.stringify({ players: json })
        });
        if (!res.ok) {
          const errData = await res.json();
          alert(errData.error || 'Error al importar jugadores');
          return;
        }
        fetchTournamentDetails(selectedTournamentId);
        fetchTournaments();
        alert('Jugadores importados correctamente.');
      } catch (err) {
        console.error('Error parsing or uploading JSON:', err);
        alert('Error al leer el archivo JSON.');
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Edit player details inline
  const handleUpdatePlayer = async (playerId: string) => {
    if (!editingPlayerName.trim() || !selectedTournamentId) return;
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          name: editingPlayerName.trim(),
          age: editingPlayerAge ? parseInt(editingPlayerAge) : null
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Error al editar jugador');
        return;
      }
      setEditingPlayerId(null);
      setEditingPlayerName('');
      setEditingPlayerAge('');
      fetchTournamentDetails(selectedTournamentId);
    } catch (err) {
      console.error('Error updating player:', err);
    }
  };

  // Start tournament
  const handleStartTournament = async () => {
    if (!selectedTournamentId || starting) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/start`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Error al iniciar el torneo');
        return;
      }
      fetchTournamentDetails(selectedTournamentId);
      fetchTournaments();
    } catch (err) {
      console.error('Error starting tournament:', err);
    } finally {
      setStarting(false);
    }
  };

  // Reset/Re-draw tournament rounds
  const handleResetTournament = async () => {
    if (!selectedTournamentId) return;
    if (!confirm('¿Estás seguro de que deseas volver a sortear las rondas? Esto eliminará permanentemente todas las partidas y resultados registrados actualmente.')) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/reset`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Error al reiniciar el torneo');
        return;
      }
      fetchTournamentDetails(selectedTournamentId);
      fetchTournaments();
    } catch (err) {
      console.error('Error resetting tournament:', err);
    }
  };

  // Compress Rounds (fix extra rounds mid-tournament)
  const handleCompressRounds = async () => {
    if (!selectedTournamentId) return;
    if (!confirm('¿Estás seguro de que deseas ajustar y comprimir las rondas? Esto reorganizará los emparejamientos pendientes para rellenar rondas vacías. No afectará a los partidos que ya tienen un resultado asignado.')) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/compress-rounds`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Error al comprimir las rondas');
        return;
      }
      fetchTournamentDetails(selectedTournamentId);
    } catch (err) {
      console.error('Error compressing rounds:', err);
    }
  };

  // Delete tournament (from inside the tournament view)
  const handleDeleteTournament = async () => {
    if (!selectedTournamentId) return;
    if (!confirm('¿Eliminar este torneo permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al eliminar el torneo.');
        return;
      }
      localStorage.removeItem(`admin_key_${selectedTournamentId}`);
      setSelectedTournamentId(null);
      fetchTournaments();
    } catch (err) {
      console.error('Error deleting tournament:', err);
    }
  };

  // Archive / unarchive tournament
  const handleArchiveTournament = async (unarchive = false) => {
    if (!selectedTournamentId) return;
    const msg = unarchive
      ? '¿Deseas restaurar este torneo a la lista activa?'
      : '¿Deseas archivar este torneo? Dejará de aparecer en la lista principal y podrás encontrarlo en la sección de archivados.';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ unarchive })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al archivar el torneo.');
        return;
      }
      fetchTournamentDetails(selectedTournamentId);
      fetchTournaments();
    } catch (err) {
      console.error('Error archiving tournament:', err);
    }
  };

  // Export current tournament as JSON backup
  const handleExport = async () => {
    if (!selectedTournamentId || exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournamentId}/export`, {
        headers: { 'x-admin-key': adminKey }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al exportar');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (data.tournament?.name || 'torneo').replace(/\s+/g, '_');
      a.href = url;
      a.download = `${safeName}-backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting tournament:', err);
      alert('Error al exportar el torneo.');
    } finally {
      setExporting(false);
    }
  };

  // Restore tournament from JSON backup file
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile || !restoreAdminKey.trim()) return;
    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      const res = await fetch('/api/tournaments/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, adminKey: restoreAdminKey.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al restaurar el torneo.');
        return;
      }
      // Save admin key to localStorage and navigate to the restored tournament
      localStorage.setItem(`admin_key_${data.id}`, restoreAdminKey.trim());
      setShowRestoreModal(false);
      setRestoreFile(null);
      setRestoreAdminKey('');
      if (restoreFileRef.current) restoreFileRef.current.value = '';
      await fetchTournaments();
      setSelectedTournamentId(data.id);
    } catch (err) {
      console.error('Error restoring tournament:', err);
      alert('El archivo no es un respaldo válido o está corrupto.');
    } finally {
      setRestoring(false);
    }
  };

  // Register / update match result
  const handleResultChange = async (matchId: string, result: string | null) => {
    if (!selectedTournamentId) return;
    try {
      const formattedResult = result === 'pending' ? null : result;
      const res = await fetch(`/api/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ result: formattedResult }),
      });
      if (!res.ok) {
        alert('Error al guardar el resultado. ¿Tienes los permisos de administración activos?');
        return;
      }
      fetchTournamentDetails(selectedTournamentId);
    } catch (err) {
      console.error('Error updating match result:', err);
    }
  };

  // Helper to group matches by round number
  const getMatchesByRound = () => {
    if (!tournamentDetails) return {};
    const grouped: { [key: number]: Match[] } = {};
    tournamentDetails.matches.forEach((m) => {
      if (!grouped[m.round_number]) {
        grouped[m.round_number] = [];
      }
      grouped[m.round_number].push(m);
    });
    return grouped;
  };

  const matchesByRound = getMatchesByRound();

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="app-header">
        <div className="logo-container" onClick={() => setSelectedTournamentId(null)} style={{ cursor: 'pointer' }}>
          <span className="logo-icon">👑</span>
          <h1 className="logo-text">ChessLeague</h1>
        </div>
        {!selectedTournamentId && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowRestoreModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={18} /> Restaurar
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} /> Nuevo Torneo
            </button>
          </div>
        )}
      </header>

      {/* Main content body */}
      <main className="main-content">
        {!selectedTournamentId ? (
          /* Lobby view */
          <div>
            <div className="hero-section">
              <h2 className="hero-title">Ligas y Torneos de Ajedrez</h2>
              <p className="hero-subtitle">
                Crea torneos Round Robin (sistema de liga), gestiona emparejamientos con colores balanceados y sigue los resultados en tiempo real.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', margin: 0 }}>
                {showArchivedLobby ? 'Torneos Archivados' : 'Torneos Activos'}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn ${!showArchivedLobby ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => { setShowArchivedLobby(false); fetchTournaments(false); }}
                >
                  Activos
                </button>
                <button
                  className={`btn ${showArchivedLobby ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => { setShowArchivedLobby(true); fetchTournaments(true); }}
                >
                  Archivados
                </button>
              </div>
            </div>
            
            {tournaments.length === 0 ? (
              <div className="card-panel empty-state">
                <div className="empty-icon">♟️</div>
                <p>No hay torneos creados aún. ¡Crea el primero para comenzar!</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowCreateModal(true)}>
                  Crear Torneo
                </button>
              </div>
            ) : (
              <div className="tournaments-grid">
                {tournaments.map((t) => (
                  <div key={t.id} className="tournament-card" onClick={() => setSelectedTournamentId(t.id)}>
                    <div className="tournament-card-header">
                      <h4 className="tournament-title">{t.name}</h4>
                      <span className={`badge ${
                        t.status === 'created' ? 'badge-created' : 
                        t.status === 'in_progress' ? 'badge-progress' : 
                        t.status === 'archived' ? 'badge-created' : 'badge-completed'
                      }`}>
                        {t.status === 'created' ? 'Borrador' : 
                         t.status === 'in_progress' ? 'En Curso' : 
                         t.status === 'archived' ? '🗃 Archivado' : 'Finalizado'}
                      </span>
                    </div>
                    <div className="tournament-card-footer">
                      <span>{t.type === 'single' ? 'Una Vuelta (Ida)' : 'Doble Vuelta (Ida/Vuelta)'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Tournament Detail view */
          tournamentDetails && (
            <div>
              <div className="back-link" onClick={() => setSelectedTournamentId(null)}>
                <ChevronLeft size={20} /> Volver a los torneos
              </div>

               {/* Tournament Title Header */}
              <div className="hero-section" style={{ padding: '2rem 1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{tournamentDetails.tournament.name}</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Modalidad: <strong>{tournamentDetails.tournament.type === 'single' ? 'Una sola vuelta (Ida)' : 'Doble vuelta (Ida y Vuelta)'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCopyLink}
                      style={{ padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                    >
                      <Share2 size={16} /> 
                      {copied ? '¡Enlace Copiado!' : 'Compartir'}
                    </button>
                    <span className={`badge ${
                      tournamentDetails.tournament.status === 'created' ? 'badge-created' : 
                      tournamentDetails.tournament.status === 'in_progress' ? 'badge-progress' : 'badge-completed'
                    }`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                      {tournamentDetails.tournament.status === 'created' ? 'Borrador' : 
                       tournamentDetails.tournament.status === 'in_progress' ? 'En Curso' : 'Finalizado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lock/Unlock Bar */}
              <div className="card-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isAdminUnlocked ? (
                      <Unlock size={20} color="var(--color-primary)" />
                    ) : (
                      <Lock size={20} color="var(--color-text-secondary)" />
                    )}
                    <span style={{ fontWeight: '600' }}>
                      {isAdminUnlocked ? 'Modo Administrador Activo' : 'Modo Espectador (Lectura)'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!isAdminUnlocked ? (
                      <>
                        <input
                          type="password"
                          className="input-text"
                          placeholder="Clave de admin..."
                          style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderColor: adminKeyError ? 'var(--color-accent-red)' : undefined }}
                          value={adminKey}
                          onChange={(e) => { setAdminKey(e.target.value); setAdminKeyError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling as HTMLButtonElement).click()}
                        />
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', opacity: verifyingAdminKey ? 0.7 : 1 }}
                          disabled={verifyingAdminKey}
                          onClick={async () => {
                            if (!adminKey.trim() || !selectedTournamentId) return;
                            setVerifyingAdminKey(true);
                            setAdminKeyError('');
                            try {
                              const res = await fetch(`/api/tournaments/${selectedTournamentId}/verify-admin`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.trim() }
                              });
                              if (res.ok) {
                                setIsAdminUnlocked(true);
                                localStorage.setItem(`admin_key_${selectedTournamentId}`, adminKey.trim());
                              } else {
                                setAdminKeyError('Clave incorrecta');
                              }
                            } catch {
                              setAdminKeyError('Error de conexión');
                            } finally {
                              setVerifyingAdminKey(false);
                            }
                          }}
                        >
                          {verifyingAdminKey ? '...' : 'Activar'}
                        </button>
                        {adminKeyError && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-red)', whiteSpace: 'nowrap' }}>
                            ✗ {adminKeyError}
                          </span>
                        )}
                      </>
                    ) : (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                        onClick={() => {
                          setIsAdminUnlocked(false);
                          setAdminKey('');
                          setAdminKeyError('');
                          localStorage.removeItem(`admin_key_${selectedTournamentId}`);
                        }}
                      >
                        Cerrar Admin
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dashboard Layout: Left sidebar (standings/admin), Right content (matches/players) */}
              <div className="dashboard-layout">
                
                {/* Left Panel: Standings & Fast actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  

                  {/* Actions / Admin Panel */}
                  <div className="card-panel">
                    <h3 className="card-title">Acciones del Torneo</h3>
                    
                    {!isAdminUnlocked ? (
                      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        <Lock size={18} style={{ marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                        Para registrar resultados, agregar jugadores o iniciar la liga, ingresa la clave de administración arriba.
                      </div>
                    ) : (
                      <>
                        {tournamentDetails.tournament.status === 'created' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                              Para comenzar el torneo, agrega los participantes y presiona &quot;Comenzar Torneo&quot; para generar las rondas automáticamente.
                            </div>
                            <button 
                              className="btn btn-primary" 
                              onClick={handleStartTournament}
                              disabled={tournamentDetails.players.length < 2 || starting}
                              style={{ width: '100%', opacity: (tournamentDetails.players.length < 2 || starting) ? 0.5 : 1, cursor: (tournamentDetails.players.length < 2 || starting) ? 'not-allowed' : 'pointer' }}
                            >
                              {starting ? 'Iniciando...' : (
                                <>
                                  <Play size={18} /> Comenzar Torneo
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {tournamentDetails.tournament.status !== 'created' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Dynamic mid-tournament player addition form */}
                            <form onSubmit={handleAddPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <strong>Agregar jugador a mitad de torneo:</strong> Se crearán nuevas rondas para sus enfrentamientos de forma segura sin borrar los resultados ya guardados.
                              </span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="input-text"
                                  placeholder="Nombre del nuevo rival..."
                                  value={newPlayerName}
                                  onChange={(e) => setNewPlayerName(e.target.value)}
                                />
                                <button type="submit" className="btn btn-secondary" style={{ padding: '0.75rem' }}>
                                  <UserPlus size={18} />
                                </button>
                              </div>
                            </form>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <strong>Ajustar Rondas:</strong> Reorganiza las partidas pendientes para eliminar rondas vacías (útil si agregaste jugadores recientemente). No afecta resultados ya guardados.
                              </span>
                              <button 
                                className="btn btn-secondary" 
                                onClick={handleCompressRounds}
                                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                              >
                                <RefreshCw size={18} /> Ajustar Rondas
                              </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <strong>Volver a Sortear Rondas:</strong> Esto eliminará los emparejamientos y resultados anteriores, permitiéndote editar jugadores y empezar de nuevo.
                              </span>
                              <button 
                                className="btn btn-danger" 
                                onClick={handleResetTournament}
                                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                              >
                                <RotateCcw size={16} /> Volver a Sortear
                              </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <strong>Respaldo:</strong> Descarga un archivo JSON con todos los datos del torneo para guardarlo o restaurarlo después.
                              </span>
                              <button
                                className="btn btn-secondary"
                                onClick={handleExport}
                                disabled={exporting}
                                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: exporting ? 0.6 : 1 }}
                              >
                                <Download size={16} /> {exporting ? 'Exportando...' : 'Descargar Respaldo (.json)'}
                              </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <strong>Archivar:</strong> El torneo desaparece de la lista principal pero no se elimina. Puedes encontrarlo en la sección "Archivados".
                              </span>
                              {tournamentDetails.tournament.status === 'archived' ? (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleArchiveTournament(true)}
                                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                  ↩️ Restaurar a Activos
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleArchiveTournament(false)}
                                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                  🗃️ Archivar Torneo
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-accent-red)', opacity: 0.85 }}>
                                <strong>Zona de peligro:</strong> Esta acción es permanente e irreversible.
                              </span>
                              <button
                                className="btn btn-danger"
                                onClick={handleDeleteTournament}
                                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                              >
                                🗑️ Eliminar Torneo Permanentemente
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Right Panel: Tabs for Matches / Players */}
                <div className="card-panel">
                  <div className="tabs">
                    <button 
                      className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
                      onClick={() => setActiveTab('standings')}
                    >
                      Resumen General
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                      onClick={() => setActiveTab('matches')}
                    >
                      Enfrentamientos y Rondas
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
                      onClick={() => setActiveTab('players')}
                    >
                      Jugadores ({tournamentDetails.players.length})
                    </button>
                  </div>

                  {/* TAB 1: General Standings/Summary details */}
                  {activeTab === 'standings' && (
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '1rem' }}>Detalle de Puntuaciones</h4>
                      <div className="table-wrapper">
                        <table className="standings-table">
                          <thead>
                            <tr>
                              <th>Jugador</th>
                              <th style={{ textAlign: 'center' }}>Puntaje</th>
                              <th style={{ textAlign: 'center' }}>Ganadas</th>
                              <th style={{ textAlign: 'center' }}>Tablas</th>
                              <th style={{ textAlign: 'center' }}>Perdidas</th>
                              <th style={{ textAlign: 'center' }}>Sonneborn-Berger</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentDetails.standings.map((s) => (
                              <tr key={s.id}>
                                <td className="player-cell">{s.name}</td>
                                <td className="points-cell" style={{ textAlign: 'center' }}>{s.points}</td>
                                <td style={{ textAlign: 'center', color: 'var(--color-accent-green)' }}>{s.won}</td>
                                <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{s.drawn}</td>
                                <td style={{ textAlign: 'center', color: 'var(--color-accent-red)' }}>{s.lost}</td>
                                <td style={{ textAlign: 'center' }}>{s.sb.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Matches and Rounds list */}
                  {activeTab === 'matches' && (
                    <div>
                      {tournamentDetails.tournament.status === 'created' ? (
                        <div className="empty-state">
                          <Hourglass size={40} style={{ color: 'var(--color-primary)' }} />
                          <p style={{ marginTop: '1rem' }}>Los emparejamientos y rondas se generarán en cuanto inicies el torneo.</p>
                        </div>
                      ) : (
                        <div className="matches-list">
                          {Object.keys(matchesByRound).map((roundNum) => (
                            <div key={roundNum}>
                              <div className="round-header">
                                <span>Ronda {roundNum}</span>
                                {tournamentDetails.rounds.find(r => r.round_number === parseInt(roundNum))?.status === 'completed' && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckCircle size={14} /> Completada
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {matchesByRound[parseInt(roundNum)].map((m) => (
                                  <div key={m.id} className="match-card">
                                    {/* White player */}
                                    <div className="player-box white">
                                      <span className="player-name">{m.white_player_name}</span>
                                      <span className="color-dot white" title="Blancas"></span>
                                    </div>

                                    {(m.is_bye === 1 || m.black_player_id === 'BYE') ? (
                                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', padding: '0.4rem 1rem' }}>
                                          🛌 Descansa (Bye)
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        {/* Score selection */}
                                        <div className="versus-or-result">
                                          {isAdminUnlocked ? (
                                            <select 
                                              className="result-selector" 
                                              value={m.result || 'pending'}
                                              onChange={(e) => handleResultChange(m.id, e.target.value)}
                                            >
                                              <option value="pending">-</option>
                                              <option value="1-0">1 - 0</option>
                                              <option value="0-1">0 - 1</option>
                                              <option value="0.5-0.5">½ - ½</option>
                                            </select>
                                          ) : (
                                            <span className={`result-badge ${m.result ? (m.result === '0.5-0.5' ? 'draw' : 'win') : ''}`}>
                                              {m.result ? (m.result === '0.5-0.5' ? '½ - ½' : m.result) : '-'}
                                            </span>
                                          )}
                                        </div>

                                        {/* Black player */}
                                        <div className="player-box black">
                                          <span className="color-dot black" title="Negras"></span>
                                          <span className="player-name">{m.black_player_name}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Players Admin view */}
                  {activeTab === 'players' && (
                    <div>
                      {tournamentDetails.tournament.status === 'created' && isAdminUnlocked && (
                        <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            className="input-text"
                            style={{ flex: 2, minWidth: '150px' }}
                            placeholder="Nombre del jugador..."
                            required
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                          />
                          <input
                            type="number"
                            className="input-text"
                            style={{ flex: 1, minWidth: '80px' }}
                            placeholder="Edad (opcional)"
                            value={newPlayerAge}
                            onChange={(e) => setNewPlayerAge(e.target.value)}
                          />
                          <button type="submit" className="btn btn-primary" style={{ flex: 'none' }}>
                            <Plus size={18} /> Agregar
                          </button>
                        </form>
                      )}

                      {isAdminUnlocked && tournamentDetails.players.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                          <button onClick={handleExportPlayers} className="btn btn-secondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Download size={18} /> Exportar Jugadores
                          </button>
                          {tournamentDetails.tournament.status === 'created' && (
                            <label className="btn btn-secondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                              <Upload size={18} /> Importar (Añadir a lista)
                              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportPlayers} />
                            </label>
                          )}
                        </div>
                      )}
                      {isAdminUnlocked && tournamentDetails.players.length === 0 && tournamentDetails.tournament.status === 'created' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                          <label className="btn btn-secondary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                            <Upload size={18} /> Importar desde JSON
                            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportPlayers} />
                          </label>
                        </div>
                      )}

                      {tournamentDetails.players.length === 0 ? (
                        <p style={{ color: 'var(--color-text-secondary)' }}>No hay jugadores registrados en este torneo.</p>
                      ) : (
                        <ul className="players-list">
                          {tournamentDetails.players.map((p) => {
                            const isEditing = editingPlayerId === p.id;
                            return (
                              <li key={p.id} className="player-item" style={{ gap: '0.5rem' }}>
                                {isEditing ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      className="input-text"
                                      style={{ flex: 2, padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                                      value={editingPlayerName}
                                      onChange={(e) => setEditingPlayerName(e.target.value)}
                                    />
                                    <input
                                      type="number"
                                      className="input-text"
                                      style={{ flex: 1, padding: '0.35rem 0.75rem', fontSize: '0.9rem', maxWidth: '90px' }}
                                      placeholder="Edad"
                                      value={editingPlayerAge}
                                      onChange={(e) => setEditingPlayerAge(e.target.value)}
                                    />
                                    <button 
                                      className="btn btn-primary" 
                                      style={{ padding: '0.35rem', borderRadius: '6px' }}
                                      onClick={() => handleUpdatePlayer(p.id)}
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.35rem', borderRadius: '6px' }}
                                      onClick={() => setEditingPlayerId(null)}
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="player-name">
                                      {p.name} {p.age !== undefined && p.age !== null ? `(${p.age} años)` : ''}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      {isAdminUnlocked && (
                                        <button 
                                          className="btn btn-secondary" 
                                          style={{ padding: '0.4rem', borderRadius: '6px' }}
                                          onClick={() => {
                                            setEditingPlayerId(p.id);
                                            setEditingPlayerName(p.name);
                                            setEditingPlayerAge(p.age ? String(p.age) : '');
                                          }}
                                          title="Editar jugador"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                      )}
                                      <Award size={18} color="var(--color-primary)" />
                                    </div>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Modal for creating a new tournament */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Crear Nuevo Torneo</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Nombre del Torneo / Liga</label>
                <input
                  type="text"
                  className="input-text"
                  required
                  placeholder="Ej: Liga de Ajedrez Otoño 2026"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Clave de Administración (Contraseña)</label>
                <input
                  type="password"
                  className="input-text"
                  required
                  placeholder="Clave para poder editar este torneo"
                  value={newTournamentAdminKey}
                  onChange={(e) => setNewTournamentAdminKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Modalidad de Enfrentamientos</label>
                <div className="radio-group">
                  <div 
                    className={`radio-card ${newTournamentType === 'double' ? 'active' : ''}`}
                    onClick={() => setNewTournamentType('double')}
                  >
                    <span className="radio-title">Doble Vuelta</span>
                    <span className="radio-desc">Blancas y Negras contra cada rival (Recomendado)</span>
                  </div>
                  <div 
                    className={`radio-card ${newTournamentType === 'single' ? 'active' : ''}`}
                    onClick={() => setNewTournamentType('single')}
                  >
                    <span className="radio-title">Una Vuelta</span>
                    <span className="radio-desc">Un único enfrentamiento con distribución de piezas balanceada</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Liga'}
                </button>
              </div>
            </form>
           </div>
         </div>
       )}

      {/* Restore Tournament Modal */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><Upload size={20} /> Restaurar Torneo desde Respaldo</h3>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleRestore} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Selecciona un archivo <strong>.json</strong> exportado previamente desde esta aplicación. Se creará una <strong>copia nueva</strong> del torneo con una clave de administración que tú elijas.
              </div>

              <div className="form-group">
                <label className="form-label">Archivo de Respaldo (.json)</label>
                <input
                  ref={restoreFileRef}
                  type="file"
                  accept=".json,application/json"
                  className="input-text"
                  style={{ padding: '0.5rem' }}
                  onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
                  required
                />
                {restoreFile && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-green)', marginTop: '0.25rem', display: 'block' }}>
                    ✓ {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Nueva Clave de Administrador</label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Elige una clave para el torneo restaurado..."
                  value={restoreAdminKey}
                  onChange={(e) => setRestoreAdminKey(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  Esta clave será la nueva contraseña de administrador del torneo restaurado.
                </span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestoreModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={restoring || !restoreFile || !restoreAdminKey.trim()}>
                  {restoring ? 'Restaurando...' : <><Upload size={16} /> Restaurar Torneo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
