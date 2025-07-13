import React, { useState } from 'react';
import API from '../services/api';

export default function ReadingsIngest() {
  const [form, setForm] = useState({
    medidorId:'', consumoDiario:0, consumoMensal:0,
    latitude:0, longitude:0, bateria:100, rssi:0, token: ''
  });
  const [msg, setMsg] = useState('');

  const submit = async e => {
    e.preventDefault();
    try {
      await API.post('/leituras', {
        medidorId: form.medidorId,
        consumoDiario: Number(form.consumoDiario),
        consumoMensal: Number(form.consumoMensal),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        bateria: Number(form.bateria),
        rssi: Number(form.rssi),
        token: form.token
      });
      setMsg('Leitura inserida com sucesso');
    } catch(err) {
      setMsg('Erro: '+err.response?.data?.error||err.message);
    }
  };

  return (
    <div className="dashboard">
      <h2>Ingestão de Leituras (Manual)</h2>
      <form onSubmit={submit} className="form-inline">
        <input placeholder="Medidor ID" value={form.medidorId} onChange={e=>setForm({...form,medidorId:e.target.value})} required />
        <input placeholder="Consumo Diário" type="number" step="0.001" value={form.consumoDiario} onChange={e=>setForm({...form,consumoDiario:e.target.value})} required />
        <input placeholder="Consumo Mensal" type="number" step="0.001" value={form.consumoMensal} onChange={e=>setForm({...form,consumoMensal:e.target.value})} required />
        <input placeholder="Lat" type="number" step="0.000001" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} />
        <input placeholder="Lng" type="number" step="0.000001" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} />
        <input placeholder="Bateria (%)" type="number" value={form.bateria} onChange={e=>setForm({...form,bateria:e.target.value})} />
        <input placeholder="RSSI" type="number" value={form.rssi} onChange={e=>setForm({...form,rssi:e.target.value})} />
        <input placeholder="Token Disp." value={form.token} onChange={e=>setForm({...form,token:e.target.value})} required />
        <button type="submit">Inserir</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}

