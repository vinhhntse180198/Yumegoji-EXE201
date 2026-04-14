import { paymentApi } from '../api/paymentApi';

export const paymentService = {
  async getPremiumConfig() {
    const { data } = await paymentApi.getPremiumConfig();
    return data ?? null;
  },

  async createPremiumIntent() {
    const { data } = await paymentApi.createPremiumIntent();
    return data ?? null;
  },

  async confirmPremiumPayment(token) {
    const { data } = await paymentApi.confirmPremiumPayment({ token });
    return data ?? null;
  },

  async getMyLatestPremiumIntent() {
    const res = await paymentApi.getMyLatestPremiumIntent();
    if (res.status === 204) return null;
    return res.data ?? null;
  },
};
