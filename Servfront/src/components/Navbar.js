import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, doLogout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <h1>Telemetria Hídrica</h1>

      {user && (
        <div className="nav-right">
          {user.papel === 'admin' && (
            <>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/users">Utilizadores</Link>
              <Link to="/admin/medidores">Contadores</Link>
              <Link to="/admin/ingest">Ingestão</Link>
              <Link to="/admin/view">Leituras</Link>
              <Link to="/admin/fail-alerts">Falhas & Alertas</Link>
              <Link to="/admin/reports">Relatórios</Link>
              <Link to="/admin/audit">Auditoria</Link>
            </>
          )}
          {user.papel === 'cliente' && (
            <Link to="/cliente">Meu Consumo</Link>
          )}

          <span style={{ marginLeft: '1rem' }}>
            {user.nome} ({user.papel})
          </span>
          <button onClick={doLogout} style={{ marginLeft: '1rem' }}>
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
