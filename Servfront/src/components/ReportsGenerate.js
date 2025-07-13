import React, { useState } from 'react';
import API from '../services/api';

export default function ReportsGenerate() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const [report, setReport] = useState([]);

  const fetchDaily = () => {
    API.get('/relatorios/diario', { params: { date } }).then(r=>setReport(r.data));
  };
  const fetchMonthly = () => {
    API.get('/relatorios/mensal', { params: { year, month } }).then(r=>setReport(r.data));
  };
  const fetchByClient = () => {
    API.get('/relatorios/consumo-clientes', { params: { date } }).then(r=>setReport(r.data));
  };

  return (
    <div className="dashboard">
      <h2>Geração de Relatórios</h2>
      <div className="filters">
        <div>
          <h4>Relatório Diário</h4>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <button onClick={fetchDaily}>Gerar Diário</button>
        </div>
        <div>
          <h4>Relatório Mensal</h4>
          <input type="number" value={year} onChange={e=>setYear(e.target.value)} style={{width:'5rem'}} /> -
          <input type="number" value={month} onChange={e=>setMonth(e.target.value)} style={{width:'3rem'}} />
          <button onClick={fetchMonthly}>Gerar Mensal</button>
        </div>
        <div>
          <h4>Consumo por Cliente</h4>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <button onClick={fetchByClient}>Gerar Clientes</button>
        </div>
      </div>

      <table className="table-list">
        <thead>
          <tr>
            {report.length>0 && Object.keys(report[0]).map(key=>(
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.map((r,i)=>(
            <tr key={i}>
              {Object.values(r).map((v,j)=>(
                <td key={j}>{typeof v==='object'? JSON.stringify(v):v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
