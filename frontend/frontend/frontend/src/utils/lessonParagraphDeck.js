/**
 * Bài moderator lưu HTML kiểu nhiều <p> — gom thành thẻ: kanji/từ + kana + nghĩa VN + loa.
 */

const JP_RE = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff66-\uff9f]/;
const KANJI_IN_STRING = /[\u4e00-\u9faf々〆ヵヶ]/;

export function hasJapaneseText(s) {
  return JP_RE.test(String(s || ''));
}

function hasKanji(s) {
  return KANJI_IN_STRING.test(String(s || ''));
}

/** Dòng chỉ gồm kana (không kanji) — phiên âm. */
function isKanaReadingLine(s) {
  const t = String(s || '').trim();
  if (!t || !hasJapaneseText(t) || hasKanji(t)) return false;
  if (t.length > 56) return false;
  return true;
}

/** Thẻ chỉ có mảnh kana ngắn (PPTX tách ひ / よ / うび) — gộp vào phiên âm thẻ kanji liền sau. */
function isKanaCrumCard(it) {
  if (it.type !== 'card') return false;
  const jp = String(it.jp || '').trim();
  if (!jp || hasKanji(jp) || !isKanaReadingLine(jp)) return false;
  if (jp.length > 6) return false;
  if (String(it.reading || '').trim() || String(it.vi || '').trim()) return false;
  return true;
}

/** Tiêu đề slide / nhãn — không gộp làm nghĩa từ. */
function isVietnameseSectionHeader(s) {
  const t = String(s || '').trim();
  if (!t || t.length > 52 || hasJapaneseText(t)) return false;
  if (/^\d+(\s|$)/.test(t) && /NGÀN|TRĂM|TUỔI|NGƯỜI|CÁI|VẠN|YÊN|THÁNG|THIÊN|BÁCH|NHÂN|NGUYỆT/i.test(t)) {
    return false;
  }
  if (/^\([^)]{1,24}\)$/.test(t)) return false;
  if (/^unit\s*\d/i.test(t) || /^bài\s*\d/i.test(t) || /^lesson\s*\d/i.test(t)) return true;
  if (
    /^(ÂM\s+KUN|ÂM\s+ÔN|ÂM\s+HÁN|LOA|THI\s|MIDTERM|NHIỀU\s+KIỂU\s+FONT|VẤN\s+ĐỀ)/i.test(t)
  ) {
    return true;
  }
  if (/^KUNYOMI|^ONYOMI/i.test(t)) return true;
  if (
    /\b(LIST|GHÉP|KANJI|UNIT|BÀI\s*\d|VÒNG|NGHĨA|CÁCH ĐỌC|CÁCH VIẾT|ÂM HÁN|HÁN VIỆT|Ý NGHĨA|GIỚI THIỆU|QUY TẮC|TRƯỜNG|HỌC SINH|CÁC KANJI|CHỮ ĐƠN|CHỌN KANJI|NGƯỜI NHẬT|SỐ ĐẾM|ĐẾM SỐ)\b/i.test(
      t,
    ) &&
    t.length < 44
  ) {
    return true;
  }
  if (/^HÁN\s+VIỆT$/i.test(t) || /^CÁC\s+ĐƠN\s+VỊ/i.test(t) || /^SỐ\s+ĐẾM/i.test(t)) return true;
  if (/^THỜI$/i.test(t) || /^GIỜ\s*~$/i.test(t) || /^～$/.test(t)) return true;
  return false;
}

/** Một ký tự kanji đơn (PPTX hay chèn nhầm giữa hai mảnh kana: いち / 六 / じ). */
function isLoneKanjiGrapheme(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  const chars = [...t];
  return chars.length === 1 && hasKanji(chars[0]) && !isKanaReadingLine(t);
}

/**
 * Bỏ dòng một chữ kanji nằm giữa hai dòng kana (ghép いち+じ → いちじ cho 一時).
 */
/**
 * PPTX/Word hay tách mỗi từ tiếng Việt thành một <p> — gom thành đoạn trước khi ghép thẻ.
 */
