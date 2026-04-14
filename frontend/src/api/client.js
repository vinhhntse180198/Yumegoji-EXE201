/**
 * Tầng kết nối chung (gộp env + đường dẫn Auth + axios):
 * - Biến môi trường Vite (`import.meta.env`)
 * - Hằng số REST dùng cho Auth
 * - Instance axios: baseURL, Bearer token, xử lý 401
 *
 * Dev: API_URL = '' → gọi /api/... cùng origin Vite (proxy vite.config.js).
 * Build + preview: để VITE_API_URL trống → relative /api.
 * Deploy tách domain: VITE_API_URL = URL API đầy đủ.
 */
import axios from 'axios';
import { storage } from '../utils/storage';

const raw = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.DEV
  ? ''
  : typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().replace(/\/$/, '')
    : '';

/** @type {{ MODE: string; DEV: boolean; PROD: boolean; BASE_URL: string; API_URL: string }} */
export const ENV = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  API_URL,
};

/** Đường dẫn Auth (khớp backend [Route("api/[controller]")]). */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/Auth/login',
    REGISTER: '/api/Auth/register',
  },
  USER: {
    USERS: '/api/Auth/users',
  },
};

const TOKEN_KEY = 'token';

const http = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.remove(TOKEN_KEY);
      const current = window.location.pathname;
      if (current !== '/login') {
        window.location.href = '/login?redirect=' + encodeURIComponent(current);
      }
    }
    return Promise.reject(err);
  }
);

export default http;
