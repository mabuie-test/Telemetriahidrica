import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, doLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    doLogout();
    navigate('/login');
  };

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
              <Link to="/admin/contabilidade">Contabilidade</Link>
              <Link to="/admin/audit">Auditoria</Link>
            </>
          )}
          {user.papel === 'cliente' && (
            <>
              <Link to="/cliente">Meu Consumo</Link>
              <Link to="/contabilidade">Contabilidade</Link>
            </>
          )}

          <span className="user-info">
            {user.nome} ({user.papel})
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
