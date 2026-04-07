/**
 * Biến môi trường (Vite dùng import.meta.env)
 *
 * - npm run dev: API_URL = '' → axios gọi /api/... cùng origin Vite, proxy tới backend (vite.config.js).
 * - npm run build + preview trên :8080: nên để VITE_API_URL trống → gọi relative /api (proxy preview),
 *   tránh ERR_CONNECTION_REFUSED khi build đóng sẵn http://localhost:5056 nhưng API không chạy / cổng khác.
 * - Deploy tách API (Vercel + API riêng): set VITE_API_URL = URL đầy đủ, không có proxy /api.
 */
const raw = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.DEV
  ? ''
  : typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().replace(/\/$/, '')
    : '';

const ENV = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  API_URL,
};

export default ENV;
