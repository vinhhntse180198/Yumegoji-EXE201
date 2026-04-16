import http, { API_ENDPOINTS } from './client';

export const authApi = {
  login: (payload) => http.post(API_ENDPOINTS.AUTH.LOGIN, payload),

  register: (payload) => http.post(API_ENDPOINTS.AUTH.REGISTER, payload),

  forgotPassword: (payload) => http.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload),

  resetPassword: (payload) => http.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload),

  googleLogin: (payload) => http.post(API_ENDPOINTS.AUTH.GOOGLE, payload),

  getUserById: (id) => http.get(`${API_ENDPOINTS.USER.USERS}/${id}`),

  adminListUsers: () => http.get(API_ENDPOINTS.USER.USERS),

  adminUpdateUser: (id, body) => http.put(`${API_ENDPOINTS.USER.USERS}/${id}`, body),

  adminDeleteUser: (id) => http.delete(`${API_ENDPOINTS.USER.USERS}/${id}`),

  getMyProfile: () => http.get('/api/users/me/profile'),

  updateMyProfile: (body) => http.put('/api/users/me/profile', body),
};
