import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({ leituras, falhas, alertas }) {
  const center = leituras.length
    ? [leituras[0].latitude, leituras[0].longitude]
    : [-25.9622, 32.5808]; // posição padrão

  return (
    <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {leituras.map(l => (
        <Marker key={l._id} position={[l.latitude, l.longitude]}>
          <Popup>
            Consumo Diário: {l.consumoDiario.toFixed(3)} m³<br/>
            Timestamp: {new Date(l.timestamp).toLocaleString()}
          </Popup>
        </Marker>
      ))}
      {falhas.map(f => (
        <CircleMarker
          key={f._id}
          center={[f.latitude, f.longitude]}
          radius={8}
          pathOptions={{ color: 'orange' }}
        >
          <Popup>
            Falha: {f.tipo}<br/>
            Início: {new Date(f.inicio).toLocaleString()}
          </Popup>
        </CircleMarker>
      ))}
      {alertas.map(a => (
        <CircleMarker
          key={a._id}
          center={[a.latitude, a.longitude]}
          radius={8}
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
