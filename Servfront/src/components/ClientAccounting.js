// frontend/src/components/ClientAccounting.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { listClientInvoices, payInvoiceMpesa } from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchClientInvoices = async () => {
    try {
      const res = await listClientInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMsg('Erro ao carregar suas faturas.');
    }
  };

  useEffect(() => { fetchClientInvoices(); }, []);

  const startMpesaPay = async () => {
    setMsg('');
    if (!selected) { setMsg('Selecione uma fatura.'); return; }

    // valida formato básico: aceita com ou sem '+', entre 8 e 15 dígitos
    const cleaned = phone.replace(/^\+/, '').replace(/\s+/g, '');
    if (!cleaned || !/^\d{8,15}$/.test(cleaned)) {
      setMsg('Insira um nº M-Pesa válido (ex: 25884xxxxxxx).');
      return;
    }

    try {
      setLoading(true);
      const invoiceId = selected._id;
      const res = await payInvoiceMpesa(invoiceId, cleaned);
      // resposta do backend: confirmação de envio para operadora
      setMsg(res.data.message || 'Pedido enviado. Confirme no seu telemóvel.');
      // atualiza lista (ficará pendente até callback confirmar)
      await fetchClientInvoices();
    } catch (err) {
      console.error('Erro pagamento:', err.response?.data || err);
      setMsg(err.response?.data?.error || 'Erro ao iniciar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h2>Minhas Faturas</h2>

      {msg && <p className="info">{msg}</p>}

      <table className="table-list">
        <thead>
          <tr>
            <th>Ano</th><th>Mês</th><th>Consumo</th><th>Total</th><th>Status</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length > 0 ? invoices.map(inv => (
            <tr key={inv._id}>
              <td>{inv.year}</td>
              <td>{inv.month}</td>
              <td>{(inv.consumo ?? 0).toFixed(2)}</td>
              <td>{(inv.total ?? 0).toFixed(2)}</td>
              <td>{inv.status}</td>
              <td>
                <button onClick={() => setSelected(inv)}>
                  {selected && selected._id === inv._id ? 'Selecionada' : 'Selecionar'}
                </button>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="6">Ainda não há faturas para você.</td></tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Pagamento — Fatura: {selected._id}</h3>
          <p><strong>Valor:</strong> {selected.total?.toFixed(2)} MZN</p>

          <label>Nº M-Pesa (ex: 25884xxxxxxx):</label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="25884xxxxxxx"
            style={{ marginLeft: '0.5rem' }}
          />

          <div style={{ marginTop: '0.5rem' }}>
            <button onClick={startMpesaPay} disabled={loading}>
              {loading ? 'A iniciar...' : 'Pagar via M-Pesa'}
            </button>
            <button onClick={() => { setSelected(null); setPhone(''); setMsg(''); }} style={{ marginLeft: '0.5rem' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
