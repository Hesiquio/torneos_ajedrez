import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Swords, Calendar, ChevronLeft, Plus, Eye, EyeOff, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicLobby() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [expectedPlayers, setExpectedPlayers] = useState(8);
  const [newTournamentRounds, setNewTournamentRounds] = useState(3);
  const [newTournamentAdminKey, setNewTournamentAdminKey] = useState('');
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    fetchApi('/tournaments?club_id=null').then(setTournaments).catch(console.error);
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
      setShowCreateModal(false);
      setNewTournamentName('');
      setNewTournamentAdminKey('');
      loadData();
    } catch(err: any) {
      alert(err.message);
    } finally {
      setIsCreatingTournament(false);
    }
  }

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.6rem' }}><ChevronLeft size={20} /></Link>
            <Trophy className="brand-icon" size={36} />
            <div>
              <h1 className="brand-title">Lobby Público</h1>
              <p className="brand-subtitle">Torneos Libres e Informales</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <h2 className="card-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
              <Swords size={24} color="var(--color-info)" /> Torneos Libres Activos
            </h2>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <Plus size={16} /> Crear Torneo
            </button>
          </div>
          
          <div className="tournament-grid">
            {tournaments.map(t => (
              <Link to={`/tournament/${t.slug || t.id}`} key={t.id} className="tournament-card">
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
            ))}
            {tournaments.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0', gridColumn: '1 / -1' }}>
                No hay torneos libres activos en este momento.
              </p>
            )}
          </div>
        </div>
      </main>

      {showCreateModal && (
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
                  <span>Crea una Clave de Árbitro</span>
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
                    placeholder="Solo tú podrás controlar este torneo"
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
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>¡Guarda bien esta clave! La necesitarás para dar resultados de las rondas.</p>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingTournament}>
                  {isCreatingTournament ? 'Creando...' : 'Crear Torneo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