export function mergeConsecutiveVietnameseFragmentLines(lines) {
  const out = [];
  /** @type {string[]} */
  let buf = [];

  const flush = () => {
    if (buf.length === 0) return;
    const s = buf.join(' ').replace(/\s+/g, ' ').trim();
    if (s) out.push(s);
    buf = [];
  };

  for (const raw of lines) {
    const t = String(raw || '').trim();
    if (!t) continue;

    if (hasJapaneseText(t)) {
      flush();
      out.push(t);
      continue;
    }

    if (isVietnameseSectionHeader(t)) {
      flush();
      out.push(t);
      continue;
    }

    if (t.length > 88) {
      flush();
      out.push(t);
      continue;
    }

    const joinedLen = buf.join(' ').length + t.length + (buf.length ? 1 : 0);
    if (joinedLen > 480 || buf.length >= 42) {
      flush();
    }

    buf.push(t);
    if (buf.join(' ').length >= 400) {
      flush();
    }
  }
  flush();
  return out;
}

/**
 * Trong một ô ghi chú: gom các dòng rất ngắn thành đoạn, giữ xuống dòng giữa khối lớn.
 */
function reflowParagraphNoteText(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 2) {
    return lines.join('\n\n');
  }

  const blocks = [];
  /** @type {string[]} */
  let buf = [];
  const flushBuf = () => {
    if (buf.length === 0) return;
    blocks.push(buf.join(' ').replace(/\s+/g, ' ').trim());
    buf = [];
  };

  for (const l of lines) {
    if (hasJapaneseText(l) || isVietnameseSectionHeader(l) || l.length > 72) {
      flushBuf();
      blocks.push(l);
      continue;
    }
    buf.push(l);
    if (buf.length >= 32 || buf.join(' ').length > 360) {
      flushBuf();
    }
  }
  flushBuf();
  return blocks.join('\n\n');
}

function reflowNotesInItems(items) {
  return items.map((it) =>
    it.type === 'note' ? { ...it, text: reflowParagraphNoteText(it.text ?? '') } : it,
  );
}

export function dropLoneKanjiBetweenKanaFragments(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const prev = out[out.length - 1];
    const nxt = lines[i + 1];
    if (
      prev !== undefined &&
      isKanaReadingLine(prev) &&
      nxt !== undefined &&
      isKanaReadingLine(nxt) &&
      isLoneKanjiGrapheme(cur)
    ) {
      continue;
    }
    out.push(cur);
  }
  return out;
}

/**
 * Gom kana liên tiếp khi ngay sau là dòng có kanji (kana đứng trước từ).
 */
function consumeKanaRunBeforeKanji(lines, startIdx) {
  if (startIdx >= lines.length || !isKanaReadingLine(lines[startIdx])) {
    return { joined: '', parts: [], end: startIdx };
  }
  let end = startIdx;
  while (end < lines.length && isKanaReadingLine(lines[end])) {
    end += 1;
  }
  const afterLine = lines[end];
  if (afterLine && hasKanji(afterLine) && !isKanaReadingLine(afterLine)) {
    const parts = [];
    for (let t = startIdx; t < end; t++) {
      parts.push(String(lines[t]).trim());
    }
    const joined = parts.join('');
    if (joined.length <= 28 && parts.length <= 12) {
      return { joined, parts, end };
    }
  }
  return {
    joined: String(lines[startIdx]).trim(),
    parts: [String(lines[startIdx]).trim()],
    end: startIdx + 1,
  };
}

/**
 * Gom mọi dòng kana liền sau từ/kanji cho đến khi gặp dòng không phải kana (thường là nghĩa VN hoặc từ tiếp theo).
 */
function consumeKanaRunAfterKanjiWord(lines, startIdx) {
  if (startIdx >= lines.length || !isKanaReadingLine(lines[startIdx])) {
    return { joined: '', end: startIdx };
  }
  let end = startIdx;
  while (end < lines.length && isKanaReadingLine(lines[end])) {
    end += 1;
  }
  const parts = [];
  for (let t = startIdx; t < end; t++) {
    parts.push(String(lines[t]).trim());
  }
  const joined = parts.join('');
  if (joined.length <= 28 && parts.length <= 12) {
    return { joined, end };
  }
  return { joined: String(lines[startIdx]).trim(), end: startIdx + 1 };
}

/**
 * PPTX tách いちま / ん → いちまん; さん / がつ → さんがつ (nếu cả hai dòng chỉ kana).
 */
