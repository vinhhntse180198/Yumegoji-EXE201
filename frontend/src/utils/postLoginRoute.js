import { ROUTES } from '../data/routes';
import { authService } from '../services/authService';

/** Sau đăng nhập: admin → /admin, moderator → /moderator; còn lại → fallback hoặc dashboard học viên. */
export function getPostLoginRoute(user, fallbackPath) {
  const merged = authService.mergeUserWithRoleFromToken(user ?? authService.getStoredUser());
  const role = String(
    merged?.role ?? merged?.Role ?? authService.getRoleFromStoredToken() ?? 'user',
  ).toLowerCase();
  if (role === 'admin') return ROUTES.ADMIN;
  if (role === 'moderator') return ROUTES.MODERATOR;
  return fallbackPath || ROUTES.DASHBOARD;
}
