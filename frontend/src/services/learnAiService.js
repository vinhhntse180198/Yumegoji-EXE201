import { learnAiApi } from '../api/learnAiApi';

/**
 * AI dùm tôi — gọi backend → Ollama (local). Cần đăng nhập (Member).
 * @param {{ messages: { role: string; content: string }[]; imagesBase64?: string[] }} body
 */
export async function postLearnAiChat(body) {
  const { data } = await learnAiApi.postChat(body);
  return data;
}

/** Trích chữ từ .pdf / .docx / .pptx (server) — Member. */
export async function extractLearnDocument(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await learnAiApi.extractDocument(fd);
  return data;
}
