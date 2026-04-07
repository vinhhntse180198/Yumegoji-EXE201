/**
 * Chatbot hỗ trợ khách — API /api/chatbot (không dùng /api/ai để tránh nhầm với AI sinh bài / import).
 */
import axios from 'axios';
import ENV from '../config/env';
import http from './http';

function apiPath(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return ENV.API_URL ? `${ENV.API_URL}${p}` : p;
}

/** Khách — không gửi JWT. */
export async function postGuestChatbotMessage(message) {
  const { data } = await axios.post(apiPath('/api/chatbot/guest'), { message }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 90_000,
  });
  return data;
}

/** Học viên — mở phòng chat với moderator (API chat, không phải chatbot). */
export async function createModeratorSupportRoom() {
  const { data } = await http.post('/api/chat/support/moderator');
  return data;
}
