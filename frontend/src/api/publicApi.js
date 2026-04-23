import http from './client';

const PUBLIC_BASE = '/api/Public';

export const publicApi = {
  getLatestSystemAnnouncement: () => http.get(`${PUBLIC_BASE}/system-announcements/latest`),
};
