import http from './http';

const BASE = '/api/Payment';

export const paymentService = {
  async getPremiumConfig() {
    const { data } = await http.get(`${BASE}/premium/config`);
    return data ?? null;
  },

  async createPremiumIntent() {
    const { data } = await http.post(`${BASE}/premium/intent`, {});
    return data ?? null;
  },

  async confirmPremiumPayment(token) {
    const { data } = await http.post(`${BASE}/premium/confirm`, { token });
    return data ?? null;
  },

  async getMyLatestPremiumIntent() {
    const res = await http.get(`${BASE}/premium/me/latest`);
    if (res.status === 204) return null;
    return res.data ?? null;
  },
};
