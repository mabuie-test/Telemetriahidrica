// frontend/src/components/ClientAccounting.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { listClientInvoices, payInvoiceMpesa, payInvoice } from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null); // invoice object selecionada para pagamento
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [loadingMap, setLoadingMap] = useState({}); // loading por invoiceId
  const phoneInputRef = useRef(null);

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

  // Quando clica no botão "Pagar (M-Pesa)" — seleciona a fatura e foca input
  const onClickPayMpesa = (inv) => {
    setMsg('');
    setSelected(inv);
    setPhone(''); // limpa input para que usuario escreva
    // focus após render
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };

  // Normaliza e valida antes de enviar ao backend
  const normalizeAndBuildMsisdn = (raw) => {
    if (!raw) return null;
    let s = String(raw).trim();
    if (s.startsWith('+')) s = s.slice(1);
    // remove tudo menos dígitos
    s = s.replace(/\D/g, '');
    // Se o utilizador inseriu apenas local (84xxxxxxx — 9 dígitos) -> prefixa 258
    if (/^84\d{7}$/.test(s)) return `258${s}`;
    // Se inseriu já 258... (11 dígitos) -> usa
    if (/^258\d{8,9}$/.test(s) || /^258\d{7,9}$/.test(s)) return s;
    // se já for entre 8 e 15 dígitos e começar com outro código, aceita (cautela)
    if (/^\d{8,15}$/.test(s)) return s;
    return null;
  };

  const startMpesaPay = async () => {
    setMsg('');
    if (!selected) { setMsg('Selecione uma fatura para pagar.'); return; }

    const msisdn = normalizeAndBuildMsisdn(phone);
    if (!msisdn) {
      setMsg('Número inválido. Ex.: 84xxxxxxx ou 25884xxxxxxx.');
      phoneInputRef.current?.focus();
      return;
    }

    try {
      setLoadingMap(prev => ({ ...prev, [selected._id]: true }));
      const invoiceId = selected._id;
      const res = await payInvoiceMpesa(invoiceId, msisdn);
      setMsg(res.data?.message || 'Pedido enviado. Confirme no seu telemóvel.');
      // atualiza lista (ficará pendente até callback confirmar)
      await fetchClientInvoices();
      // mantemos a seleção para o utilizador ver o estado; podes limpar se preferires:
      // setSelected(null); setPhone('');
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
              <td>
                {inv.status === 'pendente' ? (
                  <>
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
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Pagamento — Fatura: {selected._id}</h3>
          <p><strong>Valor:</strong> {selected.total?.toFixed(2)} MZN</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ minWidth: '160px' }}>Nº M-Pesa (ex: 84xxxxxxx ou 25884xxxxxxx):</label>
            <input
              ref={phoneInputRef}
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="84xxxxxxx ou 25884xxxxxxx"
              style={{ padding: '0.4rem', width: '220px' }}
            />
            <button
              onClick={startMpesaPay}
              disabled={!!loadingMap[selected._id]}
            >
              {loadingMap[selected._id] ? 'A iniciar...' : 'Confirmar pagamento M-Pesa'}
            </button>

            <button
              onClick={() => { setSelected(null); setPhone(''); setMsg(''); }}
              style={{ marginLeft: '0.5rem' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
