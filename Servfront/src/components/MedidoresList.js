import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function MedidoresList() {
  const [meds, setMeds] = useState([]);
  const [form, setForm] = useState({ nome: '', cliente: '', latitude: '', longitude: '', tokenDispositivo: '' });
  const [editingId, setEditingId] = useState(null);

  const fetch = () => API.get('/medidores').then(r=>setMeds(r.data));
  useEffect(fetch, []);

  const submit = async e => {
    e.preventDefault();
    if (editingId) await API.put(`/medidores/${editingId}`, form);
    else await API.post('/medidores', form);
    setForm({ nome:'',cliente:'',latitude:'',longitude:'',tokenDispositivo:'' });
    setEditingId(null);
    fetch();
  };

  const edit = m => {
    setEditingId(m._id);
    setForm({ nome:m.nome, cliente:m.cliente?._id||'', latitude:m.localizacao.latitude, longitude:m.localizacao.longitude, tokenDispositivo:m.tokenDispositivo });
  };

  const del = async id => { if(window.confirm('Eliminar?')){ await API.delete(`/medidores/${id}`); fetch(); } };

  return (
    <div className="dashboard">
      <h2>Gestão de Contadores</h2>
      <form onSubmit={submit} className="form-inline">
        <input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} required />
        <input placeholder="Cliente ID" value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} />
        <input placeholder="Latitude" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} />
        <input placeholder="Longitude" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} />
        <input placeholder="Token Dispositivo" value={form.tokenDispositivo} onChange={e=>setForm({...form,tokenDispositivo:e.target.value})} required />
        <button type="submit">{editingId?'Actualizar':'Criar'}</button>
        {editingId && <button type="button" onClick={()=>{setEditingId(null);setForm({nome:'',cliente:'',latitude:'',longitude:'',tokenDispositivo:''});}}>Cancelar</button>}
      </form>
      <table className="table-list">
        <thead>
          <tr><th>Nome</th><th>Cliente</th><th>Lat,Lng</th><th>Token</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {meds.map(m=>(
            <tr key={m._id}>
              <td>{m.nome}</td>
              <td>{m.cliente?.nome||'-'}</td>
              <td>{m.localizacao.latitude},{m.localizacao.longitude}</td>
              <td>{m.tokenDispositivo}</td>
              <td>
                <button onClick={()=>edit(m)}>Editar</button>
                <button onClick={()=>del(m._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
