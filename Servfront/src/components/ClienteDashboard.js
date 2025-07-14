import React, { useContext, useEffect, useState } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function ClienteDashboard() {
  const { user } = useContext(AuthContext);
  const [medidor, setMedidor]       = useState(null);
  const [dailyReadings, setDaily]   = useState([]);
  const [monthlyTotal, setMonthly]  = useState(0);
  const [loadingMed, setLoadingMed] = useState(true);
  const [loadingDay, setLoadingDay] = useState(true);
  const [loadingMon, setLoadingMon] = useState(true);
  const [errorMed, setErrorMed]     = useState(null);
  const [errorDay, setErrorDay]     = useState(null);
  const [errorMon, setErrorMon]     = useState(null);

  const hoje = new Date().toISOString().slice(0,10);
  const ano  = new Date().getFullYear();
  const mes  = new Date().getMonth() + 1;

  // 1. Buscar detalhes do medidor
  useEffect(() => {
    if (!user.medidor) {
      setErrorMed('Nenhum medidor associado.');
      setLoadingMed(false);
      return;
    }
    API.get(`/medidores/${user.medidor}`)
      .then(res => setMedidor(res.data))
      .catch(() => setErrorMed('Erro ao carregar detalhes do contador.'))
      .finally(() => setLoadingMed(false));
  }, [user.medidor]);

  // 2. Buscar leituras diárias
  useEffect(() => {
    if (!user.medidor) {
      setErrorDay('Sem medidor para obter leituras.');
      setLoadingDay(false);
      return;
    }
    API.get('/relatorios/diario', {
      params: { date: hoje, medidorId: user.medidor }
    })
      .then(res => setDaily(res.data))
      .catch(() => setErrorDay('Erro ao carregar consumo diário.'))
      .finally(() => setLoadingDay(false));
  }, [user.medidor, hoje]);

  // 3. Buscar total mensal
  useEffect(() => {
    if (!user.medidor) {
      setErrorMon('Sem medidor para obter consumo mensal.');
      setLoadingMon(false);
      return;
    }
    API.get('/relatorios/mensal', {
      params: { year: ano, month: mes, medidorId: user.medidor }
    })
      .then(res => {
        // somar todos os consumoDiario das leituras retornadas
        const total = res.data.reduce(
          (sum, rec) => sum + (rec.consumoDiario || 0),
          0
        );
        setMonthly(total);
      })
      .catch(() => setErrorMon('Erro ao carregar consumo mensal.'))
      .finally(() => setLoadingMon(false));
  }, [user.medidor, ano, mes]);

  if (loadingMed || loadingDay || loadingMon) {
    return <div className="dashboard"><p>Carregando dados...</p></div>;
  }

  return (
    <div className="dashboard">
      <h2>Bem‑vindo, {user.nome}</h2>

      {/* Detalhes do Contador */}
      <div className="card">
        <h3>Detalhes do Contador</h3>
        {errorMed ? (
          <p className="error">{errorMed}</p>
        ) : medidor ? (
          <>
            <p><strong>Nome:</strong> {medidor.nome}</p>
            {medidor.localizacao?.latitude != null && (
              <p>
                <strong>Localização:</strong> {medidor.localizacao.latitude.toFixed(6)}, {medidor.localizacao.longitude.toFixed(6)}
              </p>
            )}
          </>
        ) : (
          <p>Nenhum dado disponível.</p>
        )}
      </div>

      {/* Consumo Diário */}
      <div className="card">
        <h3>Consumo Diário ({hoje})</h3>
        {errorDay ? (
          <p className="error">{errorDay}</p>
        ) : dailyReadings.length > 0 ? (
          <ul>
            {dailyReadings.map(l => (
              <li key={l._id}>
                {new Date(l.timestamp).toLocaleTimeString()} — {l.consumoDiario.toFixed(3)} m³
              </li>
            ))}
          </ul>
        ) : (
          <p>Sem leituras para hoje.</p>
        )}
      </div>

      {/* Consumo Mensal */}
      <div className="card">
        <h3>Consumo Mensal ({ano}-{String(mes).padStart(2,'0')})</h3>
        {errorMon ? (
          <p className="error">{errorMon}</p>
        ) : (
          <p><strong>Total:</strong> {monthlyTotal.toFixed(3)} m³</p>
        )}
      </div>
    </div>
  );
}
