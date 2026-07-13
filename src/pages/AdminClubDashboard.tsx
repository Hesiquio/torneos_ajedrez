import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { Shield, ChevronLeft, Trash2, Edit2, Plus, Save, Users, Trophy, Settings, Eye, EyeOff } from 'lucide-react';

export default function AdminClubDashboard() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('jugadores');

  // Player Form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerAge, setEditPlayerAge] = useState('');
  const [editPlayerGP, setEditPlayerGP] = useState(0);

  // Tournament Form
  const [newTournamentName, setNewTournamentName] = useState('');
  const [expectedPlayers, setExpectedPlayers] = useState(8);
  const [newTournamentRounds, setNewTournamentRounds] = useState(3);
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);

  // Club Config Form
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');

  // Tournament Editing State
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState('');
  const [editTournamentKey, setEditTournamentKey] = useState('');

  useEffect(() => {
    loadData();
  }, [clubId]);

  async function loadData() {
    try {
      // Find club — this call requires an admin token
      const clubsRes = await fetchApi('/admin/clubs');
      const c = clubsRes.find((x:any) => x.id === clubId);
      if (!c) return navigate('/admin/super');
      setClub(c);
      setClubName(c.name);
      setClubDesc(c.description || '');

      const pRes = await fetchApi(`/players?club_id=${clubId}&include_hidden=true`);
      setPlayers(pRes);
      
      const tRes = await fetchApi(`/tournaments?club_id=${clubId}`);
      setTournaments(tRes);
    } catch(e: any) {
      // If unauthorized, redirect to login
      navigate('/admin', { state: { returnTo: `/admin/club/${clubId}` } });
    }
  }

  // --- Players ---
  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchApi('/players', {
        method: 'POST',
        body: JSON.stringify({ name: newPlayerName, age: newPlayerAge || null, clubId })
      });
      setNewPlayerName('');
      setNewPlayerAge('');
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function handleEditPlayer(id: string) {
    try {
      await fetchApi(`/players/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editPlayerName, age: editPlayerAge || null, grandPrixPoints: editPlayerGP, clubId })
      });
      setEditingPlayerId(null);
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function handleToggleVisibility(id: string) {
    try {
      await fetchApi(`/players/${id}/visibility`, { method: 'PATCH' });
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function handleDeletePlayer(id: string) {
    if (!confirm('¿Seguro que deseas eliminar a este jugador permanentemente?')) return;
    try {
      await fetchApi(`/players/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function handleUpdateClub(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetchApi(`/clubs/${clubId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: clubName, description: clubDesc })
      });
      alert('¡Información del club actualizada con éxito!');
      
      // If the slug changed, navigate to new admin URL to avoid errors
      if (res.slug && res.slug !== clubId) {
        navigate(`/admin/club/${res.slug}`);
      } else {
        loadData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  // --- Tournaments ---
  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (isCreatingTournament) return;
    setIsCreatingTournament(true);
    try {
      await fetchApi('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name: newTournamentName,
          totalRounds: newTournamentRounds,
          adminKey: newTournamentAdminKey,
          clubId: clubId,
          isGrandPrix: true // Club tournaments are GP by default
        })
      });
      setNewTournamentName('');
      setNewTournamentAdminKey('');
      loadData();
    } catch (e: any) { alert(e.message); }
    finally {
      setIsCreatingTournament(false);
    }
  }

  async function handleEditTournament(id: string) {
    if (!editTournamentName.trim() || !editTournamentKey.trim()) {
      alert('El nombre y la clave no pueden estar vacíos.');
      return;
    }
    try {
      await fetchApi(`/tournaments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editTournamentName, adminKey: editTournamentKey })
      });
      setEditingTournamentId(null);
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function handleDeleteTournament(id: string) {
    if (!confirm('¿Eliminar torneo permanentemente? Esto no se puede deshacer.')) return;
    try {
      await fetchApi(`/tournaments/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e: any) { alert(e.message); }
  }

  // --- Club ---
  async function handleDeleteClub() {
    if (!confirm('PELIGRO: ¿Eliminar club y TODO su historial permanentemente?')) return;
    try {
      await fetchApi(`/clubs/${clubId}`, { method: 'DELETE' });
      navigate('/admin/super');
    } catch (e: any) { alert(e.message); }
  }

  if (!club) return <div>Cargando...</div>;

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to="/admin/super" className="btn btn-secondary" style={{ padding: '0.6rem' }}><ChevronLeft size={20} /></Link>
            <Shield className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>Admin: {club.name}</h1>
              <p className="brand-subtitle">Gestión Integral</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          <button className={`tab-btn ${activeTab === 'jugadores' ? 'active' : ''}`} onClick={() => setActiveTab('jugadores')}>
            <Users size={16} /> Jugadores & GP
          </button>
          <button className={`tab-btn ${activeTab === 'torneos' ? 'active' : ''}`} onClick={() => setActiveTab('torneos')}>
            <Trophy size={16} /> Torneos Oficiales
          </button>
          <button className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
            <Settings size={16} /> Configuración
          </button>
        </div>

        {activeTab === 'jugadores' && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="card-panel" style={{ flex: 1, minWidth: '320px', alignSelf: 'flex-start' }}>
              <h2 className="card-title">Registrar Nuevo Jugador</h2>
              <form onSubmit={handleAddPlayer}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input type="text" className="input-text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Edad (Opcional)</label>
                  <input type="number" className="input-text" value={newPlayerAge} onChange={e => setNewPlayerAge(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><Plus size={18} /> Agregar</button>
              </form>
            </div>

              <div className="card-panel" style={{ flex: 2, minWidth: '320px' }}>
              <h2 className="card-title">Lista de Jugadores</h2>
              <div className="table-wrapper">
                <table className="standings-table">
                  <thead><tr><th>Jugador</th><th>Edad</th><th>Pts GP</th><th style={{ textAlign: 'center' }}>Visible</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {players.map(p => (
                      <tr key={p.id} style={{ opacity: p.hidden ? 0.5 : 1 }}>
                        {editingPlayerId === p.id ? (
                          <>
                            <td><input type="text" className="input-text" style={{ padding: '0.5rem', minWidth: '120px' }} value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} /></td>
                            <td><input type="number" className="input-text" style={{ padding: '0.5rem', width: '70px', minWidth: '60px' }} value={editPlayerAge} onChange={e => setEditPlayerAge(e.target.value)} placeholder="Años" /></td>
                            <td><input type="number" className="input-text" style={{ padding: '0.5rem', width: '80px', minWidth: '70px' }} value={editPlayerGP} onChange={e => setEditPlayerGP(parseInt(e.target.value))} /></td>
                            <td></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-primary" style={{ padding: '0.5rem', flexShrink: 0 }} onClick={() => handleEditPlayer(p.id)}><Save size={16}/></button>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem', flexShrink: 0 }} onClick={() => setEditingPlayerId(null)}>X</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ fontWeight: '500' }}>
                              {p.name}
                              {p.hidden === 1 && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>oculto</span>}
                            </td>
                            <td>{p.age || <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>-</span>}</td>
                            <td style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{p.grand_prix_points}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem', opacity: p.hidden ? 0.6 : 1 }}
                                title={p.hidden ? 'Mostrar en ranking público' : 'Ocultar del ranking público'}
                                onClick={() => handleToggleVisibility(p.id)}
                              >
                                {p.hidden ? <EyeOff size={16} color="var(--color-text-muted)" /> : <Eye size={16} color="var(--color-success)" />}
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem', flexShrink: 0 }} onClick={() => { setEditingPlayerId(p.id); setEditPlayerName(p.name); setEditPlayerAge(p.age || ''); setEditPlayerGP(p.grand_prix_points); }}><Edit2 size={16} /></button>
                                <button className="btn btn-danger" style={{ padding: '0.5rem', flexShrink: 0 }} onClick={() => handleDeletePlayer(p.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'torneos' && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="card-panel" style={{ flex: 1, minWidth: '320px', alignSelf: 'flex-start' }}>
              <h2 className="card-title">Crear Torneo Oficial</h2>
              <form onSubmit={handleCreateTournament}>
                <div className="form-group">
                  <label className="form-label">Nombre del Torneo</label>
                  <input type="text" className="input-text" required value={newTournamentName} onChange={e => setNewTournamentName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad Esperada de Jugadores</label>
                  <input type="number" className="input-text" min="2" max="256" required value={expectedPlayers} onChange={e => {
                    const val = parseInt(e.target.value);
                    setExpectedPlayers(val);
                    if (val > 1) {
                      setNewTournamentRounds(Math.ceil(Math.log2(val)));
                    }
                  }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Rondas (Sugerido)</label>
                  <input type="number" className="input-text" min="1" max="15" required value={newTournamentRounds} onChange={e => setNewTournamentRounds(parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clave de Árbitro</label>
                  <input type="password" className="input-text" required value={newTournamentAdminKey} onChange={e => setNewTournamentAdminKey(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isCreatingTournament}>
                  {isCreatingTournament ? 'Creando...' : <><Plus size={18} /> Crear</>}
                </button>
              </form>
            </div>

            <div className="card-panel" style={{ flex: 2, minWidth: '320px' }}>
              <h2 className="card-title">Historial de Torneos</h2>
              <div className="table-wrapper">
                <table className="standings-table table-compact">
                  <thead><tr><th>Torneo</th><th>Clave Árbitro</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {tournaments.map(t => (
                      <tr key={t.id}>
                        {editingTournamentId === t.id ? (
                          <>
                            <td><input type="text" className="input-text" style={{ padding: '0.4rem', minWidth: '120px', fontSize: '0.85rem' }} value={editTournamentName} onChange={e => setEditTournamentName(e.target.value)} /></td>
                            <td><input type="text" className="input-text" style={{ padding: '0.4rem', minWidth: '90px', fontSize: '0.85rem' }} value={editTournamentKey} onChange={e => setEditTournamentKey(e.target.value)} /></td>
                            <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-primary" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => handleEditTournament(t.id)}><Save size={14}/></button>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => setEditingTournamentId(null)}>X</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ fontWeight: '500', fontSize: '0.9rem', verticalAlign: 'middle' }}>{t.name}</td>
                            <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', verticalAlign: 'middle', fontFamily: 'monospace' }}>●●●●●●</td>
                            <td style={{ verticalAlign: 'middle' }}><span className={`status-badge status-${t.status}`}>{t.status === 'created' ? 'Borrador' : t.status === 'in_progress' ? 'En Curso' : 'Finalizado'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <Link to={`/tournament/${t.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', flexShrink: 0 }}>Entrar</Link>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => { setEditingTournamentId(t.id); setEditTournamentName(t.name); setEditTournamentKey(''); }} title="Editar Torneo"><Edit2 size={14} /></button>
                                <button className="btn btn-danger" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => handleDeleteTournament(t.id)}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="card-panel" style={{ flex: 1, minWidth: '320px', alignSelf: 'flex-start' }}>
              <h2 className="card-title">Información del Club</h2>
              <form onSubmit={handleUpdateClub}>
                <div className="form-group">
                  <label className="form-label">Nombre del Club</label>
                  <input type="text" className="input-text" required value={clubName} onChange={e => setClubName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción / Información General</label>
                  <textarea 
                    className="input-text" 
                    style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
                    placeholder="Escribe aquí los horarios del club, dirección física, contacto o información general..."
                    value={clubDesc} 
                    onChange={e => setClubDesc(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><Save size={18} /> Guardar Cambios</button>
              </form>
            </div>

            <div className="card-panel" style={{ flex: 1, minWidth: '320px', alignSelf: 'flex-start' }}>
              <h2 className="card-title" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Zona de Peligro</h2>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Eliminar este club borrará permanentemente a todos sus jugadores, torneos y emparejamientos. Esta acción no se puede deshacer.
              </p>
              <button className="btn btn-danger" onClick={handleDeleteClub}><Trash2 size={18} /> Eliminar Club Permanentemente</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
