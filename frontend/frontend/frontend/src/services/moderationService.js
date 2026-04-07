import http from './http';

const BASE = '/api/Moderation';

function cleanParams(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const moderationService = {
  async getStaffOverview(trendDays = 7) {
    const { data } = await http.get(`${BASE}/staff/overview`, { params: { trendDays } });
    return data;
  },

  async listStaffReports({ type, severity, status, limit = 80 } = {}) {
    const { data } = await http.get(`${BASE}/staff/reports`, {
      params: cleanParams({ type, severity, status, limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  async resolveReport(reportId, { status = 'resolved', resolutionNote = '' } = {}) {
    const { data } = await http.patch(`${BASE}/staff/reports/${reportId}/resolve`, {
      status,
      resolutionNote,
    });
    return data;
  },

  async escalateLockRequest(reportId, resolutionNote = '') {
    const { data } = await http.post(`${BASE}/staff/reports/${reportId}/escalate-lock`, {
      resolutionNote,
    });
    return data;
  },

  async issueWarning({ userId, reason, reportId }) {
    const { data } = await http.post(`${BASE}/staff/warnings`, {
      userId,
      reason,
      reportId: reportId ?? null,
    });
    return data;
  },

  async listUserWarnings(userId, limit = 50) {
    const { data } = await http.get(`${BASE}/staff/users/${userId}/warnings`, {
      params: { limit },
    });
    return Array.isArray(data) ? data : [];
  },

  /** Học viên (users.role = user) — tab Quản lý học viên. */
  async listStaffLearners({ limit = 200 } = {}) {
    const { data } = await http.get(`${BASE}/staff/learners`, {
      params: cleanParams({ limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  async patchLearnerLevel(userId, levelId) {
    await http.patch(`${BASE}/staff/learners/${userId}/level`, {
      levelId: levelId === undefined ? null : levelId,
    });
  },

  async listAdminLockRequests({ status = 'pending_admin_lock', limit = 100 } = {}) {
    const { data } = await http.get(`${BASE}/admin/lock-requests`, { params: { status, limit } });
    return Array.isArray(data) ? data : [];
  },

  async approveAdminLockRequest(reportId, note = '') {
    const { data } = await http.post(`${BASE}/admin/lock-requests/${reportId}/approve`, { note });
    return data;
  },

  async rejectAdminLockRequest(reportId, note = '') {
    const { data } = await http.post(`${BASE}/admin/lock-requests/${reportId}/reject`, { note });
    return data;
  },
};
