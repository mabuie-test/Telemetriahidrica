// frontend/src/components/ClientAccounting.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { listClientInvoices, payInvoiceMpesa, payInvoice } from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null); // invoice object selecionada para pagamento
  const [localPart, setLocalPart] = useState(''); // parte editável do número (ex: 84xxxxxxx)
  const [msg, setMsg] = useState('');
  const [loadingMap, setLoadingMap] = useState({}); // loading por invoiceId
  const localInputRef = useRef(null);

  const PREFIX = '258'; // prefixo fixo e não editável
  const MPESA_LOGO = '/mpesa-logo.png'; // coloque a imagem em public/

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

  // Atualiza uma fatura no estado local (usado para marcar 'paga' imediatamente)
  const updateInvoiceStatusLocal = (invoiceId, status) => {
    setInvoices(prev => prev.map(inv => inv._id === invoiceId ? { ...inv, status } : inv));
  };

  // Quando clica no botão/logo "Pagar (M-Pesa)" — seleciona a fatura, predefine localPart e foca input
  const onClickPayMpesa = (inv) => {
    setMsg('');
    setSelected(inv);
    // prefaz a parte local como "84" para facilitar se utilizador escrever só resto
    setLocalPart('84');
    setTimeout(() => {
      const input = localInputRef.current;
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }, 60);
  };

  // Normaliza e valida antes de enviar ao backend
  const normalizeAndBuildMsisdn = (localRaw) => {
    if (!localRaw) return null;
    let s = String(localRaw).trim();
    if (s.startsWith('+')) s = s.slice(1);
    s = s.replace(/\D/g, '');

    if (/^258\d{7,9}$/.test(s)) return s;
    if (/^84\d{7}$/.test(s)) return `${PREFIX}${s}`;
    if (/^\d{7,9}$/.test(s)) {
      if (/^8\d{7,8}$/.test(s)) return `${PREFIX}${s}`;
      if (/^\d{8,15}$/.test(s)) return s;
    }
    return null;
  };

  const startMpesaPay = async () => {
    setMsg('');
    if (!selected) { setMsg('Selecione uma fatura para pagar.'); return; }

    const msisdn = normalizeAndBuildMsisdn(localPart);
    if (!msisdn) {
      setMsg('Número inválido. Escreva ex.: 84xxxxxxx (o prefixo 258 é automático).');
      localInputRef.current?.focus();
      return;
    }

    try {
      setLoadingMap(prev => ({ ...prev, [selected._id]: true }));
      const invoiceId = selected._id;
      const res = await payInvoiceMpesa(invoiceId, msisdn);

      setMsg(res.data?.message || 'Pedido enviado. Confirme no seu telemóvel.');

      const raw = res.data?.raw || res.data;
      const code = raw?.output_ResponseCode || raw?.responseCode || raw?.status || raw?.code;

      // Se operadora devolveu INS-0 no initiate → sucesso imediato
      if (typeof code === 'string' && code.startsWith('INS-0')) {
        updateInvoiceStatusLocal(invoiceId, 'paga');
        setSelected(null);
        setLocalPart('');
      } else {
        // aguarda callback → atualiza lista para refletir pendente
        await fetchClientInvoices();
      }
    } catch (err) {
      console.error('Erro pagamento M-Pesa:', err?.response?.data || err);
      setMsg(err?.response?.data?.error || err?.message || 'Erro ao iniciar pagamento.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [selected?._id]: false }));
    }
  };

  const handleEmola = async (invoiceId) => {
    try {
      setMsg('');
      setLoadingMap(prev => ({ ...prev, [invoiceId]: true }));
      await payInvoice(invoiceId, 'emola');
      setMsg('Pagamento Emola registado com sucesso.');
      await fetchClientInvoices();
    } catch (err) {
      console.error('Erro Emola:', err);
      setMsg('Falha no pagamento Emola.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
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
            <th>Ações</th>
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
              <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {inv.status === 'pendente' ? (
                  <>
                    {/* Logo clicável nas ações (onde antes estava o botão-com-imagem) */}
                    <img
                      src={MPESA_LOGO}
                      alt="Pagar com M-Pesa"
                      className="action-mpesa-logo"
                      role="button"
                      tabIndex={0}
                      onClick={() => onClickPayMpesa(inv)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClickPayMpesa(inv); }}
                      title="Pagar via M-Pesa"
                      style={{ cursor: 'pointer' }}
                    />

                    {/* Texto botão para seleção (mantém acessibilidade) */}
                    <button
                      onClick={() => onClickPayMpesa(inv)}
                      disabled={!!loadingMap[inv._id]}
                      title="Pagar via M-Pesa"
                    >
                      Pagar (M-Pesa)
                    </button>

                    <button
                      onClick={() => handleEmola(inv._id)}
                      disabled={!!loadingMap[inv._id]}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      Emola
                    </button>
                  </>
                ) : (
                  <em>-</em>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6">Ainda não há faturas para você.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Painel de pagamento que aparece quando selected != null */}
      {selected && (
        <div className="card payment-panel" style={{ marginTop: '1rem' }}>
          <h3>Pagamento — Fatura: {selected._id}</h3>
          <p><strong>Valor:</strong> {selected.total?.toFixed(2)} MZN</p>

          <div className="payment-row">
            <label className="payment-label">Prefixo:</label>
            <input className="payment-prefix" type="text" value={PREFIX} disabled />

            <label className="payment-label">Número local:</label>
            <input
              ref={localInputRef}
              className="payment-local"
              type="text"
              value={localPart}
              onChange={e => setLocalPart(e.target.value)}
              placeholder="84xxxxxxx"
              inputMode="numeric"
              pattern="\d*"
            />

            <button
              className="mpesa-btn"
              onClick={startMpesaPay}
              disabled={!!loadingMap[selected._id]}
            >
              {loadingMap[selected._id] ? 'A iniciar...' : 'Confirmar pagamento M-Pesa'}
            </button>

            <button
              className="btn-cancel"
              onClick={() => { setSelected(null); setLocalPart(''); setMsg(''); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
