import http from './client';

const BASE = '/api/Moderation';

export const moderationApi = {
  getStaffOverview: (params) => http.get(`${BASE}/staff/overview`, { params }),

  listStaffReports: (config) => http.get(`${BASE}/staff/reports`, config),

  resolveReport: (reportId, body) => http.patch(`${BASE}/staff/reports/${reportId}/resolve`, body),

  escalateLockRequest: (reportId, body) => http.post(`${BASE}/staff/reports/${reportId}/escalate-lock`, body),

  issueWarning: (body) => http.post(`${BASE}/staff/warnings`, body),

  listUserWarnings: (userId, config) => http.get(`${BASE}/staff/users/${userId}/warnings`, config),

  listStaffLearners: (config) => http.get(`${BASE}/staff/learners`, config),

  patchLearnerLevel: (userId, body) => http.patch(`${BASE}/staff/learners/${userId}/level`, body),

  listAdminLockRequests: (params) => http.get(`${BASE}/admin/lock-requests`, { params }),

  approveAdminLockRequest: (reportId, body) =>
    http.post(`${BASE}/admin/lock-requests/${reportId}/approve`, body),

  rejectAdminLockRequest: (reportId, body) =>
    http.post(`${BASE}/admin/lock-requests/${reportId}/reject`, body),
};
