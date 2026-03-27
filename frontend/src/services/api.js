import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ============================================================
// AUTH
// ============================================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ============================================================
// WHATSAPP
// ============================================================
export const whatsappAPI = {
  connect: () => api.post('/whatsapp/connect'),
  status: () => api.get('/whatsapp/status'),
  disconnect: () => api.delete('/whatsapp/disconnect'),
};

// ============================================================
// MESSAGES
// ============================================================
export const messagesAPI = {
  send: (data) => api.post('/messages/send', data),
  logs: (params) => api.get('/messages/logs', { params }),
  stats: () => api.get('/messages/stats'),
  queue: () => api.get('/messages/queue'),
};

// ============================================================
// CAMPAIGNS
// ============================================================
export const campaignsAPI = {
  create: (data) => api.post('/campaign/create', data),
  list: () => api.get('/campaign/list'),
  status: (id) => api.get(`/campaign/status/${id}`),
  start: (id) => api.post(`/campaign/start/${id}`),
  pause: (id) => api.post(`/campaign/pause/${id}`),
  cancel: (id) => api.post(`/campaign/cancel/${id}`),
};

// ============================================================
// CONTACTS
// ============================================================
export const contactsAPI = {
  upload: (contacts) => api.post('/contacts/upload', { contacts }),
  list: (params) => api.get('/contacts', { params }),
};

// ============================================================
// AUTOMATION
// ============================================================
export const automationAPI = {
  createRule: (data) => api.post('/automation/rule', data),
  listRules: () => api.get('/automation/rules'),
  deleteRule: (id) => api.delete(`/automation/rule/${id}`),
};

// ============================================================
// WEBHOOKS
// ============================================================
export const webhooksAPI = {
  create: (data) => api.post('/webhooks/create', data),
  list: () => api.get('/webhooks'),
  delete: (id) => api.delete(`/webhooks/${id}`),
};

// ============================================================
// USAGE
// ============================================================
export const usageAPI = {
  me: () => api.get('/usage/me'),
  limits: () => api.get('/usage/limits'),
};

export default api;
