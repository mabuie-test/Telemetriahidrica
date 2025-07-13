import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const papel = localStorage.getItem('papel');
    const nome  = localStorage.getItem('nome');
    if (token) setUser({ token, papel, nome });
  }, []);

  const doLogin = ({ token, papel, nome }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('papel', papel);
    localStorage.setItem('nome', nome);
    setUser({ token, papel, nome });
    navigate(papel === 'admin' ? '/admin' : '/cliente');
  };

  const doLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, doLogin, doLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
