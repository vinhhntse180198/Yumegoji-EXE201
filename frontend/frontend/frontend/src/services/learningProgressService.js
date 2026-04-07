import http from './http';

export async function fetchMyProgressSummary() {
  const { data } = await http.get('/api/users/me/progress/summary');
  return data ?? {};
}
