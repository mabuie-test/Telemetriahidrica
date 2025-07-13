import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message: string }

  // Carrega os utilizadores
  const fetchUsers = () => {
    API.get('/users')
      .then(res => {
        setUsers(res.data);
      })
      .catch(err => {
        console.error(err);
        setFeedback({ type: 'error', message: 'Erro ao carregar utilizadores.' });
      });
  };

  useEffect(fetchUsers, []);

  // Submete o formulário (create ou update)
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/users/${editingId}`, form);
        setFeedback({ type: 'success', message: 'Utilizador atualizado com sucesso.' });
        setEditingId(null);
      } else {
        await API.post('/users', form);
        setFeedback({ type: 'success', message: 'Utilizador criado com sucesso.' });
      }
      setForm({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao salvar utilizador.' });
    }
  };

  // Inicia edição
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

  // Elimina
  const handleDelete = async id => {
    if (!window.confirm('Eliminar utilizador?')) return;
    try {
      await API.delete(`/users/${id}`);
      setFeedback({ type: 'success', message: 'Utilizador eliminado.' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Erro ao eliminar utilizador.' });
    }
  };

  return (
    <div className="dashboard">
      <h2>Gestão de Utilizadores</h2>

      {/* Feedback */}
      {feedback && (
        <p className={feedback.type === 'error' ? 'error' : 'success'}>
          {feedback.message}
        </p>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="form-inline">
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={form.senha}
          onChange={e => setForm({ ...form, senha: e.target.value })}
          required={!editingId}
        />
        <select
          value={form.papel}
          onChange={e => setForm({ ...form, papel: e.target.value })}
        >
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
        </select>
        <input
          placeholder="Medidor ID (clientes)"
          value={form.medidor}
          onChange={e => setForm({ ...form, medidor: e.target.value })}
        />
        <button type="submit">
          {editingId ? 'Atualizar' : 'Criar'}
        </button>
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

      {/* Tabela */}
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
                <button
                  type="button"
                  onClick={() => handleEdit(u)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u._id)}
                >
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
