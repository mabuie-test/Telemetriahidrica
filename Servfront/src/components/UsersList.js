import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [meds, setMeds] = useState([]);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    papel: 'cliente',
    medidor: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Carregar utilizadores
  const fetchUsers = () => {
    API.get('/users')
      .then(res => setUsers(res.data))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar utilizadores.' }));
  };
  // Carregar medidores para dropdown
  const fetchMeds = () => {
    API.get('/medidores')
      .then(r => setMeds(r.data))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar contadores.' }));
  };

  useEffect(() => {
    fetchUsers();
    fetchMeds();
  }, []);

  // Criar / atualizar utilizador
  const handleSubmit = async e => {
    e.preventDefault();
    const payload = { nome: form.nome, email: form.email, papel: form.papel };
    if (!editingId) payload.senha = form.senha;
    if (form.papel === 'cliente' && /^[0-9a-fA-F]{24}$/.test(form.medidor)) {
      payload.medidor = form.medidor;
    }

    try {
      if (editingId) {
        await API.put(`/users/${editingId}`, payload);
        setFeedback({ type: 'success', message: 'Utilizador atualizado com sucesso.' });
        setEditingId(null);
      } else {
        await API.post('/users', payload);
        setFeedback({ type: 'success', message: 'Utilizador criado com sucesso.' });
      }
      setForm({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Erro ao salvar utilizador.'
      });
    }
  };

  // Preparar edição
  const handleEdit = u => {
    setEditingId(u._id);
    setForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      papel: u.papel,
      medidor: u.medidor?._id || ''
    });
    setFeedback(null);
  };

  // Eliminar utilizador
  const handleDelete = async id => {
    if (!window.confirm('Eliminar utilizador?')) return;
    try {
      await API.delete(`/users/${id}`);
      setFeedback({ type: 'success', message: 'Utilizador eliminado.' });
      fetchUsers();
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao eliminar utilizador.' });
    }
  };

  return (
    <div className="dashboard">
      <h2>Gestão de Utilizadores</h2>

      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="form-inline">
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />
        {!editingId && (
          <input
            type="password"
            placeholder="Senha"
            value={form.senha}
            onChange={e => setForm({ ...form, senha: e.target.value })}
            required
          />
        )}
        <select
          value={form.papel}
          onChange={e => setForm({ ...form, papel: e.target.value, medidor: '' })}
        >
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
        </select>
        {form.papel === 'cliente' && (
          <select
            value={form.medidor}
            onChange={e => setForm({ ...form, medidor: e.target.value })}
          >
            <option value="">— Sem Medidor —</option>
            {meds.map(m => (
              <option key={m._id} value={m._id}>
                {m.nome} ({m._id.slice(-6)})
              </option>
            ))}
          </select>
        )}
        <button type="submit">{editingId ? 'Atualizar' : 'Criar'}</button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
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
            <th>Email</th>
            <th>Papel</th>
            <th>Medidor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.nome}</td>
              <td>{u.email}</td>
              <td>{u.papel}</td>
              <td>{u.medidor?.nome || '-'}</td>
              <td>
                <button type="button" onClick={() => handleEdit(u)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(u._id)}>
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
