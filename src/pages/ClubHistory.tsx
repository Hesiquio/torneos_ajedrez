import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { ChevronLeft, History } from 'lucide-react';

export default function ClubHistory() {
  const { clubId } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/clubs/${clubId}/history`)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clubId]);

  // Group by tournament name + date
  const grouped: Record<string, any[]> = {};
  for (const m of history) {
    const key = `${m.tournament_name}||${m.tournament_date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const resultLabel = (result: string) => {
    if (result === '1-0') return { text: '1 - 0', side: 'white' };
    if (result === '0-1') return { text: '0 - 1', side: 'black' };
    if (result === '0.5-0.5') return { text: '½ - ½', side: 'draw' };
    return { text: result, side: 'draw' };
  };

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <Link to={`/club/${clubId}`} className="btn btn-secondary" style={{ padding: '0.6rem' }}>
              <ChevronLeft size={20} />
            </Link>
            <History className="brand-icon" size={32} />
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>Historial Oficial</h1>
              <p className="brand-subtitle">Resultados por torneo y jornada</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '4rem 0' }}>
            Cargando historial...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card-panel" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '4rem 2rem' }}>
            Aún no hay partidas oficiales registradas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {Object.entries(grouped).map(([key, matches]) => {
              const [tournamentName, tournamentDate] = key.split('||');
              const date = new Date(tournamentDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

              // Group matches within this tournament by round
              const byRound: Record<number, any[]> = {};
              for (const m of matches) {
                if (!byRound[m.round_number]) byRound[m.round_number] = [];
                byRound[m.round_number].push(m);
              }

              return (
                <div key={key} className="card-panel">
                  <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-primary)' }}>
                      {tournamentName}
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{date}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(byRound)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([roundNum, roundMatches]) => (
                        <div key={roundNum}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                            Jornada {roundNum}
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            {roundMatches.map(m => {
                              const res = resultLabel(m.result);
                              return (
                                <div key={m.id} style={{
                                  display: 'flex', alignItems: 'center',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: '12px',
                                  padding: '0.75rem 1rem',
                                  gap: '0.75rem',
                                  fontSize: '0.9rem',
                                }}>
                                  <span style={{
                                    flex: 1, textAlign: 'right', fontWeight: '500',
                                    color: res.side === 'white' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                                  }}>
                                    ♙ {m.white_player_name}
                                  </span>
                                  <span style={{
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    background: res.side === 'draw'
                                      ? 'rgba(148,163,184,0.15)'
                                      : 'rgba(226,184,92,0.12)',
                                    color: res.side === 'draw'
                                      ? 'var(--color-text-secondary)'
                                      : 'var(--color-primary)',
                                    whiteSpace: 'nowrap',
                                    minWidth: '52px',
                                    textAlign: 'center',
                                  }}>
                                    {res.text}
                                  </span>
                                  <span style={{
                                    flex: 1, textAlign: 'left', fontWeight: '500',
                                    color: res.side === 'black' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                                  }}>
                                    {m.black_player_name} ♟
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
