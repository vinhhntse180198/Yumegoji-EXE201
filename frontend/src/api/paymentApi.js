import http from './client';

const BASE = '/api/Payment';

export const paymentApi = {
  getPremiumConfig: () => http.get(`${BASE}/premium/config`),

  createPremiumIntent: () => http.post(`${BASE}/premium/intent`, {}),

  confirmPremiumPayment: (body) => http.post(`${BASE}/premium/confirm`, body),

  getMyLatestPremiumIntent: () => http.get(`${BASE}/premium/me/latest`),
};
