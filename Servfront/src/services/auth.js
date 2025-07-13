import API from './api';

export const login = async (email, senha) => {
  const res = await API.post('/auth/login', { email, senha });
  return res.data; // { token, nome, papel }
};
