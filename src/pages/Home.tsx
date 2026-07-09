import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Users, Globe, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/clubs').then(setClubs).catch(console.error);
  }, []);

  return (
    <div className="layout-container">
      <header className="main-header" style={{ textAlign: 'center', borderBottom: 'none', background: 'transparent', boxShadow: 'none' }}>
        <div style={{ padding: '3rem 1rem' }}>
          <h1 className="brand-title" style={{ fontSize: '3.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Plataforma Global de Ajedrez
          </h1>
          <p className="brand-subtitle" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-secondary)' }}>
            El ecosistema definitivo para torneos Suizos y ligas Grand Prix. Únete a un club oficial o compite en la zona libre.
          </p>
        </div>
      </header>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem', paddingTop: '0' }}>
        
        <div className="card-panel" style={{ width: '100%', maxWidth: '800px', padding: '3rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.8rem' }}>
            <Users size={28} color="var(--color-primary)" /> Clubes Registrados
          </h2>
          <div className="tournament-grid">
            {clubs.map(c => (
              <Link to={`/club/${c.slug || c.id}`} key={c.id} className="tournament-card" style={{ padding: '2rem' }}>
                <div className="tournament-card-header" style={{ marginBottom: '0.5rem' }}>
                  <h3 className="tournament-card-title">{c.name}</h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>Ver Ranking Oficial</span>
                  <ChevronRight size={20} color="var(--color-primary)" />
                </div>
              </Link>
            ))}
            {clubs.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No hay clubes registrados todavía.</p>}
          </div>
        </div>

        <div className="card-panel" style={{ width: '100%', maxWidth: '800px', padding: '3rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent)' }}>
          <h2 className="card-title" style={{ fontSize: '1.8rem', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <Globe size={28} color="var(--color-info)" /> Zona Libre
          </h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            Explora o participa en torneos libres que no están asociados a ningún club en específico. Ideal para prácticas y amistosos.
          </p>
          <Link to="/public" className="btn btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
            Entrar al Lobby Público
          </Link>
        </div>

      </main>

      <footer style={{ textAlign: 'center', padding: '3rem', marginTop: 'auto', borderTop: '1px solid var(--border-light)' }}>
        <Link to="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          Acceso para Administradores
        </Link>
      </footer>
    </div>
  );
}
