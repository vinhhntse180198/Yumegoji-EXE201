import http from './http';

const BASE = '/api/Admin';

export const adminService = {
  async getOverview() {
    const { data } = await http.get(`${BASE}/overview`);
    return data;
  },

  async listSensitiveKeywords() {
    const { data } = await http.get(`${BASE}/sensitive-keywords`);
    return Array.isArray(data) ? data : [];
  },

  async createSensitiveKeyword({ keyword, severity = 1 }) {
    const { data } = await http.post(`${BASE}/sensitive-keywords`, { keyword, severity });
    return data;
  },

  async updateSensitiveKeyword(id, body) {
    await http.patch(`${BASE}/sensitive-keywords/${id}`, body);
  },

  async deleteSensitiveKeyword(id) {
    await http.delete(`${BASE}/sensitive-keywords/${id}`);
  },

  async getPremiumConfig() {
    const { data } = await http.get('/api/Payment/admin/premium/config');
    return data ?? null;
  },

  async updatePremiumConfig(body) {
    const { data } = await http.put('/api/Payment/admin/premium/config', body);
    return data ?? null;
  },

  async listPremiumRequests(status = 'pending_review') {
    const { data } = await http.get('/api/Payment/admin/premium/requests', { params: { status } });
    return Array.isArray(data) ? data : [];
  },

  async approvePremiumRequest(id, note = '') {
    const { data } = await http.post(`/api/Payment/admin/premium/requests/${id}/approve`, { note });
    return data ?? null;
  },

  async rejectPremiumRequest(id, note = '') {
    const { data } = await http.post(`/api/Payment/admin/premium/requests/${id}/reject`, { note });
    return data ?? null;
  },
};
