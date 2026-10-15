import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ls_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect to login.
// Skip for auth endpoints so login/register errors surface normally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ls_token');
      localStorage.removeItem('ls_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
