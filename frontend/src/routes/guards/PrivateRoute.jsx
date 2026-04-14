import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../data/routes';
import { isStaffUser } from '../../utils/roles';

/**
 * Bảo vệ route: chỉ cho vào khi đã đăng nhập, không thì redirect về /login
 */
export function PrivateRoute({ children }) {
  const { isAuthenticated, loading, needsPlacementTest, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-loading">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const isOnPlacement = location.pathname === ROUTES.PLACEMENT_TEST;
  const staffSkipsPlacement = isStaffUser(user);
  if (isAuthenticated && needsPlacementTest && !staffSkipsPlacement && !isOnPlacement) {
    return <Navigate to={ROUTES.PLACEMENT_TEST} replace />;
  }

  return children;
}
