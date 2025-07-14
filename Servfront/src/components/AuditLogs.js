import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/audit');
        setLogs(res.data);
        setFeedback(null);
      } catch (err) {
        setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao carregar auditoria.' });
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="dashboard">
      <h2>Auditoria</h2>

      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      <table className="table-list">
        <thead>
          <tr>
            <th>Utilizador</th>
            <th>Rota</th>
            <th>Método</th>
            <th>Params</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l._id}>
              <td>{l.user}</td>
              <td>{l.rota}</td>
              <td>{l.metodo}</td>
              <td>
                <pre style={{ margin: 0 }}>{JSON.stringify(l.params)}</pre>
              </td>
              <td>{new Date(l.data).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
