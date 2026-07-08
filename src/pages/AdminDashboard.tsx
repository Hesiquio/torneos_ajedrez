import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="layout-container">
      <h2>Panel de Club (Próximamente)</h2>
      <Link to="/" className="btn btn-primary">Volver al Inicio</Link>
    </div>
  );
}
