import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchUsers = () => {
    API.get('/users').then(res => setUsers(res.data));
  };

  useEffect(fetchUsers, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (editingId) {
      await API.put(`/users/${editingId}`, form);
      setEditingId(null);
    } else {
      await API.post('/users', form);
    }
    setForm({ nome: '', email: '', senha: '', papel: 'cliente', medidor: '' });
    fetchUsers();
  };

  const handleEdit = u => {
    setEditingId(u._id);
    setForm({ nome: u.nome, email: u.email, senha: '', papel: u.papel, medidor: u.medidor?._id || '' });
  };

  const handleDelete = async id => {
    if (window.confirm('Eliminar utilizador?')) {
      await API.delete(`/users/${id}`);
      fetchUsers();
    }
  };

  return (
    <div className="dashboard">
      <h2>Gestão de Utilizadores</h2>
      <form onSubmit={handleSubmit} className="form-inline">
        <input placeholder="Nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
        <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        <input type="password" placeholder="Senha" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} required={!editingId} />
        <select value={form.papel} onChange={e => setForm({...form, papel: e.target.value})}>
          <option value="admin">Admin</option>
          <option value="cliente">Cliente</option>
        </select>
        <input placeholder="Medidor ID (clientes)" value={form.medidor} onChange={e => setForm({...form, medidor: e.target.value})} />
        <button type="submit">{editingId ? 'Actualizar' : 'Criar'}</button>
        {editingId && <button type="button" onClick={()=>{setEditingId(null); setForm({nome:'',email:'',senha:'',papel:'cliente',medidor:''});}}>Cancelar</button>}
      </form>
      <table className="table-list">
        <thead>
          <tr><th>Nome</th><th>Email</th><th>Papel</th><th>Medidor</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.nome}</td>
              <td>{u.email}</td>
              <td>{u.papel}</td>
              <td>{u.medidor?.nome || '-'}</td>
              <td>
                <button onClick={()=>handleEdit(u)}>Editar</button>
                <button onClick={()=>handleDelete(u._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
