import React, { useState } from 'react';
import {
  setBillingParams,
  bulkGenerateInvoices,
  listAllInvoices
} from '../services/api';

export default function AdminAccounting() {
  const [params, setParams]           = useState({ consumoMinimo:{ x:10,y:5000 }, extra:{z:600}, multaPercent:0.1 });
  const [year, setYear]               = useState(new Date().getFullYear());
  const [month, setMonth]             = useState(new Date().getMonth()+1);
  const [invoices, setInvoices]       = useState([]);
  const [msg, setMsg]                 = useState('');

  // Carrega parâmetros ao montar...
  React.useEffect(() => {
    // Se tiver um endpoint GET /params, buscar e setar aqui
  }, []);

  const saveParams = async () => {
    try {
      const res = await setBillingParams(params);
      setMsg('Parâmetros atualizados');
      setParams(res.data);
    } catch { setMsg('Falha ao atualizar parâmetros'); }
  };

  const genBulk = async () => {
    try {
      await bulkGenerateInvoices({ year, month });
      setMsg('Faturas geradas');
      fetchAll();
    } catch { setMsg('Falha na geração'); }
  };

  const fetchAll = async () => {
    const res = await listAllInvoices({ year, month });
    setInvoices(res.data);
  };

  return (
    <div className="dashboard">
      <h2>Contabilidade (Admin)</h2>
      {msg && <p className="info">{msg}</p>}

      <section className="card">
        <h3>Parâmetros de Cobrança</h3>
        {/* Inputs para params.consumoMinimo.x, y; extra.z; multaPercent */}
        {/* Botão saveParams() */}
      </section>

      <section className="card">
        <h3>Gerar Faturas em Massa</h3>
        {/* Inputs para year, month e botão genBulk() */}
      </section>

      <section className="card">
        <h3>Histórico de Faturas ({month}/{year})</h3>
        <button onClick={fetchAll}>Atualizar Lista</button>
        <table className="table-list">
          <thead><tr>
            <th>Cliente</th><th>Consumo</th><th>Total</th><th>Status</th>
          </tr></thead>
          <tbody>
            {invoices.map(inv=>(
              <tr key={inv._id}>
                <td>{inv.medidor.cliente.nome}</td>
                <td>{inv.consumo.toFixed(2)}</td>
                <td>{inv.total.toFixed(2)}</td>
                <td>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
