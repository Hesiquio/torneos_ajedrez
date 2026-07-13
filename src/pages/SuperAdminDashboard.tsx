import React, { useEffect, useState } from 'react';
import { fetchApi, logout } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Plus, Shield, Users, Globe, Trash2, Eye, EyeOff, Share2 } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [publicTournaments, setPublicTournaments] = useState<any[]>([]);
  
  const [showCreateTournamentModal, setShowCreateTournamentModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [expectedPlayers, setExpectedPlayers] = useState(8);
  const [newTournamentRounds, setNewTournamentRounds] = useState(3);
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const cRes = await fetchApi('/admin/clubs');
      setClubs(cRes);
      const tRes = await fetchApi('/tournaments?club_id=null');
      setPublicTournaments(tRes);
    } catch (e) {
      console.error(e);
      navigate('/admin');
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

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
          clubId: null,
          isGrandPrix: false
        })
      });
      setShowCreateTournamentModal(false);
      setNewTournamentName('');
      setNewTournamentAdminKey('');
      loadData();
    } catch(err: any) { alert(err.message); }
    finally {
      setIsCreatingTournament(false);
    }
  }

  async function handleCreateClub(e: React.FormEvent) {
    e.preventDefault();
    if (isCreatingClub) return;
    setIsCreatingClub(true);
    try {
      await fetchApi('/clubs', {
        method: 'POST',
        body: JSON.stringify({ name: newClubName })
      });
      setShowCreateClubModal(false);
      setNewClubName('');
      loadData();
    } catch(err: any) { alert(err.message); }
    finally {
      setIsCreatingClub(false);
    }
  }

  async function handleDeleteTournament(id: string) {
    if (!confirm('¿Eliminar torneo libre permanentemente? Esta acción no se puede deshacer y borrará todas sus partidas.')) return;
    try {
      await fetchApi(`/tournaments/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Shield className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>Super Admin</h1>
              <p className="brand-subtitle">Centro de Control Global</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}><LogOut size={18} /> Cerrar Sesión</button>
        </div>
      </header>

      <main className="main-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        <div className="card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <h2 className="card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}><Users size={24} color="var(--color-primary)" /> Clubes Oficiales</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateClubModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}><Plus size={16} /> Crear Club</button>
          </div>
          <div className="table-wrapper">
            <table className="standings-table">
              <thead><tr><th>Nombre del Club</th><th>Acción</th></tr></thead>
              <tbody>
                {clubs.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '500' }}>{c.name}</td>
                    <td><Link to={`/admin/club/${c.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Administrar Club</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <h2 className="card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}><Globe size={24} color="var(--color-info)" /> Torneos Libres</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateTournamentModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}><Plus size={16} /> Crear Nuevo</button>
          </div>
          <div className="table-wrapper">
            <table className="standings-table">
              <thead><tr><th>Torneo</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {publicTournaments.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '500' }}>{t.name}</td>
                     <td><span className={`status-badge status-${t.status}`}>{t.status === 'created' ? 'Borrador' : t.status === 'in_progress' ? 'En Curso' : 'Finalizado'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.6rem' }} onClick={() => handleDeleteTournament(t.id)} title="Eliminar Torneo">
                          <Trash2 size={14} />
                        </button>
                        <Link to={`/tournament/${t.slug || t.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Administrar</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showCreateTournamentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title" style={{ marginBottom: '1.5rem' }}>Crear Torneo Libre</h3>
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
                <label className="form-label">Número de Rondas Suizas (Sugerido)</label>
                <input type="number" className="input-text" min="1" max="15" required value={newTournamentRounds} onChange={e => setNewTournamentRounds(parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Clave de Árbitro (Temporal)</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setNewTournamentAdminKey(Math.random().toString(36).substring(2, 8).toUpperCase());
                      setShowNewKey(true);
                    }} 
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(226,184,92,0.1)', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 'bold' }}
                  >
                    Autogenerar Clave
                  </button>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type={showNewKey ? "text" : "password"} 
                    className="input-text" 
                    required 
                    value={newTournamentAdminKey} 
                    onChange={e => setNewTournamentAdminKey(e.target.value)} 
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowNewKey(!showNewKey)} 
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={showNewKey ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showNewKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Aunque la configures, como Super Admin podrás entrar directamente.</p>
              </div>

              <div className="form-group" style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Enviar clave por WhatsApp (Opcional)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input 
                    type="tel" 
                    placeholder="Ej. 5212223334444" 
                    className="input-text" 
                    value={whatsappPhone} 
                    onChange={e => setWhatsappPhone(e.target.value)} 
                    style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (!newTournamentAdminKey) return alert('Primero escribe o genera una clave.');
                      if (!whatsappPhone.trim()) return alert('Escribe un número de teléfono.');
                      const cleanNum = whatsappPhone.replace(/\D/g, '');
                      const msg = `Hola, la clave de árbitro para el torneo *${newTournamentName || 'del Club'}* es: *${newTournamentAdminKey}*`;
                      window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#25D366', borderColor: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Share2 size={14} /> Compartir
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTournamentModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingTournament}>
                  {isCreatingTournament ? 'Creando...' : 'Crear Torneo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateClubModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title" style={{ marginBottom: '1.5rem' }}>Registrar Nuevo Club</h3>
            <form onSubmit={handleCreateClub}>
              <div className="form-group">
                <label className="form-label">Nombre del Club Oficial</label>
                <input type="text" className="input-text" required value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="Ej. Club Ajedrez del Sur" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateClubModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingClub}>
                  {isCreatingClub ? 'Creando...' : 'Crear Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
