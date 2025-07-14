import React, { useEffect, useState } from 'react';
import API from '../services/api';
import ReportClientes from './ReportClientes';
import MapView from './MapView';

export default function AdminDashboard() {
  const [leituras, setLeituras]   = useState([]);
  const [falhas, setFalhas]       = useState([]);
  const [alertas, setAlertas]     = useState([]);
  const [medidores, setMedidores] = useState([]);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [L, F, A, M] = await Promise.all([
          API.get('/leituras'),
          API.get('/falhas'),
          API.get('/alertas'),
          API.get('/medidores')
        ]);
        setLeituras(Array.isArray(L.data) ? L.data : []);
        setFalhas(Array.isArray(F.data)   ? F.data : []);
        setAlertas(Array.isArray(A.data) ? A.data : []);
        setMedidores(Array.isArray(M.data) ? M.data : []);
      } catch (err) {
        console.error('AdminDashboard fetch error:', err);
        setError('Não foi possível carregar alguns dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <div className="dashboard"><p>Carregando dados do Admin...</p></div>;
  }

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>

      {error && <p className="error">{error}</p>}

      <section>
        <h3>Mapa de Pontos</h3>
        <MapView
          leituras={leituras}
          falhas={falhas}
          alertas={alertas}
          medidores={medidores}
        />
      </section>

      <section>
        <h3>Relatórios</h3>
        <ReportClientes />
      </section>
    </div>
  );
}
