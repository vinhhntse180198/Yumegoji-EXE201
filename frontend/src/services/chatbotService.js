/**
 * Chatbot hỗ trợ khách — API /api/chatbot (không dùng /api/ai để tránh nhầm với AI sinh bài / import).
 */
import { chatbotApi } from '../api/chatbotApi';

/** Khách — không gửi JWT. */
export async function postGuestChatbotMessage(message) {
  const { data } = await chatbotApi.postGuest(message);
  return data;
}

/** Học viên — mở phòng chat với moderator (API chat, không phải chatbot). */
export async function createModeratorSupportRoom() {
  const { data } = await chatbotApi.createModeratorSupportRoom();
  return data;
}
