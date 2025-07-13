import React, { useEffect, useState } from 'react';
import API from '../services/api';
import MapView from './MapView';
import ChartConsumo from './ChartConsumo';
import FalhasList from './FalhasList';
import AlertasList from './AlertasList';

export default function Dashboard() {
  const [leituras, setLeituras] = useState([]);
  const [falhas, setFalhas]     = useState([]);
  const [alertas, setAlertas]   = useState([]);

  useEffect(() => {
    async function fetchData() {
      const [L, F, A] = await Promise.all([
        API.get('/leituras'),
        API.get('/falhas'),
        API.get('/alertas')
      ]);
      setLeituras(L.data);
      setFalhas(F.data);
      setAlertas(A.data);
    }
    fetchData();
  }, []);

  return (
    <div className="dashboard">
      <section className="section-map">
        <h2>Mapa de Pontos</h2>
        <MapView leituras={leituras} falhas={falhas} alertas={alertas} />
      </section>
      <section className="section-charts">
        <h2>Gráfico de Consumo Diário</h2>
        <ChartConsumo data={leituras} />
      </section>
      <section className="section-lists">
        <div className="list-container">
          <h2>Falhas Detectadas</h2>
          <FalhasList falhas={falhas} />
        </div>
        <div className="list-container">
          <h2>Alertas de Adulteração</h2>
          <AlertasList alertas={alertas} />
        </div>
      </section>
    </div>
  );
}
