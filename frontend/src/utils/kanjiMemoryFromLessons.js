/**
 * Gom cặp (mặt Nhật có Kanji ↔ nghĩa Việt) từ khóa N5 tĩnh để chơi Kanji Memory.
 */
import { N5_LESSONS } from '../data/n5BeginnerCourse';

const KANJI_RE = /[\u4e00-\u9faf々〆ヵヶ]/;

function hasKanji(s) {
  return KANJI_RE.test(String(s || ''));
}

/**
 * @param {string|null|undefined} lessonSlug - chỉ một bài, hoặc null = toàn khóa
 * @returns {{ kanji: string, meaning: string, lessonSlug: string, lessonTitle: string }[]}
 */
export function extractKanjiMemoryPairsFromN5Lessons(lessonSlug = null) {
  const lessons = lessonSlug
    ? N5_LESSONS.filter((l) => l.slug === lessonSlug)
    : [...N5_LESSONS];

  const out = [];
  const seen = new Set();

  function pushPair(kanjiFace, meaningVi, meta) {
    const k = String(kanjiFace || '').trim();
    const m = String(meaningVi || '').trim();
    if (!k || !m) return;
    if (k.length > 14 || m.length > 120) return;
    const key = `${k}|||${m}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kanji: k,
      meaning: m,
      lessonSlug: meta.lessonSlug,
      lessonTitle: meta.lessonTitle,
    });
  }

  for (const lesson of lessons) {
    const meta = { lessonSlug: lesson.slug, lessonTitle: lesson.navTitle || lesson.headline || lesson.slug };
    const blocks = lesson.blocks || [];

    for (const block of blocks) {
      const type = block.type;

      if (type === 'kanji_table' && Array.isArray(block.rows)) {
        for (const row of block.rows) {
          const char = row.char ?? row.Char;
          const vi = row.vi ?? row.Vi;
          if (char && vi) pushPair(char, vi, meta);
        }
      }

      if (type === 'vocab_table' && Array.isArray(block.rows)) {
        for (const row of block.rows) {
          const w = row.word ?? row.Word;
          const vi = row.vi ?? row.Vi;
          if (!w || !vi || !hasKanji(w)) continue;
          const fragment = String(w)
            .split(/[／/、,]/)
            .map((s) => s.trim())
            .find((s) => hasKanji(s));
          if (fragment) pushPair(fragment, vi, meta);
        }
      }

      if (type === 'keyword_list' && Array.isArray(block.items)) {
        for (const it of block.items) {
          const jp = it.jp ?? it.Jp;
          const vi = it.vi ?? it.Vi ?? it.noteVi ?? it.NoteVi;
          if (!jp || !vi || !hasKanji(jp)) continue;
          const cleaned = String(jp).replace(/[。．.\s]+$/g, '').trim();
          if (cleaned.length <= 10) pushPair(cleaned, vi, meta);
          else {
            const kanjiOnly = [...cleaned].filter((ch) => KANJI_RE.test(ch)).join('');
            if (kanjiOnly.length >= 1 && kanjiOnly.length <= 8) pushPair(kanjiOnly, vi, meta);
          }
        }
      }

      if (type === 'phrase_list' && Array.isArray(block.items)) {
        for (const it of block.items) {
          const jp = it.jp ?? it.Jp;
          const vi = it.labelVi ?? it.LabelVi ?? it.noteVi ?? it.NoteVi;
          if (!jp || !vi || !hasKanji(jp)) continue;
          const cleaned = String(jp).replace(/[。．.]+$/, '').trim();
          if (cleaned.length <= 12) pushPair(cleaned, vi, meta);
        }
      }
    }
  }

  return out;
}

/**
 * @param {{ kanji: string, meaning: string }[]} pool
 * @param {number} pairCount
 */
export function pickRandomPairs(pool, pairCount) {
  const n = Math.min(Math.max(1, pairCount), pool.length);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
