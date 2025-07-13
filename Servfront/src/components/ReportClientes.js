import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function ReportClientes() {
  const [dataDate, setDataDate]   = useState(new Date().toISOString().slice(0,10));
  const [report, setReport]       = useState([]);

  const fetchReport = async () => {
    const res = await API.get('/relatorios/consumo-clientes', { params: { date: dataDate } });
    setReport(res.data);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="report-clientes">
      <h3>Consumo por Cliente</h3>
      <div className="filters">
        <label>Data diária:
          <input type="date" value={dataDate}
                 onChange={e => setDataDate(e.target.value)} />
        </label>
        <button onClick={fetchReport}>Buscar Diário</button>
      </div>
      <table className="table-list">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Medidor</th>
            <th>Total Diário (m³)</th>
            <th>Total Mensal (m³)</th>
          </tr>
        </thead>
        <tbody>
          {report.map(r => (
            <tr key={r.medidorId}>
              <td>{r.nomeCliente}</td>
              <td>{r.medidorId}</td>
              <td>{r.totalDiario.toFixed(3)}</td>
              <td>{r.totalMensal.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
