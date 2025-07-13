// src/components/ReadingsIngest.js
import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function ReadingsIngest() {
  const [meds, setMeds] = useState([]);
  const [form, setForm] = useState({
    medidorId: '',
    consumoDiario: '',
    consumoMensal: '',
    latitude: '',
    longitude: '',
    bateria: '',
    rssi: '',
    token: ''
  });
  const [feedback, setFeedback] = useState(null);

  // Carrega lista de medidores
  useEffect(() => {
    API.get('/medidores')
      .then(r => setMeds(r.data))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar contadores.' }));
  }, []);

  // Submete leitura
  const submit = async e => {
    e.preventDefault();
    const payload = {
      medidorId: form.medidorId,
      consumoDiario: Number(form.consumoDiario),
      consumoMensal: Number(form.consumoMensal),
      latitude: form.latitude !== '' ? Number(form.latitude) : undefined,
      longitude: form.longitude !== '' ? Number(form.longitude) : undefined,
      bateria: form.bateria !== '' ? Number(form.bateria) : undefined,
      rssi: form.rssi !== '' ? Number(form.rssi) : undefined,
      token: form.token
    };

    try {
      await API.post('/leituras', payload);
      setFeedback({ type: 'success', message: 'Leitura inserida com sucesso.' });
      // limpa form
      setForm({
        medidorId: '',
        consumoDiario: '',
        consumoMensal: '',
        latitude: '',
        longitude: '',
        bateria: '',
        rssi: '',
        token: ''
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Erro ao inserir leitura.'
      });
    }
  };

  return (
    <div className="dashboard">
      <h2>Ingestão de Leituras (Manual)</h2>

      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      <form onSubmit={submit} className="form-inline">
        {/* Dropdown de medidores */}
        <select
          required
          value={form.medidorId}
          onChange={e => setForm({ ...form, medidorId: e.target.value })}
        >
          <option value="">— Selecione um Contador —</option>
          {meds.map(m => (
            <option key={m._id} value={m._id}>
              {m.nome} ({m._id.slice(-6)})
            </option>
          ))}
        </select>

        <input
          placeholder="Consumo Diário (m³)"
          type="number"
          step="0.001"
          value={form.consumoDiario}
          onChange={e => setForm({ ...form, consumoDiario: e.target.value })}
          required
        />
        <input
          placeholder="Consumo Mensal (m³)"
          type="number"
          step="0.001"
          value={form.consumoMensal}
          onChange={e => setForm({ ...form, consumoMensal: e.target.value })}
          required
        />
        <input
          placeholder="Latitude"
          type="number"
          step="0.000001"
          value={form.latitude}
          onChange={e => setForm({ ...form, latitude: e.target.value })}
        />
        <input
          placeholder="Longitude"
          type="number"
          step="0.000001"
          value={form.longitude}
          onChange={e => setForm({ ...form, longitude: e.target.value })}
        />
        <input
          placeholder="Bateria (%)"
          type="number"
          value={form.bateria}
          onChange={e => setForm({ ...form, bateria: e.target.value })}
        />
        <input
          placeholder="RSSI"
          type="number"
          value={form.rssi}
          onChange={e => setForm({ ...form, rssi: e.target.value })}
        />
        <input
          placeholder="Token Dispositivo"
          value={form.token}
          onChange={e => setForm({ ...form, token: e.target.value })}
          required
        />

        <button type="submit">Inserir Leitura</button>
      </form>
    </div>
  );
}
