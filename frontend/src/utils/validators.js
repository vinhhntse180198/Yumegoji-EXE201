/**
 * Hàm validate form / input
 */

export function isRequired(value) {
  if (value == null) return false;
  const s = String(value).trim();
  return s.length > 0;
}

export function isEmail(value) {
  if (!value || typeof value !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(value.trim());
}

export function minLength(value, min) {
  if (value == null) return false;
  return String(value).length >= min;
}

export function maxLength(value, max) {
  if (value == null) return true;
  return String(value).length <= max;
}
