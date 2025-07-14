import React, { useContext, useEffect, useState } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function ClienteDashboard() {
  const { user } = useContext(AuthContext);
  const [medidor, setMedidor]       = useState(null);
  const [dailyReadings, setDaily]   = useState([]);
  const [monthlyTotal, setMonthly]  = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const hoje = new Date().toISOString().slice(0,10);
  const ano  = new Date().getFullYear();
  const mes  = new Date().getMonth() + 1;

  useEffect(() => {
    const fetchClient = async () => {
      try {
        if (!user.medidor || !user.medidor._id) {
          throw new Error('Nenhum contador associado ao seu perfil.');
        }

        // 1. Detalhes do medidor (já populado em user.medidor)
        setMedidor(user.medidor);

        // 2. Consumo diário do cliente
        const rDay = await API.get('/relatorios/diario', {
          params: { date: hoje, medidorId: user.medidor._id }
        });
        setDaily(Array.isArray(rDay.data) ? rDay.data : []);

        // 3. Consumo mensal do cliente
        const rMonth = await API.get('/relatorios/mensal', {
          params: { year: ano, month: mes, medidorId: user.medidor._id }
        });
        const total = (Array.isArray(rMonth.data) ? rMonth.data : [])
          .reduce((sum, rec) =>
            sum + (typeof rec.consumoDiario === 'number' ? rec.consumoDiario : 0),
            0
          );
        setMonthly(total);

      } catch (err) {
        console.error('ClienteDashboard fetch error:', err);
        setError(err.message || 'Erro ao carregar dados do cliente.');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [user.medidor, hoje, ano, mes]);

  if (loading) {
    return <div className="dashboard"><p>Carregando seus dados...</p></div>;
  }

  return (
    <div className="dashboard">
      <h2>Bem‑vindo, {user.nome}</h2>

      {error && <p className="error">{error}</p>}

      {medidor && (
        <div className="card">
          <h3>Detalhes do Contador</h3>
          <p><strong>Nome:</strong> {medidor.nome}</p>
          {medidor.localizacao?.latitude != null && (
            <p>
              <strong>Localização:</strong>{' '}
              {medidor.localizacao.latitude.toFixed(6)},{' '}
              {medidor.localizacao.longitude.toFixed(6)}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h3>Consumo Diário ({hoje})</h3>
        {dailyReadings.length > 0 ? (
          <ul>
            {dailyReadings.map(l => (
              <li key={l._id}>
                {new Date(l.timestamp).toLocaleTimeString()} —{' '}
                {l.consumoDiario.toFixed(3)} m³
              </li>
            ))}
          </ul>
        ) : (
          <p>Sem leituras para hoje.</p>
        )}
      </div>

      <div className="card">
        <h3>Consumo Mensal ({ano}-{String(mes).padStart(2,'0')})</h3>
        <p>
          <strong>Total:</strong> {monthlyTotal.toFixed(3)} m³
        </p>
      </div>
    </div>
  );
}
