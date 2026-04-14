import axios from 'axios';
import http, { ENV } from './client';

function apiPath(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return ENV.API_URL ? `${ENV.API_URL}${p}` : p;
}

export const chatbotApi = {
  postGuest: (message) =>
    axios.post(
      apiPath('/api/chatbot/guest'),
      { message },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90_000,
      }
    ),

  createModeratorSupportRoom: () => http.post('/api/chat/support/moderator'),
};
