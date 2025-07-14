import React, { useEffect, useState } from 'react';
import API from '../services/api';
import ReportClientes from './ReportClientes';
import MapView from './MapView';

export default function AdminDashboard() {
  const [leituras, setLeituras] = useState([]);
  const [falhas, setFalhas]     = useState([]);
  const [alertas, setAlertas]   = useState([]);
  const [medidores, setMedidores] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get('/leituras'),
      API.get('/falhas'),
      API.get('/alertas'),
      API.get('/medidores')
    ]).then(([L, F, A, M]) => {
      setLeituras(L.data);
      setFalhas(F.data);
      setAlertas(A.data);
      setMedidores(M.data);
    });
  }, []);

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>
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
        <ReportClientes />
      </section>
    </div>
  );
}
