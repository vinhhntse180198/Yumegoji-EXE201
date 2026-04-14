import { lessonImportApi } from '../api/lessonImportApi';

/**
 * Trích văn bản từ PDF/DOCX/PPTX hoặc text — không gọi OpenAI.
 */
export async function extractLessonPlainText({ file, text }) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  if (text != null && String(text).trim()) fd.append('text', String(text).trim());
  const { data } = await lessonImportApi.extractText(fd);
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
  const { data } = await lessonImportApi.generateDraft(fd);
  return data;
}

/**
 * Lưu bài học mới từ payload đã chỉnh (sau bước AI).
 */
export async function createLessonFromDraft(payload) {
  const { data } = await lessonImportApi.createFromDraft(payload);
  return data;
}
