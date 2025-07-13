import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ChartConsumo({ data }) {
  const sorted = [...data].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  const chartData = {
    labels: sorted.map(d => new Date(d.timestamp)),
    datasets: [
      {
        label: 'Consumo Diário (m³)',
        data: sorted.map(d => d.consumoDiario),
        fill: false,
        tension: 0.4
      }
    ]
  };

  const options = {
    scales: {
      x: { type: 'time', time: { unit: 'day' } },
      y: { beginAtZero: true }
    }
  };

  return <Line data={chartData} options={options} />;
}
