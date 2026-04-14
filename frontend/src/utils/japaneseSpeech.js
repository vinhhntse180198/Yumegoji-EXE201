/**
 * Đọc văn bản tiếng Nhật qua Speech Synthesis của trình duyệt (không cần file âm thanh).
 * Chất lượng giọng phụ thuộc OS/trình duyệt; Chrome thường có giọng ja khá ổn.
 */

const JP_CHAR =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf\uff66-\uff9f]/;

export function japaneseSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickJapaneseVoice() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja')) ||
    voices.find((v) => /japanese|日本語/i.test(v.name || '')) ||
    null
  );
}

export function stopJapaneseSpeech() {
  if (japaneseSpeechSupported()) window.speechSynthesis.cancel();
}

/**
 * @param {string} text
 * @returns {boolean} có bắt đầu đọc hay không
 */
export function speakJapanese(text) {
  if (!japaneseSpeechSupported()) return false;
  const raw = String(text || '').trim();
  if (!raw) return false;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(raw);
  u.lang = 'ja-JP';
  const voice = pickJapaneseVoice();
  if (voice) u.voice = voice;
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
  return true;
}

/**
 * Lấy các dòng có ký tự Nhật từ innerText của vùng HTML bài học, ghép lại để đọc.
 */
export function speakJapaneseFromElement(rootEl) {
  if (!rootEl || !japaneseSpeechSupported()) return false;
  const text = rootEl.innerText || '';
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const jaLines = lines.filter((line) => JP_CHAR.test(line));
  const joined = jaLines.join(' ').replace(/\s{2,}/g, ' ').trim();
  if (!joined) return false;
  const max = 12000;
  return speakJapanese(joined.length > max ? joined.slice(0, max) : joined);
}

export function warmJapaneseVoices() {
  if (!japaneseSpeechSupported()) return;
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) return;
  const once = () => {
    synth.getVoices();
    synth.removeEventListener('voiceschanged', once);
  };
  synth.addEventListener('voiceschanged', once);
}
