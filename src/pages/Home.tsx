import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { Trophy, Users, Globe, ChevronRight, Swords, Shield, Award, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/clubs').then(setClubs).catch(console.error);
  }, []);

  return (
    <div className="layout-container">
      {/* Hero Section */}
      <section style={{ 
        textAlign: 'center', 
        padding: '3rem 1rem 2rem 1rem', 
        position: 'relative',
        background: 'radial-gradient(circle at center, rgba(226, 184, 92, 0.05) 0%, transparent 70%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.6rem',
            background: 'rgba(226, 184, 92, 0.08)',
            border: '1px solid rgba(226, 184, 92, 0.25)',
            borderRadius: '4px', // Square design
            color: 'var(--color-primary)',
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '1rem'
          }}>
            Software Profesional de Ajedrez
          </span>
          <h1 className="brand-title" style={{ fontSize: '3rem', marginBottom: '0.75rem', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            Plataforma Global de Ajedrez
          </h1>
          <p className="brand-subtitle" style={{ fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            El ecosistema definitivo para torneos Suizos y ligas Grand Prix acumulativas.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', paddingTop: '0', maxWidth: '900px', margin: '0 auto' }}>
        
        {/* 1. Clubs List (Priority) */}
        <div className="card-panel" style={{ width: '100%', padding: '1.75rem', borderRadius: '8px' }}>
          <h2 className="card-title" style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>
            <Users size={20} color="var(--color-primary)" /> Clubes Registrados
          </h2>
          <div className="tournament-grid" style={{ gap: '1rem' }}>
            {clubs.map(c => (
              <Link to={`/club/${c.slug || c.id}`} key={c.id} className="tournament-card" style={{ padding: '1rem 1.5rem', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="tournament-card-title" style={{ fontSize: '1.1rem', margin: 0 }}>{c.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Entrar</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
            {clubs.length === 0 && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', width: '100%', padding: '1rem 0', fontSize: '0.9rem' }}>No hay clubes registrados todavía.</p>}
          </div>
        </div>

        {/* 2. Free Zone & CTA Row */}
        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', flexWrap: 'wrap' }}>
          
          <div className="card-panel" style={{ flex: 1, minWidth: '280px', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), transparent)' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '0.75rem', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
                <Globe size={18} color="var(--color-info)" /> Zona Libre
              </h2>
              <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Participa en torneos suizos independientes sin pertenecer a ningún club oficial.
              </p>
            </div>
            <Link to="/public" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', borderRadius: '4px' }}>
              Entrar al Lobby Público
            </Link>
          </div>

          <div className="card-panel" style={{ flex: 1, minWidth: '280px', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(226, 184, 92, 0.03), transparent)', border: '1px solid rgba(226, 184, 92, 0.1)' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '0.75rem', borderColor: 'rgba(226, 184, 92, 0.15)' }}>
                <Trophy size={18} color="var(--color-primary)" /> ¿Quieres tu propio Club?
              </h2>
              <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Obtén credenciales de administración para gestionar tus rankings de club, GP y jugadores.
              </p>
            </div>
            <a href="https://wa.me/529821004158?text=Hola,%20estoy%20interesado%20en%20crear%20un%20nuevo%20club%20en%20la%20plataforma%20de%20ajedrez" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', borderRadius: '4px' }}>
              <Mail size={16} /> Contactar Soporte
            </a>
          </div>

        </div>

      </main>

      {/* 3. Marketing Features (At the bottom) */}
      <section style={{ maxWidth: '900px', margin: '3rem auto 3rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <div className="card-panel" style={{ padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(226, 184, 92, 0.06)', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Swords size={16} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Suizo Inteligente</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
              Algoritmo de emparejamiento automático por ronda con desempates Buchholz integrados.
            </p>
          </div>

          <div className="card-panel" style={{ padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={18} color="var(--color-success)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Ligas Grand Prix</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
              Los torneos otorgan puntos automáticos a la liga acumulativa de tu club bajo ranking denso.
            </p>
          </div>

          <div className="card-panel" style={{ padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.06)', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={18} color="var(--color-info)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Control de Privacidad</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
              El administrador del club puede ocultar perfiles específicos del ranking de la liga pública.
            </p>
          </div>

        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', marginTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
        <Link to="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          Acceso para Administradores
        </Link>
      </footer>
    </div>
  );
}
