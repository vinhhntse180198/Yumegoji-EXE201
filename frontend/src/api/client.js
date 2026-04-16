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
/* eslint-env browser */
import axios from 'axios';
import { ROUTES } from '../data/routes';
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
    FORGOT_PASSWORD: '/api/Auth/forgot-password',
    RESET_PASSWORD: '/api/Auth/reset-password',
    GOOGLE: '/api/Auth/google',
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

/** Trang không ép redirect login khi 401 (JWT hết hạn vẫn gọi được API anonymous). */
const AUTH_PAGES_NO_401_REDIRECT = new Set([
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
]);

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.remove(TOKEN_KEY);
      const loc = typeof globalThis !== 'undefined' ? globalThis.location : null;
      if (!loc) {
        return Promise.reject(err);
      }
      const path = loc.pathname || '';
      if (!AUTH_PAGES_NO_401_REDIRECT.has(path)) {
        loc.href = `${ROUTES.LOGIN}?redirect=${encodeURIComponent(path + loc.search)}`;
      }
    }
    return Promise.reject(err);
  }
);

export default http;
