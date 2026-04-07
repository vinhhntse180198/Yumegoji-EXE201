/**
 * Service đăng nhập / đăng ký / lấy thông tin user
 */
import http from './http';
import { storage } from '../utils/storage';
import { isStaffUser } from '../utils/roles';
import { API_ENDPOINTS } from '../constants/api';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const NEEDS_PLACEMENT_KEY = 'needs_placement_test';

/** API .NET có thể trả Id / UserId (Pascal) hoặc id (camel) — gom về id + userId cho UI. */
function normalizeUserShape(user) {
  if (!user || typeof user !== 'object') return user;
  const id = user.id ?? user.userId ?? user.Id ?? user.UserId;
  if (id == null) return user;
  return { ...user, id, userId: id };
}

/** JWT (AuthService) gán claim `sub` = user.Id — dùng khi localStorage thiếu user.id (tránh mọi tin bị coi là người khác). */
function parseJwtUserId(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const payload = JSON.parse(atob(b64));
    const raw =
      payload.sub ??
      payload.nameid ??
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export const authService = {
  /**
   * Backend expects: { usernameOrEmail, password }
   * Backend returns: { accessToken, user }
   */
  async login({ email, password, usernameOrEmail } = {}) {
    const payload = {
      usernameOrEmail: usernameOrEmail ?? email ?? '',
      password: password ?? '',
    };
    const { data } = await http.post(API_ENDPOINTS.AUTH.LOGIN, payload);

    if (data?.accessToken) {
      storage.set(TOKEN_KEY, data.accessToken);
      if (data.user) storage.set(USER_KEY, normalizeUserShape(data.user));
      if (typeof data.needsPlacementTest === 'boolean') {
        const u = data.user ? normalizeUserShape(data.user) : normalizeUserShape(storage.get(USER_KEY));
        storage.set(NEEDS_PLACEMENT_KEY, isStaffUser(u) ? false : !!data.needsPlacementTest);
      }
      return data?.user ? { ...data, user: normalizeUserShape(data.user) } : data;
    }

    throw new Error(data?.message || 'Đăng nhập thất bại');
  },

  /**
   * Backend expects: { username, email, password, levelCode? }
   */
  async register({ username, email, password, levelCode } = {}) {
    const payload = {
      username: username ?? '',
      email: email ?? '',
      password: password ?? '',
      levelCode: levelCode ?? null,
    };
    const { data } = await http.post(API_ENDPOINTS.AUTH.REGISTER, payload);
    return data;
  },

  /**
   * Backend chưa có /me. Khi cần, gọi /api/Auth/users/{id}.
   */
  async getUserById(id) {
    const { data } = await http.get(`${API_ENDPOINTS.USER.USERS}/${id}`);
    if (data) storage.set(USER_KEY, normalizeUserShape(data));
    return data ? normalizeUserShape(data) : data;
  },

  logout() {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    storage.remove(NEEDS_PLACEMENT_KEY);
  },

  getStoredToken() {
    return storage.get(TOKEN_KEY);
  },

  getStoredUser() {
    return normalizeUserShape(storage.get(USER_KEY));
  },

  setStoredUser(user) {
    storage.set(USER_KEY, normalizeUserShape(user));
  },

  /** Chỉ đọc `sub` / nameidentifier từ JWT — đúng với mọi request có Bearer token. */
  getJwtUserId() {
    return parseJwtUserId(storage.get(TOKEN_KEY));
  },

  /**
   * ID người dùng hiện tại cho chat/API: JWT là nguồn thật (khớp với backend).
   * Nếu object `user` trong storage lệch JWT (hay gặp khi đăng nhập tài khoản khác ở tab khác),
   * ưu tiên JWT để tránh tin nhắn bị gán nhầm “mình / họ”.
   */
  getEffectiveUserId() {
    const fromJwt = parseJwtUserId(storage.get(TOKEN_KEY));
    const u = normalizeUserShape(storage.get(USER_KEY));
    const fromUser = u?.id ?? u?.userId ?? u?.Id ?? u?.UserId;
    const n = Number(fromUser);
    const userNum = Number.isFinite(n) ? n : null;

    if (fromJwt != null && userNum != null && fromJwt !== userNum) {
      return fromJwt;
    }
    if (userNum != null) return userNum;
    return fromJwt;
  },

  isAuthenticated() {
    return !!storage.get(TOKEN_KEY);
  },

  getNeedsPlacementTest() {
    if (isStaffUser(normalizeUserShape(storage.get(USER_KEY)))) return false;
    return !!storage.get(NEEDS_PLACEMENT_KEY);
  },

  /** GET /api/Auth/users — yêu cầu JWT admin. */
  async adminListUsers() {
    const { data } = await http.get(API_ENDPOINTS.USER.USERS);
    return Array.isArray(data) ? data.map(normalizeUserShape) : [];
  },

  /** PUT /api/Auth/users/{id} */
  async adminUpdateUser(id, body) {
    const { data } = await http.put(`${API_ENDPOINTS.USER.USERS}/${id}`, body);
    return data ? normalizeUserShape(data) : data;
  },

  /** DELETE /api/Auth/users/{id} — xóa cứng user (admin). */
  async adminDeleteUser(id) {
    await http.delete(`${API_ENDPOINTS.USER.USERS}/${id}`);
  },

  /**
   * Hồ sơ của chính mình (UserProfile) — dùng cho avatar, display name,...
   */
  async getMyProfile() {
    const { data } = await http.get('/api/users/me/profile');
    return data;
  },

  async updateMyProfile(body) {
    const { data } = await http.put('/api/users/me/profile', body);
    return data;
  },
};
