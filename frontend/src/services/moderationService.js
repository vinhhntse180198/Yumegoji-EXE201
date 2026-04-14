import { moderationApi } from '../api/moderationApi';

function cleanParams(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const moderationService = {
  async getStaffOverview(trendDays = 7) {
    const { data } = await moderationApi.getStaffOverview({ trendDays });
    return data;
  },

  async listStaffReports({ type, severity, status, limit = 80 } = {}) {
    const { data } = await moderationApi.listStaffReports({
      params: cleanParams({ type, severity, status, limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  async resolveReport(reportId, { status = 'resolved', resolutionNote = '' } = {}) {
    const { data } = await moderationApi.resolveReport(reportId, {
      status,
      resolutionNote,
    });
    return data;
  },

  async escalateLockRequest(reportId, resolutionNote = '') {
    const { data } = await moderationApi.escalateLockRequest(reportId, {
      resolutionNote,
    });
    return data;
  },

  async issueWarning({ userId, reason, reportId }) {
    const { data } = await moderationApi.issueWarning({
      userId,
      reason,
      reportId: reportId ?? null,
    });
    return data;
  },

  async listUserWarnings(userId, limit = 50) {
    const { data } = await moderationApi.listUserWarnings(userId, {
      params: { limit },
    });
    return Array.isArray(data) ? data : [];
  },

  async listStaffLearners({ limit = 200 } = {}) {
    const { data } = await moderationApi.listStaffLearners({
      params: cleanParams({ limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  async patchLearnerLevel(userId, levelId) {
    await moderationApi.patchLearnerLevel(userId, {
      levelId: levelId === undefined ? null : levelId,
    });
  },

  async listAdminLockRequests({ status = 'pending_admin_lock', limit = 100 } = {}) {
    const { data } = await moderationApi.listAdminLockRequests({ status, limit });
    return Array.isArray(data) ? data : [];
  },

  async approveAdminLockRequest(reportId, note = '') {
    const { data } = await moderationApi.approveAdminLockRequest(reportId, { note });
    return data;
  },

  async rejectAdminLockRequest(reportId, note = '') {
    const { data } = await moderationApi.rejectAdminLockRequest(reportId, { note });
    return data;
  },
};
