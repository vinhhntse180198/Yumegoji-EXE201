import { ROUTES } from '../constants/routes';

/** Sau đăng nhập: admin → /admin, moderator → /moderator; còn lại → fallback hoặc dashboard học viên. */
export function getPostLoginRoute(user, fallbackPath) {
  const role = String(user?.role ?? user?.Role ?? 'user').toLowerCase();
  if (role === 'admin') return ROUTES.ADMIN;
  if (role === 'moderator') return ROUTES.MODERATOR;
  return fallbackPath || ROUTES.DASHBOARD;
}
