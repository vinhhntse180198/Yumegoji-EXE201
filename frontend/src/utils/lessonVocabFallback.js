/** Chuẩn hóa từ cột wordJp để khớp với khóa số đếm (lấy cụm đầu trước dấu phân tách). */
export function vocabKeyFromWordJp(wordJp) {
  return String(wordJp || '')
    .split(/[、,／/|]/)[0]
    .trim();
}

/** Danh sách đủ 1–10 (hiragana + đọc + nghĩa) — dùng khi API chỉ trả một phần. */
const N5_NUMBERS_1_10 = [
  { key: 'いち', wordJp: 'いち', reading: 'ichi', meaningVi: 'Một (1)' },
  { key: 'に', wordJp: 'に', reading: 'ni', meaningVi: 'Hai (2)' },
  { key: 'さん', wordJp: 'さん', reading: 'san', meaningVi: 'Ba (3)' },
  { key: 'し', wordJp: 'し／よん', reading: 'shi / yon', meaningVi: 'Bốn (4) — thường đọc し khi đếm; よん khi đọc số riêng' },
  { key: 'ご', wordJp: 'ご', reading: 'go', meaningVi: 'Năm (5)' },
  { key: 'ろく', wordJp: 'ろく', reading: 'roku', meaningVi: 'Sáu (6)' },
  { key: 'なな', wordJp: 'なな／しち', reading: 'nana / shichi', meaningVi: 'Bảy (7)' },
  { key: 'はち', wordJp: 'はち', reading: 'hachi', meaningVi: 'Tám (8)' },
  { key: 'きゅう', wordJp: 'きゅう', reading: 'kyū', meaningVi: 'Chín (9)' },
  { key: 'じゅう', wordJp: 'じゅう', reading: 'jū', meaningVi: 'Mười (10)' },
];

function isNumbers1To10Lesson(title, slug) {
  const haystack = `${title || ''} ${slug || ''}`.toLowerCase();
  return (
    /số\s*đếm\s*1[\s\-–]*10/.test(haystack) ||
    /đếm\s*1[\s\-–]*10/.test(haystack) ||
    /1[\s\-–]*10.*đếm/.test(haystack) ||
    /numbers?\s*1[\s\-–]*10/.test(haystack) ||
    /so-dem|dem-1-10|dem-so|counting\s*1[\s\-–]*10/i.test(haystack)
  );
}

function canonicalSortIndex(wordJp) {
  const k = vocabKeyFromWordJp(wordJp);
  const i = N5_NUMBERS_1_10.findIndex((c) => c.key === k);
  return i >= 0 ? i : 1000;
}

/**
 * Nếu là bài “số đếm 1–10” mà API thiếu mục, ghép thêm từ fallback (cùng nút nghe).
 */
export function augmentVocabNumbers1To10(vocab, title, slug) {
  const list = Array.isArray(vocab) ? vocab : [];
  if (!isNumbers1To10Lesson(title, slug) || list.length >= 10) {
    return list;
  }

  const numberKeys = new Set(N5_NUMBERS_1_10.map((c) => c.key));
  const hasNumberOverlap = list.some((v) =>
    numberKeys.has(vocabKeyFromWordJp(v.wordJp ?? v.WordJp))
  );
  if (list.length > 0 && !hasNumberOverlap) {
    return list;
  }

  const seen = new Set(
    list.map((v) => vocabKeyFromWordJp(v.wordJp ?? v.WordJp)).filter(Boolean)
  );

  const merged = list.map((v) => ({ ...v }));

  N5_NUMBERS_1_10.forEach((row) => {
    if (seen.has(row.key)) return;
    merged.push({
      id: `fallback-n5-${row.key}`,
      wordJp: row.wordJp,
      WordJp: row.wordJp,
      reading: row.reading,
      Reading: row.reading,
      meaningVi: row.meaningVi,
      MeaningVi: row.meaningVi,
    });
    seen.add(row.key);
  });

  merged.sort(
    (a, b) =>
      canonicalSortIndex(a.wordJp ?? a.WordJp) - canonicalSortIndex(b.wordJp ?? b.WordJp)
  );

  return merged;
}
