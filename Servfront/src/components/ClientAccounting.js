// frontend/src/components/ClientAccounting.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  listClientInvoices,
  payInvoice,
  initiateMpesa,     // preferido (se existir)
  payInvoiceMpesa    // fallback (se existir no teu services)
} from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg]           = useState('');
  const [loadingMap, setLoadingMap] = useState({}); // loading por invoice
  const [phoneInputs, setPhoneInputs] = useState({}); // { invoiceId: '84xxxxxxx' }

  // Escolhe função MPESA disponível (compatibilidade)
  const mpesaFunc = initiateMpesa || payInvoiceMpesa;

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

  // normaliza input local -> só dígitos, max 9
  const normalizeLocal = v => {
    if (!v) return '';
    return String(v).replace(/\D/g, '').slice(0, 9);
  };

  const handlePhoneChange = (invoiceId, v) => {
    setPhoneInputs(prev => ({ ...prev, [invoiceId]: normalizeLocal(v) }));
  };

  // valida local: deve começar por 84 e ter exactamente 9 dígitos
  const isValidLocal = v => /^84\d{7}$/.test(v);

  const handleMpesa = async (invoiceId) => {
    setMsg('');
    setLoadingMap(prev => ({ ...prev, [invoiceId]: true }));

    try {
      const local = phoneInputs[invoiceId] || '';
      if (!local) {
        setMsg('Introduza o número local (ex: 84xxxxxxx).');
        setLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
        return;
      }
      if (!isValidLocal(local)) {
        setMsg('Número inválido. Escreva 84xxxxxxx (9 dígitos).');
        setLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
        return;
      }

      if (!mpesaFunc) {
        setMsg('Função de pagamento M-Pesa não encontrada no frontend. Contacte o administrador.');
        setLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
        return;
      }

      // prefixa automaticamente com 258
      const msisdn = `258${local}`;

      // chama a função de API (inicia o fluxo STK/USSD)
      const res = await mpesaFunc(invoiceId, msisdn);

      // UX: apenas mostramos mensagem amigável retornada pelo backend
      const message = res?.data?.message || res?.message || 'Pedido enviado. Confirme no seu telemóvel.';
      setMsg(message);

      // re-carrega faturas (callback pode demorar a chegar)
      await fetchClientInvoices();
    } catch (err) {
      console.error('handleMpesa error', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Falha ao iniciar pagamento.';
      setMsg(errMsg);
    } finally {
      setLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handlePay = async (invoiceId, method) => {
    try {
      setMsg('');
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

      <table className="table-list">
        <thead>
          <tr>
            <th>Ano</th>
            <th>Mês</th>
            <th>Consumo (m³)</th>
            <th>Total (MZN)</th>
            <th>Status</th>
            <th>Número (84xxxxxxx)</th>
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
                  <input
                    placeholder="84xxxxxxx"
                    value={phoneInputs[inv._id] || ''}
                    onChange={e => handlePhoneChange(inv._id, e.target.value)}
                    style={{ width: '9.5rem', padding: '0.3rem' }}
                  />
                </td>
                <td>
                  {inv.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => handleMpesa(inv._id)}
                        disabled={!!loadingMap[inv._id]}
                        className="mpesa-btn"
                        title="Pagar com M-Pesa"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <img src="/mpesa-logo.png" alt="M-Pesa" style={{ height: '36px', display: 'block' }} />
                      </button>

                      <button
                        onClick={() => handlePay(inv._id, 'emola')}
                        style={{ marginLeft: '0.6rem' }}
                        disabled={!!loadingMap[inv._id]}
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
              <td colSpan="7">Ainda não há faturas para você.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
