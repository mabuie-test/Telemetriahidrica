import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { login } from '../services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro]   = useState('');
  const { doLogin }       = useContext(AuthContext);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const data = await login(email, senha);
      doLogin(data);
    } catch {
      setErro('Credenciais inválidas');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Entrar</h2>
        {erro && <p className="error">{erro}</p>}
        <input type="email" placeholder="Email" value={email}
               onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha}
               onChange={e => setSenha(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
