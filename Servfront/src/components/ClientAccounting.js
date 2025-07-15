import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  listClientInvoices,
  payInvoice
} from '../services/api';

export default function ClientAccounting() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg]           = useState('');

  // 1. Busca as faturas deste cliente
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

  // 2. Pagar fatura
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
                <td>{inv.consumo.toFixed(2)}</td>
                <td>{inv.total.toFixed(2)}</td>
                <td>{inv.status}</td>
                <td>
                  {inv.status === 'pendente' && (
                    <>
                      <button onClick={() => handlePay(inv._id, 'mpesa')}>
                        Mpesa
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
