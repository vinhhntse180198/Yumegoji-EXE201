import { ENV } from './client';

/** URL hub SignalR: dev + proxy → '/hubs/chat'; prod → VITE_API_URL/hubs/chat */
export function buildChatHubUrl() {
  const base = ENV.API_URL;
  if (base == null || base === '') {
    return '/hubs/chat';
  }
  return `${String(base).replace(/\/$/, '')}/hubs/chat`;
}
