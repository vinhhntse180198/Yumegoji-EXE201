/**
 * Hàm format dữ liệu hiển thị
 */

export function formatDate(date, locale = 'vi-VN') {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date, locale = 'vi-VN') {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num, options = {}) {
  if (num == null) return '';
  return new Intl.NumberFormat('vi-VN', options).format(num);
}
