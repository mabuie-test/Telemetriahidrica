// frontend/src/components/ClientAccounting.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  listClientInvoices,
  payInvoice,
  payInvoiceMpesa
} from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg]           = useState('');
  const [rawResp, setRawResp]   = useState(null);
  const [loading, setLoading]   = useState(false);

  const fetchClientInvoices = async () => {
    try {
      const res = await listClientInvoices();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMsg('Erro ao carregar suas faturas.');
    }
  };

  useEffect(() => {
    fetchClientInvoices();
  }, []);

  // Pagar (mpesa) — pedimos número via prompt (simples) e mostramos raw response
  const handleMpesa = async (invoiceId) => {
    setMsg('');
    setRawResp(null);
    const phone = window.prompt('Digite o número M-Pesa com código do país (ex: 25884XXXXXXX):');
    if (!phone) return;
    // validação simples
    const cleaned = phone.replace(/\s+/g,'');
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      setMsg('Número inválido. Use formato: 25884XXXXXXX');
      return;
    }
    setLoading(true);
    try {
      const res = await payInvoiceMpesa(invoiceId, cleaned);
      // mostra mensagem e raw (da vodacom)
      setMsg(res.data?.message || 'Pedido enviado. Confirme no seu telemóvel.');
      setRawResp(res.data?.raw || res.data?.details || res.data);
      // recarrega faturas (podemos ver estado pendente)
      await fetchClientInvoices();
    } catch (err) {
      console.error('payMpesa error', err);
      setMsg(err.response?.data?.error || 'Falha ao iniciar pagamento.');
      setRawResp(err.response?.data?.details || err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pagar via métodos existentes (mpesa via /contabilidade/pay etc)
  const handlePay = async (invoiceId, method) => {
    try {
      await payInvoice(invoiceId, method);
      setMsg('Pagamento efetuado com sucesso!');
      fetchClientInvoices();
    } catch (err) {
      console.error(err);
      setMsg('Falha no pagamento.');
    }
  };

  return (
    <div className="dashboard">
      <h2>Minhas Faturas</h2>

      {msg && <p className="info">{msg}</p>}
      {rawResp && (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h4>Resposta Operadora (raw)</h4>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
            {typeof rawResp === 'string' ? rawResp : JSON.stringify(rawResp, null, 2)}
          </pre>
        </section>
      )}

      <table className="table-list">
        <thead>
          <tr>
            <th>Ano</th>
            <th>Mês</th>
            <th>Consumo (m³)</th>
            <th>Total (MZN)</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length > 0 ? (
            invoices.map(inv => (
              <tr key={inv._id}>
                <td>{inv.year}</td>
                <td>{inv.month}</td>
                <td>{(inv.consumo ?? 0).toFixed(2)}</td>
                <td>{(inv.total ?? 0).toFixed(2)}</td>
                <td>{inv.status}</td>
                <td>
                  {inv.status === 'pendente' && (
                    <>
                      <button onClick={() => handleMpesa(inv._id)} disabled={loading}>
                        Pagar (M-Pesa)
                      </button>
                      <button onClick={() => handlePay(inv._id, 'mpesa')} style={{ marginLeft: '0.5rem' }}>
                        Mpesa (marcar)
                      </button>
                      <button
                        onClick={() => handlePay(inv._id, 'emola')}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Emola
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">Ainda não há faturas para você.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
