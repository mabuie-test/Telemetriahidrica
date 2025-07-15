import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Adiciona o token em todas as requisições
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Autenticação
export const login       = creds => API.post('/auth/login', creds);

// Users
export const getProfile  = () => API.get('/users/me');
export const listUsers   = () => API.get('/users');
export const getUser     = id => API.get(`/users/${id}`);
export const createUser  = data => API.post('/users', data);
export const updateUser  = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser  = id => API.delete(`/users/${id}`);

// Medidores
export const listMedidores      = () => API.get('/medidores');
export const getMedidor         = id => API.get(`/medidores/${id}`);
export const createMedidor      = data => API.post('/medidores', data);
export const updateMedidor      = (id, data) => API.put(`/medidores/${id}`, data);
export const deleteMedidor      = id => API.delete(`/medidores/${id}`);

// Leituras
export const listLeituras       = () => API.get('/leituras');
export const createLeitura      = data => API.post('/leituras', data);

// Falhas e Alertas
export const listFalhas         = () => API.get('/falhas');
export const listAlertas        = () => API.get('/alertas');

// Relatórios
export const getRelatorioDiario     = params => API.get('/relatorios/diario', { params });
export const getRelatorioSemanal    = params => API.get('/relatorios/semanal', { params });
export const getRelatorioMensal     = params => API.get('/relatorios/mensal', { params });
export const getRelatorioClientes   = params => API.get('/relatorios/consumo-clientes', { params });

// Contabilidade
export const getInvoice            = params => API.get('/contabilidade/invoice', { params });
export const listInvoicesHistory   = ()     => API.get('/contabilidade/invoices');
export const payInvoice            = (invoiceId, method) =>
  API.post('/contabilidade/pay', { invoiceId, method });
export const toggleSuspendMedidor  = medidorId =>
  API.patch(`/contabilidade/medidor/${medidorId}/suspend`);

// Auditoria
export const listAuditLogs        = () => API.get('/audit');

export default API;
