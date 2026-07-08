import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, setAuthToken } from '../api';

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
    <div className="layout-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="card-panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Panel de Administración</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input type="text" className="input-text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" className="input-text" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Ingresar</button>
        </form>
      </div>
    </div>
  );
}