export function mergeDetachedKanaTails(lines) {
  const out = lines.map((l) => String(l || '').trim()).filter(Boolean);
  const tail1 = /^(ん|つ|く|き|こ|と|ち|に|が|ぎ|げ|ご|ょ|ゃ|ゅ|っ|は|ひ|へ|ほ|び|ぴ|み|め|も|ら|り|る|れ|ろ|わ|を)$/u;
  /** Mảnh 2–4 ký tự hay tách dòng (いち + がつ, に + せん). */
  const tailMulti = /^(がつ|まん|せん|ぜん|びゃく|ひゃく|ぴゃく|にん|ごと|ぼん|り|じん)$/u;

  let guard = 0;
  while (guard++ < out.length + 12) {
    let changed = false;
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i];
      const b = out[i + 1];
      if (!hasJapaneseText(a) || !hasJapaneseText(b) || hasKanji(a) || hasKanji(b)) continue;

      if (a.length <= 10 && b.length <= 3 && tail1.test(b)) {
        out[i] = `${a}${b}`.replace(/\s+/g, '');
        out.splice(i + 1, 1);
        changed = true;
        break;
      }

      if (a.length <= 8 && b.length >= 2 && b.length <= 4 && tailMulti.test(b)) {
        out[i] = `${a}${b}`.replace(/\s+/g, '');
        out.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return out;
}

/** Chỉ chữ số Hán đơn / hợp (十二…), không gồm 千百万 — tránh gộp 三千+百. */
const DIGIT_NUMERAL_KANJI = /^[一二三四五六七八九十〇]{1,3}$/u;
const SINGLE_CLASSIFIER_KANJI = /^[千百万人月日つ校学金分時円]$/u;

/**
 * Gộp 二+千, 百+円, 五+つ, 三+百円… (slide tách mỗi chữ một <p>).
 */
export function mergeAdjacentKanjiClassifierLines(lines) {
  const out = lines.map((l) => String(l || '').trim()).filter(Boolean);
  let guard = 0;
  while (guard++ < 40) {
    let changed = false;
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i];
      const b = out[i + 1];
      if (/[ぁ-ゟァ-ヶ]/u.test(a) || /[ぁ-ゟァ-ヶ]/u.test(b)) continue;
      if (!hasKanji(a) || !hasKanji(b)) continue;

      if (b === '円' && a.length >= 1 && a.length <= 4 && !/\s/.test(a)) {
        out[i] = `${a}${b}`;
        out.splice(i + 1, 1);
        changed = true;
        break;
      }

      if (
        DIGIT_NUMERAL_KANJI.test(a) &&
        SINGLE_CLASSIFIER_KANJI.test(b) &&
        a.length <= 3 &&
        b.length === 1
      ) {
        out[i] = `${a}${b}`;
        out.splice(i + 1, 1);
        changed = true;
        break;
      }

      if (DIGIT_NUMERAL_KANJI.test(a) && /^[千百十万千金人月]{1,3}円$/u.test(b) && a.length <= 3) {
        out[i] = `${a}${b}`;
        out.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return out;
}

/** Từ đọc thường gặp (bài đếm / số / người / tháng) — dùng tách chuỗi kana dính liền từ PPTX. */
const KANA_READING_LEX_RAW = [
  'ろっぴゃくえん',
  'ななひゃくえん',
  'はっぴゃくえん',
  'きゅうひゃくえん',
  'ろっぴゃく',
  'はっぴゃく',
  'ななひゃく',
  'さんびゃくえん',
  'にひゃくえん',
  'よんひゃくえん',
  'ごひゃくえん',
  'さんびゃく',
  'にひゃく',
  'よんひゃく',
  'ごひゃく',
  'きゅうひゃく',
  'じゅういちがつ',
  'じゅうにがつ',
  'じゅうさんがつ',
  'じゅうよっか',
  'じゅうごにち',
  'じゅういちにち',
  'じゅうににち',
  'じゅうさんにち',
  'じゅうろくにち',
  'じゅうしちにち',
  'じゅうはちにち',
  'じゅうくにち',
  'さんじゅういち',
  'さんじゅうご',
  'さんじゅうよん',
  'さんぜんえん',
  'にせんえん',
  'ごせんえん',
  'ろくせんえん',
  'ななせんえん',
  'はっせんえん',
  'きゅうせんえん',
  'よんせんえん',
  'せんえん',
  'にまんせんえん',
  'さんまんぜんえん',
  'ななまんせんえん',
  'はちまんにせんえん',
  'きゅうまんさんぜんえん',
  'じゅうごさい',
  'じゅういっさい',
  'いっさい',
  'にさい',
  'さんさい',
  'しちにん',
  'はちにん',
  'きゅうにん',
  'じゅうにん',
  'よんにん',
  'さんにん',
  'ろくにん',
  'ごにん',
  'よにん',
  'ふたり',
  'ひとり',
  'ここのつ',
  'やっつ',
  'ななつ',
  'むっつ',
  'いつつ',
  'よっつ',
  'みっつ',
  'ふたつ',
  'ひとつ',
  'しちがつ',
  'くがつ',
  'はちがつ',
  'ろくがつ',
  'ごがつ',
  'しがつ',
  'さんがつ',
  'にがつ',
  'いちがつ',
  'ななせん',
  'はっせん',
  'きゅうせん',
  'よんせん',
  'ろくせん',
  'ごせん',
  'にせん',
  'さんぜん',
  'せん',
  'いちまん',
  'にまん',
  'さんまん',
  'よんまん',
  'ごまん',
  'ろくまん',
  'ななまん',
  'はちまん',
  'きゅうまん',
  'ひゃくえん',
  'じゅうがつ',
  'だいがくせい',
  'がくせい',
  'にほんじん',
  'ちゅうごくじん',
  'いっぴゃく',
  'ろくじゅう',
  'じゅういち',
  'じゅうに',
  'じゅうさん',
  'じゅうよん',
  'じゅうご',
  'じゅうろく',
  'じゅうなな',
  'じゅうはち',
  'じゅうきゅう',
  'ひゃく',
  'ぴゃく',
  'びゃく',
  'えん',
  'まん',
  'がつ',
  'にち',
  'か',
  'ついたち',
  'ふつか',
  'みっか',
  'よっか',
  'いつか',
  'むいか',
  'なのか',
  'ようか',
  'ここのか',
  'とおか',
  'はつか',
];

const KANA_READING_LEX_SORTED = [...new Set(KANA_READING_LEX_RAW)].sort(
  (x, y) => y.length - x.length || x.localeCompare(y),
);

/**
 * @param {string} s
 * @returns {string[] | null}
 */
export function tokenizeRunOnKana(s) {
  const t = String(s || '').trim();
  if (!t || hasKanji(t)) return null;
  if (t.length < 14) return [t];
  let rest = t;
  /** @type {string[]} */
  const parts = [];
  while (rest.length) {
    let hit = '';
    for (const w of KANA_READING_LEX_SORTED) {
      if (rest.startsWith(w)) {
        hit = w;
        break;
      }
    }
    if (!hit) return null;
    parts.push(hit);
    rest = rest.slice(hit.length);
  }
  return parts.length >= 2 ? parts : [t];
}

/**
 * Một thẻ kanji có reading là nhiều từ dính; các thẻ kanji liền sau không có reading → tách và gán lần lượt.
 */
function distributeRunOnKanaReadings(items) {
  /** @type {typeof items} */
  const out = items.map((x) => ({ ...x }));
  for (let i = 0; i < out.length; i++) {
    const it = out[i];
    if (it.type !== 'card') continue;
    const jp = String(it.jp || '').trim();
    let r = String(it.reading || '').trim();
    if (!hasKanji(jp) || r.length < 14 || hasKanji(r)) continue;

    const tokens = tokenizeRunOnKana(r);
    if (!tokens || tokens.length < 2) continue;

    /** @type {number[]} */
    const followerIdx = [];
    for (let j = i + 1; j < out.length && followerIdx.length < tokens.length - 1; j++) {
      const c = out[j];
      if (c.type !== 'card') break;
      const cjp = String(c.jp || '').trim();
      if (!hasKanji(cjp)) break;
      if (String(c.reading || '').trim()) break;
      if (String(c.vi || '').trim()) break;
      followerIdx.push(j);
    }
    if (followerIdx.length !== tokens.length - 1) continue;

    out[i] = { ...it, reading: tokens[0] };
    for (let k = 0; k < followerIdx.length; k++) {
      const idx = followerIdx[k];
      out[idx] = { ...out[idx], reading: tokens[k + 1] };
    }
  }
  return out;
}

/** Gộp mảnh vỡ kiểu "N", ")", "(" từ PPTX vào dòng trước. */
export function collapseTinyFragmentLines(lines) {
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (
      out.length > 0 &&
      t.length > 0 &&
      t.length <= 4 &&
      /^[A-Z0-9N)\s(.·／，,、:;]+$/i.test(t) &&
      !/^[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẨẴÊỀẾỆỂỄÔỒỐỘỔỖƠỜỚỢỞỠƯỪỨỰỬỮĐ]/.test(t)
    ) {
      out[out.length - 1] = `${out[out.length - 1]} ${t}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Nhiều <p> liên tiếp, không bảng — thường là export slide / AI. */
export function isLikelyFlatParagraphLessonHtml(html) {
  const s = String(html || '').trim();
  if (s.length < 120) return false;
  const pClose = (s.match(/<\/p>/gi) || []).length;
  if (pClose < 6) return false;
  if (/<table[\s>]/i.test(s)) return false;
  if (/<iframe[\s>]/i.test(s)) return false;
  return true;
}

/**
 * @param {string} html
 * @returns {string[]}
 */
export function extractParagraphTexts(html) {
  if (typeof document === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('p')]
    .map((p) => p.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * @param {string[]} lines
 * @returns {{ type: 'card' | 'note', jp?: string, reading?: string, vi?: string, text?: string }[]}
 */
export function pairParagraphLines(lines) {
  /** @type {{ type: 'card' | 'note', jp?: string, reading?: string, vi?: string, text?: string }[]} */
  const out = [];
  /** @type {string[]} */
  let vnBuffer = [];
  let i = 0;

  const flushVnBuffer = () => {
    if (vnBuffer.length === 0) return;
    out.push({ type: 'note', text: vnBuffer.join('\n') });
    vnBuffer = [];
  };

  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    const curJ = hasJapaneseText(cur);
    const nextJ = next ? hasJapaneseText(next) : false;

    if (!curJ) {
      if (isVietnameseSectionHeader(cur)) {
        flushVnBuffer();
        out.push({ type: 'note', text: cur });
      } else {
        vnBuffer.push(cur);
      }
      i += 1;
      continue;
    }

    flushVnBuffer();

    // Chỉ thuần kana (không kanji trong dòng): kana… + từ kanji + VN
    if (isKanaReadingLine(cur) && !hasKanji(cur)) {
      const kRun = consumeKanaRunBeforeKanji(lines, i);
      const j = kRun.end;
      const kanjiLine = lines[j];
      if (kRun.joined && kanjiLine && hasKanji(kanjiLine) && !isKanaReadingLine(kanjiLine)) {
        const viLine = lines[j + 1];
        if (viLine && !hasJapaneseText(viLine) && !isVietnameseSectionHeader(viLine)) {
          out.push({ type: 'card', jp: kanjiLine, reading: kRun.joined, vi: viLine });
          i = j + 2;
          continue;
        }
        out.push({ type: 'card', jp: kanjiLine, reading: kRun.joined, vi: '' });
        i = j + 1;
        continue;
      }
      out.push({ type: 'card', jp: cur, reading: '', vi: '' });
      i += 1;
      continue;
    }

    // Từ/kanji + nhiều dòng kana gộp + VN — vd 一時 / いち / じ / 1 GIỜ ; 九時 / く / じ / 9 GIỜ
    const kAfter = consumeKanaRunAfterKanjiWord(lines, i + 1);
    if (kAfter.joined) {
      const afterRun = kAfter.end;
      const viLine = lines[afterRun];
      if (viLine && !hasJapaneseText(viLine) && !isVietnameseSectionHeader(viLine)) {
        out.push({ type: 'card', jp: cur, reading: kAfter.joined, vi: viLine });
        i = afterRun + 1;
        continue;
      }
      out.push({ type: 'card', jp: cur, reading: kAfter.joined, vi: '' });
      i = afterRun;
      continue;
    }

    if (next && !nextJ && !isVietnameseSectionHeader(next)) {
      out.push({ type: 'card', jp: cur, reading: '', vi: next });
      i += 2;
      continue;
    }

    if (next && !nextJ && isVietnameseSectionHeader(next)) {
      out.push({ type: 'card', jp: cur, reading: '', vi: '' });
      out.push({ type: 'note', text: next });
      i += 2;
      continue;
    }

    out.push({ type: 'card', jp: cur, reading: '', vi: '' });
    i += 1;
  }

  flushVnBuffer();
  return out;
}

/**
 * Gộp thẻ tách lẻ: [kanji][kana+vn], [kana+vn][kanji].
 * @param {{ type: 'card' | 'note', jp?: string, reading?: string, vi?: string, text?: string }[]} items
 */
function mergeAdjacentDeckCardsOnce(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a.type !== 'card') {
      out.push(a);
      continue;
    }
    const b = items[i + 1];
    if (!b || b.type !== 'card') {
      out.push(a);
      continue;
    }
    const aJp = a.jp || '';
    const bJp = b.jp || '';
    const aV = (a.vi || '').trim();
    const bV = (b.vi || '').trim();
    const aR = (a.reading || '').trim();
    const bR = (b.reading || '').trim();

    if (hasKanji(aJp) && !aR && !aV && isKanaReadingLine(bJp) && bV) {
      out.push({ type: 'card', jp: aJp, reading: bJp, vi: bV });
      i += 1;
      continue;
    }

    if (isKanaReadingLine(aJp) && aV && hasKanji(bJp) && !bR && !bV) {
      out.push({ type: 'card', jp: bJp, reading: aJp, vi: aV });
      i += 1;
      continue;
    }

    out.push(a);
  }
  return out;
}

function mergeAdjacentDeckCards(items) {
  let cur = items;
  for (let p = 0; p < 5; p++) {
    const next = mergeAdjacentDeckCardsOnce(cur);
    if (next.length === cur.length) break;
    cur = next;
  }
  return cur;
}

/**
 * Gộp các thẻ mảnh kana ngay sau thẻ kanji vào trường reading (ひ / よ / うび sau 木曜日).
 */
function absorbFollowingKanaCrumbsIntoKanjiReading(items) {
  const out = [];
  let idx = 0;
  while (idx < items.length) {
    const it = items[idx];
    if (it.type !== 'card') {
      out.push(it);
      idx += 1;
      continue;
    }
    const jp = String(it.jp || '').trim();
    if (!hasKanji(jp)) {
      out.push(it);
      idx += 1;
      continue;
    }
    let reading = String(it.reading || '').trim();
    let j = idx + 1;
    while (j < items.length && items[j].type === 'card' && isKanaCrumCard(items[j])) {
      reading += String(items[j].jp || '').trim();
      j += 1;
    }
    if (j > idx + 1) {
      out.push({ ...it, reading });
      idx = j;
      continue;
    }
    out.push(it);
    idx += 1;
  }
  return out;
}

/**
 * Khớp một dòng nghĩa VN với chữ Nhật (slide hay tách block VN / block kanji).
 * @param {string} viLine
 * @param {string} jp
 */
function viLineMatchesJp(viLine, jp) {
  const j = String(jp || '').trim();
  const v = String(viLine || '').trim();
  if (!j || !v || hasJapaneseText(v)) return false;

  /** @type {[RegExp, RegExp][]} */
  const pairs = [
    [/^土$/, /THỔ|thổ/i],
    [/^月$/, /THÁNG|TRĂNG|tháng|TRANG|trăng|MẶT\s*TRĂNG|mat\s*trang/i],
    [/^日$/, /NGÀY|TRỜI|trời|ngày|NGAY|MẶT\s*TRỜI|mat\s*troi/i],
    [/^金$/, /(^|\s)KIM(\s|$)|^KIM$|KIM\s*LOẠI|kim\s*loại/i],
    [/^木$/, /MỘC|mộc|CÂY|cây/i],
    [/^水$/, /THỦY|thủy|NƯỚC|nước/i],
    [/^火$/, /HỎA|hỏa|LỬA|lửa/i],
    [/曜/, /THỨ|thứ|TUẦN|tuần|WEEK/i],
    [/^年$/, /NĂM|năm/i],
    [/^時$/, /GIỜ|giờ/i],
    [/^分$/, /PHÚT|phút/i],
    [/^何$/, /GÌ|gì|NAO|nào|\?/i],
  ];

  for (const [jpRe, viRe] of pairs) {
    if (!jpRe.test(j)) continue;
    if (viRe.test(v)) return true;
  }
  return false;
}

/** Dòng nghĩa VN rõ ràng thuộc chủ đề khác (vd THÁNG) — không gán nhầm cho 木曜日. */
function viLineConflictsWithJp(viLine, jp) {
  const j = String(jp || '').trim();
  const v = String(viLine || '').trim();
  if (!v || !j || hasJapaneseText(v)) return false;
  if (/THÁNG|TRĂNG|MẶT\s*TRĂNG|tháng|trăng/i.test(v) && !/月/.test(j)) return true;
  if (/NGÀY|MẶT\s*TRỜI|mặt\s*trời/i.test(v) && !/(日|曜)/.test(j)) return true;
  if (/(^|\s)KIM(\s|$)|KIM\s*LOẠI/i.test(v) && !/金/.test(j)) return true;
  if (/MỘC|CÂY|cây/i.test(v) && !/木/.test(j)) return true;
  if (/THỦY|NƯỚC/i.test(v) && !/水/.test(j)) return true;
  if (/HỎA|LỬA/i.test(v) && !/火/.test(j)) return true;
  if (/THỔ|ĐẤT/i.test(v) && !/土/.test(j)) return true;
  if (/XUYÊN|SÔNG|sông/i.test(v) && !/(川|河|江)/.test(j)) return true;
  if (/\(NAM\)|PHÍA\s*NAM|phía\s*nam/i.test(v) && !/南/.test(j)) return true;
  if (/THỨ\s*\d|CHỦ\s*NHẬT|thứ\s*\d/i.test(v) && !/曜/.test(j)) return true;
  if (/GIỜ|giờ/i.test(v) && !/時/.test(j)) return true;
  if (/PHÚT|phút/i.test(v) && !/分/.test(j)) return true;
  if (/NĂM|năm/i.test(v) && !/年/.test(j)) return true;
  if (/GÌ|gì|cái\s*gì/i.test(v) && !/何/.test(j)) return true;
  return false;
}

/** Thẻ kanji/từ, chưa có kana và chưa có nghĩa — hay gặp khi khối VN nằm trước khối kanji trong HTML. */
function isOrphanKanjiVocabCard(item) {
  if (item.type !== 'card') return false;
  const jp = String(item.jp || '').trim();
  if (!jp || !hasJapaneseText(jp) || !hasKanji(jp)) return false;
  if (String(item.reading || '').trim()) return false;
  if (String(item.vi || '').trim()) return false;
  return true;
}

/**
 * Gom các ghi chú tiếng Việt ngay đầu bài vào các thẻ kanji liền sau (PPTX thường xuất VN trước, kanji sau).
 */
function redistributeLeadingNotesToOrphanKanjiCards(items) {
  let i = 0;
  while (i < items.length && items[i].type === 'note') {
    i += 1;
  }
  if (i === 0) return items;

  const prefixNotes = items.slice(0, i);
  let j = i;
  while (j < items.length && isOrphanKanjiVocabCard(items[j])) {
    j += 1;
  }
  const runLen = j - i;
  if (runLen < 2) return items;

  /** @type {string[]} */
  const headerLines = [];
  /** @type {string[]} */
  const poolLines = [];
  for (const n of prefixNotes) {
    for (const line of String(n.text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      if (isVietnameseSectionHeader(line)) {
        headerLines.push(line);
      } else {
        poolLines.push(line);
      }
    }
  }

  if (poolLines.length === 0) return items;

  const used = new Set();
  /** @type {typeof items} */
  const cards = items.slice(i, j).map((c) => ({ ...c }));

  for (let k = 0; k < cards.length; k++) {
    const jp = String(cards[k].jp || '').trim();
    for (let p = 0; p < poolLines.length; p++) {
      if (used.has(p)) continue;
      if (viLineMatchesJp(poolLines[p], jp)) {
        used.add(p);
        cards[k] = { ...cards[k], vi: poolLines[p] };
        break;
      }
    }
  }

  let pi = 0;
  for (let k = 0; k < cards.length; k++) {
    if (String(cards[k].vi || '').trim()) continue;
    let assigned = false;
    while (pi < poolLines.length && !assigned) {
      while (pi < poolLines.length && used.has(pi)) {
        pi += 1;
      }
      if (pi >= poolLines.length) break;
      const line = poolLines[pi];
      if (viLineConflictsWithJp(line, cards[k].jp)) {
        pi += 1;
        continue;
      }
      used.add(pi);
      cards[k] = { ...cards[k], vi: line };
      pi += 1;
      assigned = true;
    }
  }

  const trailing = [];
  for (let p = 0; p < poolLines.length; p++) {
    if (!used.has(p)) {
      trailing.push(poolLines[p]);
    }
  }

  const result = [];
  if (headerLines.length > 0) {
    result.push({ type: 'note', text: headerLines.join('\n') });
  }
  result.push(...cards);
  if (trailing.length > 0) {
    result.push({ type: 'note', text: trailing.join('\n') });
  }
  result.push(...items.slice(j));
  return result;
}

function attachOrphanViFromShortNotes(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type !== 'card') {
      out.push(it);
      continue;
    }
    const jp = it.jp || '';
    const reading = (it.reading || '').trim();
    const vi = (it.vi || '').trim();
    const next = items[i + 1];
    if (
      hasKanji(jp) &&
      reading &&
      !vi &&
      next?.type === 'note'
    ) {
      const raw = next.text.trim();
      const nl = raw.indexOf('\n');
      const firstLine = (nl === -1 ? raw : raw.slice(0, nl)).trim();
      if (
        firstLine.length > 0 &&
        firstLine.length <= 80 &&
        !hasJapaneseText(firstLine) &&
        !isVietnameseSectionHeader(firstLine)
      ) {
        const rest = nl === -1 ? '' : raw.slice(nl + 1).trim();
        out.push({ ...it, vi: firstLine });
        if (rest.length > 0) {
          out.push({ type: 'note', text: rest });
        }
        i += 1;
        continue;
      }
    }
    out.push(it);
  }
  return out;
}

const MIN_P_TAGS = 6;
const MIN_CARDS = 3;

/** Nhiều khối ghi chú ngắn thay vì một ô cuộn quá cao. */
function splitLargeParagraphNotes(items, maxChars = 520) {
  /** @type {typeof items} */
  const out = [];
  for (const it of items) {
    if (it.type !== 'note' || String(it.text || '').length <= maxChars) {
      out.push(it);
      continue;
    }
    const lines = String(it.text || '').split('\n');
    let buf = '';
    const flush = () => {
      const t = buf.trim();
      if (t) out.push({ type: 'note', text: t });
      buf = '';
    };
    for (const line of lines) {
      const next = buf ? `${buf}\n${line}` : line;
      if (next.length > maxChars && buf) {
        flush();
        buf = line;
      } else {
        buf = next;
      }
    }
    flush();
  }
  return out;
}

/** Khi API đã có đủ từ vựng có cấu trúc, ưu tiên không dùng deck suy từ &lt;p&gt; (tránh vỡ layout). */
export const PREFER_VOCAB_COUNT_OVER_PARAGRAPH_DECK = 8;

function buildParagraphDeckItems(lines) {
  const collapsed = collapseTinyFragmentLines(lines);
  const kanaGlued = mergeDetachedKanaTails(collapsed);
  const kanjiGlued = mergeAdjacentKanjiClassifierLines(kanaGlued);
  const vnMerged = mergeConsecutiveVietnameseFragmentLines(kanjiGlued);
  const cleaned = dropLoneKanjiBetweenKanaFragments(vnMerged);
  let items = pairParagraphLines(cleaned);
  items = mergeAdjacentDeckCards(items);
  items = absorbFollowingKanaCrumbsIntoKanjiReading(items);
  for (let pass = 0; pass < 3; pass++) {
    items = distributeRunOnKanaReadings(items);
  }
  items = absorbFollowingKanaCrumbsIntoKanjiReading(items);
  items = redistributeLeadingNotesToOrphanKanjiCards(items);
  items = attachOrphanViFromShortNotes(items);
  items = splitLargeParagraphNotes(items);
  items = reflowNotesInItems(items);
  return items;
}

/**
 * @param {string} html
 * @returns {{ items: ReturnType<typeof buildParagraphDeckItems>, cardCount: number } | null}
 */
export function tryBuildParagraphDeckFromHtml(html) {
  if (typeof document === 'undefined') return null;
  const raw = String(html || '').trim();
  if (!isLikelyFlatParagraphLessonHtml(raw)) return null;

  const lines = extractParagraphTexts(raw);
  if (lines.length < MIN_P_TAGS) return null;

  const items = buildParagraphDeckItems(lines);
  const cardCount = items.filter((x) => x.type === 'card' && x.jp).length;
  if (cardCount < MIN_CARDS) return null;

  return { items, cardCount };
}
