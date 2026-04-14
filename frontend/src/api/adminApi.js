/**
 * Gọi HTTP thuần — Admin & Payment admin. Không chuẩn hóa dữ liệu cho UI (việc đó ở services/adminService).
 */
import http from './client';

const ADMIN_BASE = '/api/Admin';

export const adminApi = {
  getOverview: () => http.get(`${ADMIN_BASE}/overview`),

  listSensitiveKeywords: () => http.get(`${ADMIN_BASE}/sensitive-keywords`),

  createSensitiveKeyword: (body) => http.post(`${ADMIN_BASE}/sensitive-keywords`, body),

  updateSensitiveKeyword: (id, body) => http.patch(`${ADMIN_BASE}/sensitive-keywords/${id}`, body),

  deleteSensitiveKeyword: (id) => http.delete(`${ADMIN_BASE}/sensitive-keywords/${id}`),

  getPremiumConfig: () => http.get('/api/Payment/admin/premium/config'),

  updatePremiumConfig: (body) => http.put('/api/Payment/admin/premium/config', body),

  listPremiumRequests: (params) => http.get('/api/Payment/admin/premium/requests', { params }),

  approvePremiumRequest: (id, body) =>
    http.post(`/api/Payment/admin/premium/requests/${id}/approve`, body),

  rejectPremiumRequest: (id, body) =>
    http.post(`/api/Payment/admin/premium/requests/${id}/reject`, body),
};
