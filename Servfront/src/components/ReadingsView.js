import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function ReadingsView() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get('/leituras').then(r=>setData(r.data));
  }, []);

  return (
    <div className="dashboard">
      <h2>Visualização de Leituras</h2>
      <table className="table-list">
        <thead>
          <tr>
            <th>Medidor</th><th>Consumo Diário</th><th>Mensal</th>
            <th>Lat</th><th>Lng</th><th>Bateria</th><th>RSSI</th><th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data.map(l=>(
            <tr key={l._id}>
              <td>{l.medidorId}</td>
              <td>{l.consumoDiario.toFixed(3)}</td>
              <td>{l.consumoMensal.toFixed(3)}</td>
              <td>{l.latitude.toFixed(6)}</td>
              <td>{l.longitude.toFixed(6)}</td>
              <td>{l.bateria}%</td>
              <td>{l.rssi}</td>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
