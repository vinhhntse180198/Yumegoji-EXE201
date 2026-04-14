import DOMPurify from 'dompurify';
import { marked, setOptions } from 'marked';

setOptions({
  gfm: true,
  breaks: true,
});

/** Chuẩn hóa xuống dòng khi DB/API trả về literal `\n` hoặc `\\n`. */
export function normalizeLessonContentRaw(raw) {
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

function isMostlyHtml(s) {
  const t = s.trimStart();
  return /^<[!/?a-z]/i.test(t);
}

/**
 * Nội dung bài từ API: có thể là HTML (moderator) hoặc Markdown (import/AI).
 * Trả về chuỗi HTML đã sanitize để dùng với dangerouslySetInnerHTML.
 */
export function getLessonBodyHtml(raw) {
  if (raw == null || String(raw).trim() === '') {
    return '<p><em>Chưa có nội dung cho bài này.</em></p>';
  }

  const text = normalizeLessonContentRaw(raw).trim();
  if (!text) {
    return '<p><em>Chưa có nội dung cho bài này.</em></p>';
  }

  if (isMostlyHtml(text)) {
    return DOMPurify.sanitize(text, { USE_PROFILES: { html: true } });
  }

  return DOMPurify.sanitize(marked.parse(text));
}
