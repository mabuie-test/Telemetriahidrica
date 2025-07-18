import React, { useState, useEffect } from 'react';
import {
  getBillingParams,
  setBillingParams,
  bulkGenerateInvoices,
  listAllInvoices
} from '../services/api';

export default function AdminAccounting() {
  const [params, setParams]     = useState({
    consumoMinimo: { x: 10, y: 5000 },
    extra:         { z: 600 },
    multaPercent:  0.1
  });
  const [year, setYear]         = useState(new Date().getFullYear());
  const [month, setMonth]       = useState(new Date().getMonth() + 1);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');

  // 1. Carrega parâmetros ao montar
  useEffect(() => {
    (async () => {
      try {
        const res = await getBillingParams();
        setParams(res.data);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar parâmetros.');
      }
    })();
  }, []);

  // 2. Salvar parâmetros
  const saveParams = async () => {
    setError('');
    setMsg('');
    try {
      const res = await setBillingParams(params);
      setParams(res.data);
      setMsg('Parâmetros atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      setError('Falha ao atualizar parâmetros.');
    }
  };

  // 3. Gerar faturas em massa
  const genBulk = async () => {
    setError('');
    setMsg('');
    try {
      await bulkGenerateInvoices({ year, month });
      setMsg('Faturas geradas para todos os clientes.');
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError('Falha na geração de faturas.');
    }
  };

  // 4. Buscar todas faturas do mês
  const fetchAll = async () => {
    setError('');
    try {
      const res = await listAllInvoices({ year, month });
      // garante array
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError('Falha ao carregar faturas.');
    }
  };

  return (
    <div className="dashboard">
      <h2>Contabilidade (Admin)</h2>

      {msg && <p className="info">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>Parâmetros de Cobrança</h3>
        <div className="form-inline">
          <label>
            X (m³):
            <input
              type="number"
              value={params.consumoMinimo.x}
              onChange={e =>
                setParams({
                  ...params,
                  consumoMinimo: {
                    ...params.consumoMinimo,
                    x: +e.target.value
                  }
                })
              }
              style={{ width: '4rem', margin: '0 1rem' }}
            />
          </label>
          <label>
            Y (MZN):
            <input
              type="number"
              value={params.consumoMinimo.y}
              onChange={e =>
                setParams({
                  ...params,
                  consumoMinimo: {
                    ...params.consumoMinimo,
                    y: +e.target.value
                  }
                })
              }
              style={{ width: '6rem', margin: '0 1rem' }}
            />
          </label>
          <label>
            Z (MZN/m³):
            <input
              type="number"
              value={params.extra.z}
              onChange={e =>
                setParams({
                  ...params,
                  extra: { z: +e.target.value }
                })
              }
              style={{ width: '5rem', margin: '0 1rem' }}
            />
          </label>
          <label>
            Multa %:
            <input
              type="number"
              step="0.01"
              value={params.multaPercent}
              onChange={e =>
                setParams({
                  ...params,
                  multaPercent: +e.target.value
                })
              }
              style={{ width: '4rem', margin: '0 1rem' }}
            />
          </label>
          <button onClick={saveParams}>Salvar Parâmetros</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>Gerar Faturas em Massa</h3>
        <div className="form-inline">
          <label>
            Ano:
            <input
              type="number"
              value={year}
              onChange={e => setYear(+e.target.value)}
              style={{ width: '5rem', margin: '0 1rem' }}
            />
          </label>
          <label>
            Mês:
            <input
              type="number"
              value={month}
              onChange={e => setMonth(+e.target.value)}
              style={{ width: '3rem', margin: '0 1rem' }}
            />
          </label>
          <button onClick={genBulk}>Gerar Faturas</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>Histórico de Faturas ({month}/{year})</h3>
        <button onClick={fetchAll}>Atualizar Lista</button>
        <table className="table-list" style={{ marginTop: '0.5rem' }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Consumo</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? invoices.map(inv => (
              <tr key={inv._id}>
                <td>
                  {inv.medidor?.cliente?.nome ?? '—'}
                </td>
                <td>{(inv.consumo ?? 0).toFixed(2)}</td>
                <td>{(inv.total ?? 0).toFixed(2)}</td>
                <td>{inv.status ?? '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4">Nenhuma fatura encontrada para este período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
