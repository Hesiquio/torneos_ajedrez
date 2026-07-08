import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi, setAuthToken } from '../api';
import { Lock, ChevronLeft } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetchApi('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setAuthToken(res.token);
      
      if (res.user.role === 'SUPER_ADMIN') {
        navigate('/admin/super');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="layout-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      
      <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
        <Link to="/" className="btn btn-secondary"><ChevronLeft size={20} /> Volver al Portal</Link>
      </div>

      <div className="card-panel" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: 'rgba(226, 184, 92, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Lock size={32} color="var(--color-primary)" />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'var(--font-serif)', fontSize: '1.8rem' }}>Panel de Control</h2>
        
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input type="text" className="input-text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="ej. admin" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" className="input-text" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>Ingresar al Sistema</button>
        </form>
      </div>
    </div>
  );
}
