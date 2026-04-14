const N5_STORAGE_KEY = 'yume_n5_progress_v1';

export function readN5Done() {
  try {
    const raw = localStorage.getItem(N5_STORAGE_KEY);
    if (!raw) return new Set();
    const o = JSON.parse(raw);
    const slugs = o?.slugsCompleted;
    return new Set(Array.isArray(slugs) ? slugs : []);
  } catch {
    return new Set();
  }
}

export function writeN5DoneSlug(slug) {
  if (!slug) return;
  try {
    const s = readN5Done();
    s.add(slug);
    localStorage.setItem(N5_STORAGE_KEY, JSON.stringify({ slugsCompleted: [...s] }));
  } catch {
    /* ignore */
  }
}
