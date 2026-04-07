import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

/** Chỉ user có role `moderator` (JWT + object user). */
export function ModeratorRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="page-loading">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const role = String(user?.role ?? user?.Role ?? '').toLowerCase();
  if (role !== 'moderator') {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
}
