import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, doLogout } = useContext(AuthContext);
  return (
    <nav className="navbar">
      <h1>Telemetria Hídrica</h1>
      {user && (
        <div className="nav-right">
          <span>{user.nome} ({user.papel})</span>
          <button onClick={doLogout}>Sair</button>
        </div>
      )}
    </nav>
  );
}
