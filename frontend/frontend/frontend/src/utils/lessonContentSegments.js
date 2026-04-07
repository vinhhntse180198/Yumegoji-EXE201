import { normalizeLessonContentRaw } from './lessonContentHtml';

const JP_START = /^[\u3040-\u30ff\u4e00-\u9fafー々]/;
const JP_CHUNK = /^([\u3040-\u30ff\u4e00-\u9fafー々]+)/;

function isMostlyHtml(s) {
  return /^<[!/?a-z]/i.test(String(s).trimStart());
}

function htmlToProbeLines(html) {
  const flat = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ');
  return normalizeLessonContentRaw(flat)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function stripMarkdownLinePrefix(line) {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
}

/** Dòng có vẻ là danh sách từ/kanji/hiragana (không phải đoạn giải thích dài). */
function isProbablyVocabLine(line) {
  const raw = line.trim();
  if (!raw || raw.startsWith('```')) return false;
  const s0 = stripMarkdownLinePrefix(raw);
  if (!s0 || s0.startsWith('>')) return false;
  if (!/[\u3040-\u30ff\u4e00-\u9faf]/.test(s0)) return false;

  const commaCount = (s0.match(/[、,，]/g) || []).length;
  if (commaCount >= 2) return true;
  if (commaCount === 1 && s0.length < 220) return true;
  if (s0.length <= 160 && JP_START.test(s0)) return true;
  return false;
}

function parseOneChunk(chunk) {
  const c = chunk.trim();
  if (!c) return null;
  const m = c.match(JP_CHUNK);
  if (!m) return null;
  const jp = m[1];
  const gloss = c.slice(jp.length).trim() || null;
  return { jp, gloss };
}

function parseVocabLinesToItems(listLines) {
  const out = [];
  for (const line of listLines) {
    const s = stripMarkdownLinePrefix(line);
    if (!s) continue;

    if (/[、,，]/.test(s)) {
      const chunks = s.split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
      for (const ch of chunks) {
        const it = parseOneChunk(ch);
        if (it) out.push(it);
      }
    } else {
      const m = s.match(/^([\u3040-\u30ff\u4e00-\u9fafー々]+(?:\s+[\u3040-\u30ff\u4e00-\u9fafー々]+)*)/);
      if (m) {
        const jp = m[1].trim();
        const gloss = s.slice(m[0].length).trim() || null;
        out.push({ jp, gloss });
      }
    }
  }
  return out;
}

const MIN_SEGMENTS = 2;

/**
 * Tách phần giới thiệu (markdown/HTML) và các mục Nhật rời để hiển thị thẻ + nút nghe.
 */
export function buildApiLessonContentParts(rawContent) {
  const full = normalizeLessonContentRaw(rawContent).trim();
  if (!full) {
    return { introSource: '', segmentItems: [], showSegments: false, suppressMainHtml: false };
  }

  if (isMostlyHtml(full)) {
    const probeLines = htmlToProbeLines(full);
    const vocabLines = probeLines.filter((l) => isProbablyVocabLine(l));
    const segmentItems = parseVocabLinesToItems(vocabLines);
    if (segmentItems.length >= MIN_SEGMENTS) {
      const introProbe = probeLines.filter((l) => !isProbablyVocabLine(l));
      return {
        introSource: introProbe.join('\n\n'),
        segmentItems,
        showSegments: true,
        suppressMainHtml: true,
      };
    }
    return { introSource: full, segmentItems: [], showSegments: false, suppressMainHtml: false };
  }

  const lines = full.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
  const intro = [];
  const listLines = [];
  for (const line of lines) {
    if (isProbablyVocabLine(line)) listLines.push(line);
    else intro.push(line);
  }

  const segmentItems = parseVocabLinesToItems(listLines);
  const showSegments = segmentItems.length >= MIN_SEGMENTS;

  return {
    introSource: intro.join('\n\n'),
    segmentItems,
    showSegments,
    suppressMainHtml: false,
  };
}
