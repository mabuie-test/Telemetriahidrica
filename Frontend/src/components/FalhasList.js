import React from 'react';

export default function FalhasList({ falhas }) {
  return (
    <table className="table-list">
      <thead>
        <tr>
          <th>Medidor</th>
          <th>Tipo</th>
          <th>Início</th>
          <th>Fim</th>
        </tr>
      </thead>
      <tbody>
        {falhas.map(f => (
          <tr key={f._id}>
            <td>{f.medidorId}</td>
            <td>{f.tipo}</td>
            <td>{new Date(f.inicio).toLocaleString()}</td>
            <td>{f.fim ? new Date(f.fim).toLocaleString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
