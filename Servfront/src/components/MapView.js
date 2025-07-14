import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({ leituras, falhas, alertas, medidores = [] }) {
  // Centrar mapa: primeiro por leitura, senão por medidor, senão fallback
  const center = leituras.length
    ? [leituras[0].latitude, leituras[0].longitude]
    : medidores.length
      ? [medidores[0].localizacao.latitude, medidores[0].localizacao.longitude]
      : [-25.9622, 32.5808];

  return (
    <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Leituras */}
      {leituras.map(l => (
        <Marker key={`L-${l._id}`} position={[l.latitude, l.longitude]}>
          <Popup>
            {new Date(l.timestamp).toLocaleString()}<br/>
            {l.consumoDiario.toFixed(3)} m³
          </Popup>
        </Marker>
      ))}

      {/* Medidores (pontos de instalação) */}
      {medidores.map(m => (
        <CircleMarker
          key={`M-${m._id}`}
          center={[m.localizacao.latitude, m.localizacao.longitude]}
          radius={6}
          pathOptions={{ color: 'blue' }}
        >
          <Popup>
            Medidor: {m.nome}<br/>
            Cliente: {m.cliente?.nome || '—'}
          </Popup>
        </CircleMarker>
      ))}

      {/* Falhas */}
      {falhas.map(f => (
        <CircleMarker
          key={`F-${f._id}`}
          center={[f.latitude, f.longitude]}
          radius={6}
          pathOptions={{ color: 'orange' }}
        >
          <Popup>
            Falha: {f.tipo}<br/>
            Início: {new Date(f.inicio).toLocaleString()}
          </Popup>
        </CircleMarker>
      ))}

      {/* Alertas */}
      {alertas.map(a => (
        <CircleMarker
          key={`A-${a._id}`}
          center={[a.latitude, a.longitude]}
          radius={6}
          pathOptions={{ color: 'red' }}
        >
          <Popup>
            Alerta: {a.tipo}<br/>
            Data: {new Date(a.data).toLocaleString()}
          </Popup>
        </CircleMarker>
      ))}

    </MapContainer>
  );
}
