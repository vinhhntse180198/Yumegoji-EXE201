import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ENV from '../../config/env';
import { PremiumBadge } from '../profile/PremiumBadge';
import { userIsPremium } from '../../utils/userPremium';
import { useChatUnreadTotal } from '../../hooks/useChatUnreadTotal';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../constants/routes';
import yumeLogo from '../../assets/yume-logo.png';

function initialsFromUser(user, displayName) {
  const n = String(displayName || '').trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  const u = user?.username || user?.email || '';
  return String(u).slice(0, 1).toUpperCase() || 'U';
}

function buildAvatarSrc(user) {
  const path = user?.avatarUrl ?? user?.AvatarUrl;
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = ENV.API_URL || '';
  return `${origin}${path}`;
}

function IconBook() {
  return (
    <svg className="learner-nav__ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M4 5a2 2 0 012-2h5v16H6a2 2 0 01-2-2V5zm8-2h5a2 2 0 012 2v11a2 2 0 01-2 2h-5V3z"
      />
    </svg>
  );
}

function IconGame() {
  return (
    <svg className="learner-nav__ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M8 12v-2h2v2H8zm6 0h2v-2h-2v2zm-1 4a1 1 0 100-2 1 1 0 000 2zm4-10H7a5 5 0 00-5 5v2a5 5 0 005 5h10a5 5 0 005-5v-2a5 5 0 00-5-5z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg className="learner-nav__ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3h-2l-4 3v-3H7a3 3 0 01-3-3V6z"
      />
    </svg>
  );
}

/**
 * Thanh trên YumeGo-ji: học viên — Học tập, Trò chơi, Chat; admin — Dashboard + Chat; moderator — Điều hành + Chat.
 */
