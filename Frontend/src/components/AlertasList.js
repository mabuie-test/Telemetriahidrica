import React from 'react';

export default function AlertasList({ alertas }) {
  return (
    <table className="table-list">
      <thead>
        <tr>
          <th>Medidor</th>
          <th>Tipo</th>
          <th>Data</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        {alertas.map(a => (
          <tr key={a._id}>
            <td>{a.medidorId}</td>
            <td>{a.tipo}</td>
            <td>{new Date(a.data).toLocaleString()}</td>
            <td>{JSON.stringify(a.detalhes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
