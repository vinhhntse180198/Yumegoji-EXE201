import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from '../data/routes';
import yumeLogo from '../assets/yume-logo.png';

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isRegisterPage = location.pathname === ROUTES.REGISTER;

  return (
    <header className="layout-header">
      <Link to={ROUTES.HOME} className="layout-header__logo">
        <img src={yumeLogo} alt="YumeGo-ji" className="layout-header__logo-img" />
      </Link>
      <nav className="layout-header__nav">
        <button
          type="button"
          className="layout-header__theme"
          onClick={toggleTheme}
          aria-label="Chuyển sáng/tối"
          title="Chuyển sáng/tối"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <Link to={ROUTES.HOME}>Trang chủ</Link>
        {isAuthenticated ? (
          <>
            <Link to={ROUTES.CHAT}>Chat</Link>
            <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
            <Link to={ROUTES.ACCOUNT}>Account</Link>
            <button type="button" onClick={logout} className="layout-header__btn">
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
            {isRegisterPage && (
              <Link to={ROUTES.REGISTER} className="btn btn--inverted btn--sm">
                Đăng ký
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
