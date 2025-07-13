import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function FailuresAlerts() {
  const [falhas, setFalhas] = useState([]);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    API.get('/falhas').then(r=>setFalhas(r.data));
    API.get('/alertas').then(r=>setAlertas(r.data));
  }, []);

  return (
    <div className="dashboard">
      <h2>Falhas Detectadas</h2>
      <table className="table-list">
        <thead><tr><th>Medidor</th><th>Tipo</th><th>Início</th><th>Fim</th></tr></thead>
        <tbody>
          {falhas.map(f=>(
            <tr key={f._id}>
              <td>{f.medidorId}</td>
              <td>{f.tipo}</td>
              <td>{new Date(f.inicio).toLocaleString()}</td>
              <td>{f.fim?new Date(f.fim).toLocaleString():'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Alertas</h2>
      <table className="table-list">
        <thead><tr><th>Medidor</th><th>Tipo</th><th>Data</th></tr></thead>
        <tbody>
          {alertas.map(a=>(
            <tr key={a._id}>
              <td>{a.medidorId}</td>
              <td>{a.tipo}</td>
              <td>{new Date(a.data).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
