import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  getInvoice, getInvoicesHistory, payInvoice, toggleSuspend 
} from '../services/api';

export default function Accounting() {
  const { user } = useContext(AuthContext);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [month, setMonth]   = useState(new Date().getMonth()+1);
  const [invoice, setInvoice] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg]       = useState(null);

  // Buscar fatura
  const fetchInvoice = async () => {
    try {
      const res = await getInvoice({ year, month });
      setInvoice(res.data);
    } catch (err) {
      setMsg('Erro ao gerar fatura.');
    }
  };

  // Histórico
  const fetchHistory = async () => {
    const res = await getInvoicesHistory();
    setHistory(res.data);
  };

  useEffect(() => {
    fetchInvoice();
    fetchHistory();
  }, [year, month]);

  // Pagamento
  const handlePay = async method => {
    try {
      const res = await payInvoice(invoice._id, method);
      setInvoice(res.data.invoice);
      setMsg('Pagamento efetuado com sucesso!');
      fetchHistory();
    } catch {
      setMsg('Falha no pagamento.');
    }
  };

  // Suspender contador
  const handleSuspend = async () => {
    const res = await toggleSuspend(user.medidor._id);
    setMsg(res.data.suspended ? 'Contador suspenso.' : 'Contador reativado.');
  };

  return (
    <div className="dashboard">
      <h2>Contabilidade</h2>

      {msg && <p className="info">{msg}</p>}

      <div className="filters">
        <label>Ano:
          <input type="number" value={year} onChange={e=>setYear(+e.target.value)} style={{width:'5rem'}}/>
        </label>
        <label>Mês:
          <input type="number" value={month} onChange={e=>setMonth(+e.target.value)} style={{width:'3rem'}}/>
        </label>
        <button onClick={fetchInvoice}>Gerar Fatura</button>
      </div>

      {invoice && (
        <div className="card">
          <h3>Fatura {invoice.month}/{invoice.year}</h3>
          <p>Consumo: {invoice.consumo.toFixed(3)} m³</p>
          <p>Base ({consumoMinimo.x}m³): {invoice.valorBase.toFixed(2)} MZN</p>
          <p>Extra: {invoice.valorExtra.toFixed(2)} MZN</p>
          <p>Multa: {invoice.multa.toFixed(2)} MZN</p>
          <p><strong>Total: {invoice.total.toFixed(2)} MZN</strong></p>
          {invoice.status==='pendente' && (
            <>
              <button onClick={()=>handlePay('mpesa')}>Pagar Mpesa</button>
              <button onClick={()=>handlePay('emola')}>Pagar Emola</button>
            </>
          )}
        </div>
      )}

      <button onClick={handleSuspend}>{
        invoice?.status==='suspenso' ? 'Reativar Contador' : 'Suspender Contador'
      }</button>

      <section>
        <h3>Histórico de Pagamentos</h3>
        <table className="table-list">
          <thead>
            <tr><th>Data</th><th>Método</th><th>Valor</th><th>Ref.</th></tr>
          </thead>
          <tbody>
            {history.filter(h=>h.invoice===invoice?._id).map(p=>(
              <tr key={p._id}>
                <td>{new Date(p.timestamp).toLocaleString()}</td>
                <td>{p.method}</td>
                <td>{p.amount.toFixed(2)}</td>
                <td>{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
