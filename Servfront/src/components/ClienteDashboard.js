import React, { useEffect, useState, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function ClienteDashboard() {
  const { user } = useContext(AuthContext);
  const [leituras, setLeituras] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    API.get('/relatorios/diario', { params: { date: today } })
      .then(res => setLeituras(res.data))
      .catch(() => setLeituras([]));
  }, [user]);

  return (
    <div className="dashboard">
      <h2>Bem‑vindo, {user.nome}</h2>
      <h3>Consumo Diário</h3>
      {leituras.length > 0 ? (
        <ul>
          {leituras.map(l => (
            <li key={l._id}>
              {new Date(l.timestamp).toLocaleTimeString()} — 
              {l.consumoDiario.toFixed(3)} m³
            </li>
          ))}
        </ul>
      ) : (
        <p>Sem leituras para hoje.</p>
      )}
    </div>
  );
}