export function LearnerTopNav() {
  const { user, logout, isAuthenticated } = useAuth();
  const { total: chatUnreadTotal, rooms: chatRooms, refresh: refreshChatUnread } = useChatUnreadTotal(
    !!isAuthenticated
  );
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /** Trên nav: không tính unread phòng đang mở (đang xem = đã xử lý UI trong phòng). */
  const navChatUnread = useMemo(() => {
    const m = pathname.match(/^\/chat\/room\/([^/]+)/);
    const activeId = m ? m[1] : null;
    if (!activeId) return chatUnreadTotal;
    const row = chatRooms.find((r) => String(r.id ?? r.Id) === String(activeId));
    const here = Number(row?.unreadCount ?? row?.UnreadCount ?? 0) || 0;
    return Math.max(0, chatUnreadTotal - here);
  }, [pathname, chatUnreadTotal, chatRooms]);

  useEffect(() => {
    if (!isAuthenticated || !pathname.startsWith('/chat')) return;
    void refreshChatUnread();
  }, [pathname, isAuthenticated, refreshChatUnread]);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  const displayName = user?.displayName || user?.username || user?.name || user?.email || 'Học viên';
  const initials = initialsFromUser(user, displayName);
  const avatarSrc = isAuthenticated ? buildAvatarSrc(user) : '';
  const xuBalance = Number(user?.xu ?? user?.Xu ?? 0) || 0;
  const roleNorm = String(user?.role ?? user?.Role ?? 'user').toLowerCase();
  const isAdminUser = roleNorm === 'admin';
  const isModeratorUser = roleNorm === 'moderator';
  const roleLine = isAdminUser ? 'Quản trị viên' : isModeratorUser ? 'Điều hành viên' : 'Học viên';
  /** Admin / Moderator: không Học tập / Trò chơi — trang nghiệp vụ + Chat. */
  const staffNav = isAdminUser || isModeratorUser;
  const showVipAvatarFrame = !staffNav && xuBalance >= 100;
  const showPremiumBadge = !staffNav && userIsPremium(user);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <header className="learner-nav">
      <div className="learner-nav__inner">
        <Link to={isAdminUser ? ROUTES.ADMIN : isModeratorUser ? ROUTES.MODERATOR : ROUTES.DASHBOARD} className="learner-nav__brand">
          <img src={yumeLogo} alt="YumeGo-ji" className="learner-nav__brand-logo" />
        </Link>

        <nav
          className="learner-nav__links"
          aria-label={staffNav ? 'Trang nghiệp vụ và Chat' : 'Điều hướng chính'}
        >
          {staffNav ? (
            <>
              <NavLink
                to={isAdminUser ? ROUTES.ADMIN : ROUTES.MODERATOR}
                end
                className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}
              >
                {isAdminUser ? 'Dashboard' : 'Điều hành'}
              </NavLink>
              <NavLink
                to={ROUTES.CHAT}
                className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}
                aria-label={navChatUnread > 0 ? `Chat, ${navChatUnread} tin chưa đọc` : undefined}
              >
                <span className="learner-nav__icon-badge-wrap">
                  <IconChat />
                  {navChatUnread > 0 ? (
                    <span className="learner-nav__nav-badge" title={`${navChatUnread} tin chưa đọc ở phòng khác`}>
                      {navChatUnread > 99 ? '99+' : navChatUnread}
                    </span>
                  ) : null}
                </span>
                Chat
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to={ROUTES.LEARN} className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}>
                <IconBook />
                Học tập
              </NavLink>
              <NavLink to={ROUTES.PLAY} className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}>
                <IconGame />
                Trò chơi
              </NavLink>
              <NavLink
                to={ROUTES.CHAT}
                className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}
                aria-label={navChatUnread > 0 ? `Chat, ${navChatUnread} tin chưa đọc` : undefined}
              >
                <span className="learner-nav__icon-badge-wrap">
                  <IconChat />
                  {navChatUnread > 0 ? (
                    <span className="learner-nav__nav-badge" title={`${navChatUnread} tin chưa đọc ở phòng khác`}>
                      {navChatUnread > 99 ? '99+' : navChatUnread}
                    </span>
                  ) : null}
                </span>
                Chat
              </NavLink>
              <NavLink
                to={ROUTES.UPGRADE}
                className={({ isActive }) => `learner-nav__link ${isActive ? 'learner-nav__link--active' : ''}`}
              >
                🛒 Upgrade
              </NavLink>
            </>
          )}
        </nav>

        <div className="learner-nav__right">
          <button
            type="button"
            className="learner-nav__theme"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="learner-nav__user-wrap" ref={wrapRef}>
            <button
              type="button"
              className="learner-nav__user"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span
                className={
                  showVipAvatarFrame
                    ? 'learner-nav__avatar-wrap learner-nav__avatar-wrap--vip'
                    : 'learner-nav__avatar-wrap'
                }
                title={showVipAvatarFrame ? 'Khung VIP — từ 100 xu trở lên' : undefined}
              >
                {avatarSrc ? (
                  <img className="learner-nav__avatar learner-nav__avatar--img" src={avatarSrc} alt="" />
                ) : (
                  <span className="learner-nav__avatar">{initials}</span>
                )}
              </span>
              <span className="learner-nav__user-text">
                <span className="learner-nav__user-name">{displayName}</span>
                <span className="learner-nav__user-role-row">
                  <span className="learner-nav__user-role">{roleLine}</span>
                  {showPremiumBadge ? <PremiumBadge variant="nav" /> : null}
                </span>
              </span>
              <span className="learner-nav__caret" aria-hidden>
                ▾
              </span>
            </button>
            {menuOpen && (
              <div className="learner-nav__dropdown" role="menu">
                {!staffNav ? (
                  <>
                    <Link
                      to={ROUTES.DASHBOARD}
                      className="learner-nav__dropdown-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={ROUTES.ACCOUNT}
                      className="learner-nav__dropdown-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      Account
                    </Link>
                  </>
                ) : null}
                <button
                  type="button"
                  className="learner-nav__dropdown-item learner-nav__dropdown-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    navigate(ROUTES.LOGIN);
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
