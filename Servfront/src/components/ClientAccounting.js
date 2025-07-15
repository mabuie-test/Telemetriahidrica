import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getInvoice,
  listInvoicesHistory,
  payInvoice,
  toggleSuspendMedidor
} from '../services/api';

export default function Accounting() {
  const { user } = useContext(AuthContext);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [month, setMonth]       = useState(new Date().getMonth() + 1);
  const [invoice, setInvoice]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [msg, setMsg]           = useState(null);

  // Busca a fatura corrente
  const fetchInvoice = async () => {
    try {
      const res = await getInvoice({ year, month });
      setInvoice(res.data);
    } catch (err) {
      console.error(err);
      setMsg('Erro ao gerar fatura.');
    }
  };

  // Busca histórico de faturas/pagamentos
  const fetchHistory = async () => {
    try {
      const res = await listInvoicesHistory();
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMsg('Erro ao carregar histórico.');
    }
  };

  useEffect(() => {
    fetchInvoice();
    fetchHistory();
  }, [year, month]);

  // Pagamento
  const handlePay = async method => {
    if (!invoice) return;
    try {
      const res = await payInvoice(invoice._id, method);
      setInvoice(res.data.invoice);
      setMsg('Pagamento efetuado com sucesso!');
      fetchHistory();
    } catch (err) {
      console.error(err);
      setMsg('Falha no pagamento.');
    }
  };

  // Suspender / reativar contador
  const handleSuspend = async () => {
    if (!invoice) return;
    try {
      const medidorId = user.medidor._id || user.medidor;
      const res = await toggleSuspendMedidor(medidorId);
      setMsg(res.data.suspended ? 'Contador suspenso.' : 'Contador reativado.');
      // Opcional: Atualizar fatura para refletir status
      fetchInvoice();
    } catch (err) {
      console.error(err);
      setMsg('Falha ao alterar estado do contador.');
    }
  };

  return (
    <div className="dashboard">
      <h2>Contabilidade</h2>

      {msg && <p className="info">{msg}</p>}

      <div className="filters">
        <label>
          Ano:
          <input
            type="number"
            value={year}
            onChange={e => setYear(+e.target.value)}
            style={{ width: '5rem', marginLeft: '0.5rem' }}
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Mês:
          <input
            type="number"
            value={month}
            onChange={e => setMonth(+e.target.value)}
            style={{ width: '3rem', marginLeft: '0.5rem' }}
          />
        </label>
        <button onClick={fetchInvoice} style={{ marginLeft: '1rem' }}>
          Gerar Fatura
        </button>
      </div>

      {invoice && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Fatura {invoice.month}/{invoice.year}</h3>
          <p>Consumo: {invoice.consumo.toFixed(3)} m³</p>
          <p>Valor Base: {invoice.valorBase.toFixed(2)} MZN</p>
          <p>Valor Extra: {invoice.valorExtra.toFixed(2)} MZN</p>
          <p>Multa: {invoice.multa.toFixed(2)} MZN</p>
          <p><strong>Total: {invoice.total.toFixed(2)} MZN</strong></p>

          {invoice.status === 'pendente' && (
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => handlePay('mpesa')}>Pagar Mpesa</button>
              <button onClick={() => handlePay('emola')} style={{ marginLeft: '0.5rem' }}>
                Pagar Emola
              </button>
            </div>
          )}

          {user.papel === 'admin' && (
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleSuspend}>
                {invoice.status === 'suspenso' ? 'Reativar Contador' : 'Suspender Contador'}
              </button>
            </div>
          )}
        </div>
      )}

      <section style={{ marginTop: '2rem' }}>
        <h3>Histórico de Faturas</h3>
        <table className="table-list">
          <thead>
            <tr>
              <th>Ano</th><th>Mês</th><th>Status</th><th>Total (MZN)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((inv) => (
              <tr key={inv._id}>
                <td>{inv.year}</td>
                <td>{inv.month}</td>
                <td>{inv.status}</td>
                <td>{inv.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
