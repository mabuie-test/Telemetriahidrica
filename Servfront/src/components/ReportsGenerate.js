import React, { useState } from 'react';
import API from '../services/api';

export default function ReportsGenerate() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const fetchDaily = async () => {
    try {
      const res = await API.get('/relatorios/diario', { params: { date } });
      setReport(res.data);
      setFeedback(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao gerar relatório diário.' });
    }
  };

  const fetchMonthly = async () => {
    try {
      const res = await API.get('/relatorios/mensal', { params: { year: Number(year), month: Number(month) } });
      setReport(res.data);
      setFeedback(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao gerar relatório mensal.' });
    }
  };

  const fetchByClient = async () => {
    try {
      const res = await API.get('/relatorios/consumo-clientes', { params: { date } });
      setReport(res.data);
      setFeedback(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao gerar relatório por cliente.' });
    }
  };

  return (
    <div className="dashboard">
      <h2>Geração de Relatórios</h2>

      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      <div className="filters">
        <div>
          <h4>Relatório Diário</h4>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
          <button type="button" onClick={fetchDaily}>Gerar Diário</button>
        </div>

        <div>
          <h4>Relatório Mensal</h4>
          <input 
            type="number" 
            value={year} 
            onChange={e => setYear(e.target.value)} 
            style={{ width: '5rem' }} 
          /> -
          <input 
            type="number" 
            value={month} 
            onChange={e => setMonth(e.target.value)} 
            style={{ width: '3rem' }} 
          />
          <button type="button" onClick={fetchMonthly}>Gerar Mensal</button>
        </div>

        <div>
          <h4>Consumo por Cliente</h4>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
          <button type="button" onClick={fetchByClient}>Gerar Clientes</button>
        </div>
      </div>

      <table className="table-list">
        <thead>
          <tr>
            {report.length > 0 && Object.keys(report[0]).map(key => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.map((r, i) => (
            <tr key={i}>
              {Object.values(r).map((v, j) => (
                <td key={j}>
                  {typeof v === 'object' ? JSON.stringify(v) : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
