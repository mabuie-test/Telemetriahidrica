import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function ReadingsView() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get('/leituras')
      .then(r => setData(r.data))
      .catch(err => {
        console.error('Erro ao carregar leituras:', err);
        setData([]);  // fallback
      });
  }, []);

  // Filtragem defensiva: só regista leituras com timestamp
  const validData = data.filter(l =>
    l._id &&
    l.timestamp &&
    // consumoDiario e consumoMensal podem ser zero, mas não undefined/null
    typeof l.consumoDiario === 'number' &&
    typeof l.consumoMensal === 'number' &&
    l.latitude != null &&
    l.longitude != null &&
    typeof l.bateria === 'number' &&
    typeof l.rssi === 'number'
  );

  return (
    <div className="dashboard">
      <h2>Visualização de Leituras</h2>

      {validData.length > 0 ? (
        <table className="table-list">
          <thead>
            <tr>
              <th>Medidor</th>
              <th>Consumo Diário</th>
              <th>Consumo Mensal</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Bateria</th>
              <th>RSSI</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {validData.map(l => (
              <tr key={l._id}>
                <td>{l.medidorId || '-'}</td>
                <td>{l.consumoDiario.toFixed(3)}</td>
                <td>{l.consumoMensal.toFixed(3)}</td>
                <td>{l.latitude.toFixed(6)}</td>
                <td>{l.longitude.toFixed(6)}</td>
                <td>{l.bateria.toFixed(0)}%</td>
                <td>{l.rssi}</td>
                <td>{new Date(l.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Sem leituras válidas para exibir.</p>
      )}
    </div>
  );
}
