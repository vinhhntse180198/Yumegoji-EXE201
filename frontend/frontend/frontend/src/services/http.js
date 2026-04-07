/**
 * Axios instance: baseURL từ env, interceptors cho auth & lỗi
 */
import axios from 'axios';
import ENV from '../config/env';
import { storage } from '../utils/storage';

const TOKEN_KEY = 'token';

export const http = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Gắn token vào request
http.interceptors.request.use(
  (config) => {
    const token = storage.get(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Xử lý lỗi 401 (unauthorized)
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.remove(TOKEN_KEY);
      // Có thể redirect về /login (cần dùng window hoặc navigate từ bên ngoài)
      const current = window.location.pathname;
      if (current !== '/login') {
        window.location.href = '/login?redirect=' + encodeURIComponent(current);
      }
    }
    return Promise.reject(err);
  }
);

export default http;
