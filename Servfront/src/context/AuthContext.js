import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Ao montar, se existir token, busca perfil completo
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      API.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.clear();
          delete API.defaults.headers.common['Authorization'];
          setUser(null);
          navigate('/login');
        });
    }
  }, [navigate]);

  const doLogin = async ({ token }) => {
    localStorage.setItem('token', token);
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const res = await API.get('/users/me');
    setUser(res.data);
    navigate(res.data.papel === 'admin' ? '/admin' : '/cliente');
  };

  const doLogout = () => {
    localStorage.clear();
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, doLogin, doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
