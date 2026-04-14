import http from './client';

export const learningProgressApi = {
  getMyProgressSummary: () => http.get('/api/users/me/progress/summary'),
};
