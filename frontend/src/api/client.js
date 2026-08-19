import axios from 'axios';
import {
  buildRequestKey,
  readApiCache,
  writeApiCache,
} from '../utils/localCache.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
});

function canUseLocalCache(config = {}) {
  const method = String(config.method || 'get').toLowerCase();
  const url = String(config.url || '');
  return method === 'get'
    && !url.startsWith('/admin')
    && !url.startsWith('/backup')
    && !url.includes('/auth/plans')
    && !url.includes('/payment-requests');
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('educore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (canUseLocalCache(res.config)) {
      writeApiCache(buildRequestKey(res.config), res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('educore_token');
      localStorage.removeItem('educore_teacher');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    const config = err.config;
    if ((!err.response || err.response.status >= 500) && canUseLocalCache(config)) {
      const requestKey = buildRequestKey(config);
      const cachedData = readApiCache(requestKey);
      if (cachedData !== null) {
        return Promise.resolve({
          data: cachedData,
          status: 200,
          statusText: 'OK (local cache)',
          headers: {},
          config,
          request: null,
          fromLocalCache: true,
        });
      }
    }

    return Promise.reject(err);
  },
);

export default api;
