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
      {/* Hero Section (No sticky header) */}
      <section style={{ 
        textAlign: 'center', 
        padding: '5rem 1rem 4rem 1rem', 
        position: 'relative',
        background: 'radial-gradient(circle at center, rgba(226, 184, 92, 0.08) 0%, transparent 70%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.35rem 1rem',
            background: 'rgba(226, 184, 92, 0.1)',
            border: '1px solid rgba(226, 184, 92, 0.3)',
            borderRadius: '20px',
            color: 'var(--color-primary)',
            fontSize: '0.85rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '1.5rem'
          }}>
            Software Profesional de Ajedrez
          </span>
          <h1 className="brand-title" style={{ fontSize: '3.8rem', marginBottom: '1.5rem', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            Plataforma Global de Ajedrez
          </h1>
          <p className="brand-subtitle" style={{ fontSize: '1.25rem', maxWidth: '650px', margin: '0 auto', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
            El ecosistema definitivo para torneos Suizos y ligas Grand Prix acumulativas. Únete a un club oficial o compite en la zona libre.
          </p>
        </div>
      </section>

      {/* Main Marketing Features */}
      <section style={{ maxWidth: '1100px', margin: '0 auto 5rem auto', padding: '0 5%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          
          <div className="card-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ background: 'rgba(226, 184, 92, 0.08)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Swords size={24} color="var(--color-primary)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: '700' }}>Sistema Suizo Inteligente</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Algoritmo de emparejamiento suizo automático con desempate Buchholz de alta precisión. Genera las rondas al instante y sin errores de cálculo.
            </p>
          </div>

          <div className="card-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} color="var(--color-success)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: '700' }}>Ligas Grand Prix Acumulativas</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Los torneos de tu club otorgan puntos GP para el ranking global del club de forma integrada. Ránking denso automático con soporte para empates.
            </p>
          </div>

          <div className="card-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="var(--color-info)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: '700' }}>Privacidad Personalizada</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              El administrador del club puede ocultar perfiles del ranking público con un solo click. Perfecto para adultos que no quieren salir en la tabla pública.
            </p>
          </div>

        </div>
      </section>

      {/* Main Action Panels */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem', paddingTop: '0', maxWidth: '900px' }}>
        
        {/* Clubs List */}
        <div className="card-panel" style={{ width: '100%', padding: '2.5rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.6rem', marginBottom: '2rem' }}>
            <Users size={24} color="var(--color-primary)" /> Clubes Registrados
          </h2>
          <div className="tournament-grid">
            {clubs.map(c => (
              <Link to={`/club/${c.slug || c.id}`} key={c.id} className="tournament-card" style={{ padding: '1.5rem 2rem' }}>
                <div className="tournament-card-header" style={{ marginBottom: '0.5rem' }}>
                  <h3 className="tournament-card-title">{c.name}</h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>Entrar al Lobby del Club</span>
                  <ChevronRight size={18} color="var(--color-primary)" />
                </div>
              </Link>
            ))}
            {clubs.length === 0 && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', width: '100%', padding: '2rem 0' }}>No hay clubes registrados todavía.</p>}
          </div>
        </div>

        {/* Free Zone & Marketing CTA */}
        <div style={{ display: 'flex', gap: '2rem', width: '100%', flexWrap: 'wrap' }}>
          
          <div className="card-panel" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent)' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.5rem', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <Globe size={22} color="var(--color-info)" /> Zona Libre
              </h2>
              <p style={{ marginBottom: '2rem', fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                Explora o participa en torneos libres sin asociar a ningún club. Ideal para prácticas informales o partidas amistosas.
              </p>
            </div>
            <Link to="/public" className="btn btn-secondary" style={{ width: '100%', padding: '0.9rem' }}>
              Entrar al Lobby Público
            </Link>
          </div>

          <div className="card-panel" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(226, 184, 92, 0.05), transparent)', border: '1px solid rgba(226, 184, 92, 0.15)' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.5rem', borderColor: 'rgba(226, 184, 92, 0.2)' }}>
                <Trophy size={22} color="var(--color-primary)" /> ¿Quieres tu propio Club?
              </h2>
              <p style={{ marginBottom: '2rem', fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                Si eres organizador de torneos o tienes un club físico, te proporcionamos credenciales para que gestiones tus propios rankings, GP y jugadores.
              </p>
            </div>
            <a href="mailto:admin@ahkintech.com?subject=Interes en Plataforma Ajedrez - Nuevo Club" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem' }}>
              <Mail size={18} /> Contactar Soporte
            </a>
          </div>

        </div>

      </main>

      <footer style={{ textAlign: 'center', padding: '3rem', marginTop: '5rem', borderTop: '1px solid var(--border-light)' }}>
        <Link to="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          Acceso para Administradores
        </Link>
      </footer>
    </div>
  );
}
