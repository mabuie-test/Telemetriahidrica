import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function MedidoresList() {
  const [meds, setMeds] = useState([]);
  const [form, setForm] = useState({
    nome: '',
    cliente: '',
    latitude: '',
    longitude: '',
    tokenDispositivo: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Carrega contadores
  const fetch = () => {
    API.get('/medidores')
      .then(r => setMeds(r.data))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar contadores.' }));
  };
  useEffect(fetch, []);

  // Submissão de criar/atualizar
  const submit = async e => {
    e.preventDefault();

    // Monta payload garantindo tipos corretos
    const payload = {
      nome: form.nome,
      tokenDispositivo: form.tokenDispositivo,
      localizacao: {}
    };

    // Converte latitude e longitude para Number se não vazios
    if (form.latitude !== '') payload.localizacao.latitude = Number(form.latitude);
    if (form.longitude !== '') payload.localizacao.longitude = Number(form.longitude);

    // Inclui cliente só se for ObjectId válido
    if (/^[0-9a-fA-F]{24}$/.test(form.cliente)) {
      payload.cliente = form.cliente;
    }

    try {
      if (editingId) {
        await API.put(`/medidores/${editingId}`, payload);
        setFeedback({ type: 'success', message: 'Contador atualizado com sucesso.' });
        setEditingId(null);
      } else {
        await API.post('/medidores', payload);
        setFeedback({ type: 'success', message: 'Contador criado com sucesso.' });
      }
      // limpa form e recarrega lista
      setForm({ nome: '', cliente: '', latitude: '', longitude: '', tokenDispositivo: '' });
      fetch();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Erro ao salvar contador.'
      });
    }
  };

  // Inicia edição
  const edit = m => {
    setEditingId(m._id);
    setForm({
      nome: m.nome,
      cliente: m.cliente?._id || '',
      latitude: m.localizacao.latitude ?? '',
      longitude: m.localizacao.longitude ?? '',
      tokenDispositivo: m.tokenDispositivo
    });
    setFeedback(null);
  };

  // Elimina contador
  const del = async id => {
    if (!window.confirm('Eliminar contador?')) return;
    try {
      await API.delete(`/medidores/${id}`);
      setFeedback({ type: 'success', message: 'Contador eliminado.' });
      fetch();
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao eliminar contador.' });
    }
  };

  return (
    <div className="dashboard">
      <h2>Gestão de Contadores</h2>

      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      <form onSubmit={submit} className="form-inline">
        <input
          placeholder="Nome do Contador"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          required
        />
        <input
          placeholder="Cliente ID (24 hex)"
          value={form.cliente}
          onChange={e => setForm({ ...form, cliente: e.target.value })}
        />
        <input
          placeholder="Latitude"
          value={form.latitude}
          onChange={e => setForm({ ...form, latitude: e.target.value })}
        />
        <input
          placeholder="Longitude"
          value={form.longitude}
          onChange={e => setForm({ ...form, longitude: e.target.value })}
        />
        <input
          placeholder="Token Dispositivo"
          value={form.tokenDispositivo}
          onChange={e => setForm({ ...form, tokenDispositivo: e.target.value })}
          required
        />
        <button type="submit">
          {editingId ? 'Atualizar' : 'Criar'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ nome: '', cliente: '', latitude: '', longitude: '', tokenDispositivo: '' });
              setFeedback(null);
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <table className="table-list">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cliente</th>
            <th>Lat,Lng</th>
            <th>Token</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {meds.map(m => (
            <tr key={m._id}>
              <td>{m.nome}</td>
              <td>{m.cliente?.nome || '-'}</td>
              <td>
                {m.localizacao.latitude ?? '-'}, {m.localizacao.longitude ?? '-'}
              </td>
              <td>{m.tokenDispositivo}</td>
              <td>
                <button type="button" onClick={() => edit(m)}>
                  Editar
                </button>
                <button type="button" onClick={() => del(m._id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
