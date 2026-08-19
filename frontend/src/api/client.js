import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('educore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('educore_token');
      localStorage.removeItem('educore_teacher');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
