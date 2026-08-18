import axios from 'axios';

const adminApi = axios.create({ baseURL: '/api' });

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('educore_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('educore_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default adminApi;
