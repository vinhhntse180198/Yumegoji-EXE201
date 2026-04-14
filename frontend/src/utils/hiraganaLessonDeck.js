/**
 * Bài HIRAGANA từ API thường bị import lẫn romaji / tiếng Việt — không parse được thành thẻ.
 * Dùng bảng chuẩn: hiragana lớn + romaji + nút nghe; ẩn nội dung HTML/markdown lộn xộn.
 */

export function isHiraganaLesson(title, slug) {
  const s = `${title || ''} ${slug || ''}`.toLowerCase();
  return (
    /\bhiragana\b/i.test(s) ||
    /ひらがな/.test(s) ||
    /chữ\s*thảo/i.test(title || '') ||
    /^hiragana$/i.test(String(slug || '').trim())
  );
}

/** @typedef {{ section?: string, jp?: string, reading?: string, gloss?: string }} HiraganaDeckItem */

/** @returns {HiraganaDeckItem[]} */
export function getHiraganaDeckSegmentItems() {
  /** @type {HiraganaDeckItem[]} */
  const out = [];

  const sec = (label) => out.push({ section: label });
  const add = (jp, reading, gloss) => out.push({ jp, reading, gloss });

  sec('Nguyên âm (bảng あ)');
  add('あ', 'a', 'âm a');
  add('い', 'i', 'âm i');
  add('う', 'u', 'âm u');
  add('え', 'e', 'âm e');
  add('お', 'o', 'âm o');

  sec('Hàng か — k');
  add('か', 'ka');
  add('き', 'ki');
  add('く', 'ku');
  add('け', 'ke');
  add('こ', 'ko');

  sec('Hàng さ — s');
  add('さ', 'sa');
  add('し', 'shi');
  add('す', 'su');
  add('せ', 'se');
  add('そ', 'so');

  sec('Hàng た — t');
  add('た', 'ta');
  add('ち', 'chi');
  add('つ', 'tsu');
  add('て', 'te');
  add('と', 'to');

  sec('Hàng な — n');
  add('な', 'na');
  add('に', 'ni');
  add('ぬ', 'nu');
  add('ね', 'ne');
  add('の', 'no');

  sec('Hàng は — h');
  add('は', 'ha');
  add('ひ', 'hi');
  add('ふ', 'fu');
  add('へ', 'he');
  add('ほ', 'ho');

  sec('Hàng ま — m');
  add('ま', 'ma');
  add('み', 'mi');
  add('む', 'mu');
  add('め', 'me');
  add('も', 'mo');

  sec('Hàng や — y');
  add('や', 'ya');
  add('ゆ', 'yu');
  add('よ', 'yo');

  sec('Hàng ら — r');
  add('ら', 'ra');
  add('り', 'ri');
  add('る', 'ru');
  add('れ', 're');
  add('ろ', 'ro');

  sec('Hàng わ & を');
  add('わ', 'wa');
  add('を', 'o / wo', 'trợ từ を');

  sec('Âm đặc biệt');
  add('ん', 'n', 'âm mũi / cách ngắt');

  sec('Trọng âm (だくてん) — g, z, d, b');
  add('が', 'ga');
  add('ぎ', 'gi');
  add('ぐ', 'gu');
  add('げ', 'ge');
  add('ご', 'go');
  add('ざ', 'za');
  add('じ', 'ji');
  add('ず', 'zu');
  add('ぜ', 'ze');
  add('ぞ', 'zo');
  add('だ', 'da');
  add('ぢ', 'ji');
  add('づ', 'zu');
  add('で', 'de');
  add('ど', 'do');
  add('ば', 'ba');
  add('び', 'bi');
  add('ぶ', 'bu');
  add('べ', 'be');
  add('ぼ', 'bo');

  sec('Bán trọng âm (はんだくてん) — p');
  add('ぱ', 'pa');
  add('ぴ', 'pi');
  add('ぷ', 'pu');
  add('ぺ', 'pe');
  add('ぽ', 'po');

  sec('Âm ghép (ようおん)');
  add('きゃ', 'kya');
  add('きゅ', 'kyu');
  add('きょ', 'kyo');
  add('しゃ', 'sha');
  add('しゅ', 'shu');
  add('しょ', 'sho');
  add('ちゃ', 'cha');
  add('ちゅ', 'chu');
  add('ちょ', 'cho');
  add('にゃ', 'nya');
  add('にゅ', 'nyu');
  add('にょ', 'nyo');
  add('ひゃ', 'hya');
  add('ひゅ', 'hyu');
  add('ひょ', 'hyo');
  add('みゃ', 'mya');
  add('みゅ', 'myu');
  add('みょ', 'myo');
  add('りゃ', 'rya');
  add('りゅ', 'ryu');
  add('りょ', 'ryo');
  add('ぎゃ', 'gya');
  add('ぎゅ', 'gyu');
  add('ぎょ', 'gyo');
  add('じゃ', 'ja');
  add('じゅ', 'ju');
  add('じょ', 'jo');
  add('びゃ', 'bya');
  add('びゅ', 'byu');
  add('びょ', 'byo');
  add('ぴゃ', 'pya');
  add('ぴゅ', 'pyu');
  add('ぴょ', 'pyo');

  return out;
}
