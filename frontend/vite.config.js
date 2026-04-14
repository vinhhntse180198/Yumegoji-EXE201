import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Đọc .env — process.env.VITE_* trong file config không tự có nếu không dùng loadEnv
  const env = loadEnv(mode, process.cwd(), '');
  // Trùng backend Properties/launchSettings.json (profile "http" → :5056)
  const backendTarget = env.VITE_PROXY_TARGET || 'http://localhost:5056';

  /** Trích .pptx lớn có thể > 60s — mặc định proxy ngắn dễ gây ERR_CONNECTION_RESET */
  const longApiProxy = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
    timeout: 300000,
    proxyTimeout: 300000
  };

  const apiProxy = {
    '/api': longApiProxy,
    '/hubs': {
      target: backendTarget,
      changeOrigin: true,
      ws: true,
      secure: false,
    },
    '/uploads': {
      target: backendTarget,
      changeOrigin: true,
      secure: false,
    },
  };

  return {
    plugins: [react()],
    server: {
      port: 8080,
      strictPort: false,
      proxy: apiProxy,
    },
    preview: {
      port: 8080,
      strictPort: false,
      proxy: apiProxy,
    },
  };
});
