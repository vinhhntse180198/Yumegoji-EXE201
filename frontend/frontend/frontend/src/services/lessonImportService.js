import http from './http';

const BASE = '/api/moderator/lessons/import';

const formDataTransform = [
  (body, headers) => {
    if (body instanceof FormData && headers) {
      if (typeof headers.delete === 'function') headers.delete('Content-Type');
      else delete headers['Content-Type'];
    }
    return body;
  },
];

/**
 * Trích văn bản từ PDF/DOCX/PPTX hoặc text — không gọi OpenAI.
 */
export async function extractLessonPlainText({ file, text }) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  if (text != null && String(text).trim()) fd.append('text', String(text).trim());
  const { data } = await http.post(`${BASE}/extract-text`, fd, {
    timeout: 300000,
    transformRequest: formDataTransform,
  });
  return data;
}

/**
 * Upload PDF/DOCX/PPTX hoặc gửi text — server trích nội dung và gọi AI sinh bản nháp JSON.
 * Backend: OpenAI nếu có OpenAI:ApiKey, không thì Ollama (appsettings LessonImport / Ollama).
 * Cần JWT moderator/admin.
 */
export async function generateLessonDraft({ file, text, lessonKind }) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  if (text != null && String(text).trim()) fd.append('text', String(text).trim());
  fd.append('lessonKind', String(lessonKind || 'auto').trim());
  // Bắt buộc: instance axios mặc định Content-Type: application/json → ASP.NET trả 415 nếu gửi FormData.
  // Khớp HttpClient backend (Ollama tới 10 phút). 180s trước đây gây «timeout exceeded» khi model chậm / file lớn.
  const { data } = await http.post(`${BASE}/generate-draft`, fd, {
    timeout: 600000,
    transformRequest: formDataTransform,
  });
  return data;
}

/**
 * Lưu bài học mới từ payload đã chỉnh (sau bước AI).
 */
export async function createLessonFromDraft(payload) {
  const { data } = await http.post(`${BASE}/create-from-draft`, payload);
  return data;
}
