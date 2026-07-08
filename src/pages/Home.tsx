import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Users, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/clubs').then(setClubs).catch(console.error);
  }, []);

  return (
    <div className="layout-container">
      <header className="main-header" style={{ textAlign: 'center' }}>
        <h1 className="brand-title" style={{ fontSize: '2.5rem' }}>Plataforma de Torneos</h1>
        <p className="brand-subtitle">Bienvenido al ecosistema de ajedrez</p>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        
        <div className="card-panel" style={{ width: '100%', maxWidth: '600px' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} /> Clubes Registrados
          </h2>
          <div className="tournament-grid">
            {clubs.map(c => (
              <Link to={`/club/${c.id}`} key={c.id} className="tournament-card" style={{ textDecoration: 'none' }}>
                <div className="tournament-card-header">
                  <h3 className="tournament-card-title">{c.name}</h3>
                </div>
                <div className="tournament-card-body">
                  <p>Ver Ranking y Torneos Oficiales</p>
                </div>
              </Link>
            ))}
            {clubs.length === 0 && <p>No hay clubes registrados todavía.</p>}
          </div>
        </div>

        <div className="card-panel" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--color-bg-alt)' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={24} /> Zona Libre
          </h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-light)' }}>
            Explora o participa en torneos libres que no están asociados a ningún club en específico.
          </p>
          <Link to="/public" className="btn btn-primary" style={{ display: 'inline-block', width: '100%', textAlign: 'center' }}>
            Entrar al Lobby Público
          </Link>
        </div>

      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', marginTop: 'auto' }}>
        <Link to="/admin" style={{ color: 'var(--color-text-light)', textDecoration: 'none', fontSize: '0.9rem' }}>
          Acceso para Administradores
        </Link>
      </footer>
    </div>
  );
}
