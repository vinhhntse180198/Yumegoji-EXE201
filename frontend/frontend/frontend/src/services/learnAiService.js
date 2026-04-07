import http from './http';

/**
 * AI dùm tôi — gọi backend → Ollama (local). Cần đăng nhập (Member).
 * @param {{ messages: { role: string; content: string }[]; imagesBase64?: string[] }} body
 */
export async function postLearnAiChat(body) {
  const { data } = await http.post('/api/learn/ai/chat', body, {
    timeout: 180_000,
  });
  return data;
}

/** Trích chữ từ .pdf / .docx / .pptx (server) — Member. */
export async function extractLearnDocument(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await http.post('/api/learn/ai/extract-document', fd, {
    timeout: 120_000,
    transformRequest: [
      (body, headers) => {
        if (headers && typeof headers.delete === 'function') {
          headers.delete('Content-Type');
        } else if (headers) {
          delete headers['Content-Type'];
        }
        return body;
      },
    ],
  });
  return data;
}
