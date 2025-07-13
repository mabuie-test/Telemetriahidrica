import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    API.get('/audit').then(r=>setLogs(r.data));
  }, []);

  return (
    <div className="dashboard">
      <h2>Auditoria</h2>
      <table className="table-list">
        <thead>
          <tr><th>Utilizador</th><th>Rota</th><th>Método</th><th>Params</th><th>Data</th></tr>
        </thead>
        <tbody>
          {logs.map(l=>(
            <tr key={l._id}>
              <td>{l.user}</td>
              <td>{l.rota}</td>
              <td>{l.metodo}</td>
              <td><pre>{JSON.stringify(l.params)}</pre></td>
              <td>{new Date(l.data).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
