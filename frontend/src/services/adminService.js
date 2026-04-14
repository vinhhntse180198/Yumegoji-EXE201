import { adminApi } from '../api/adminApi';

/** Service Admin: dùng adminApi, chuẩn hóa dữ liệu trả về cho UI. */
export const adminService = {
  async getOverview() {
    const { data } = await adminApi.getOverview();
    return data;
  },

  async listSensitiveKeywords() {
    const { data } = await adminApi.listSensitiveKeywords();
    return Array.isArray(data) ? data : [];
  },

  async createSensitiveKeyword({ keyword, severity = 1 }) {
    const { data } = await adminApi.createSensitiveKeyword({ keyword, severity });
    return data;
  },

  async updateSensitiveKeyword(id, body) {
    await adminApi.updateSensitiveKeyword(id, body);
  },

  async deleteSensitiveKeyword(id) {
    await adminApi.deleteSensitiveKeyword(id);
  },

  async getPremiumConfig() {
    const { data } = await adminApi.getPremiumConfig();
    return data ?? null;
  },

  async updatePremiumConfig(body) {
    const { data } = await adminApi.updatePremiumConfig(body);
    return data ?? null;
  },

  async listPremiumRequests(status = 'pending_review') {
    const { data } = await adminApi.listPremiumRequests({ status });
    return Array.isArray(data) ? data : [];
  },

  async approvePremiumRequest(id, note = '') {
    const { data } = await adminApi.approvePremiumRequest(id, { note });
    return data ?? null;
  },

  async rejectPremiumRequest(id, note = '') {
    const { data } = await adminApi.rejectPremiumRequest(id, { note });
    return data ?? null;
  },
};
