import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../data/routes';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import { GamesAdminTab } from './tabs/GamesAdminTab';
import { ModerationAdminTab } from './tabs/ModerationAdminTab';
import { OverviewTab } from './tabs/OverviewTab';
import { PaymentsAdminTab } from './tabs/PaymentsAdminTab';
import { RevenueTab } from './tabs/RevenueTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { SystemAdminTab } from './tabs/SystemAdminTab';
import { UsersTab } from './tabs/UsersTab';

/** Alias để ESLint nhận diện biến dùng qua JSX. */
const Motion = motion;

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: '📊' },
  { id: 'revenue', label: 'Doanh thu', icon: '💲' },
  { id: 'payments', label: 'Thanh toán', icon: '🧾' },
  { id: 'users', label: 'Người dùng', icon: '👥' },
  { id: 'games', label: 'Trò chơi', icon: '🎮' },
  { id: 'moderation', label: 'Kiểm duyệt', icon: '🛡️' },
  { id: 'system', label: 'Hệ Thống', icon: '⚙️' },
  { id: 'suggestions', label: 'Đề xuất', icon: '💡' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const reduceMotion = useReducedMotion();

  const displayName = useMemo(
    () => user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'Quản trị viên',
    [user],
  );

  const tabLabel = useMemo(() => TABS.find((t) => t.id === tab)?.label ?? 'Quản trị', [tab]);

  /** Một số trình duyệt ngắt sai tiếng Việt trong tiêu đề hẹp — hiển thị tường minh. */
  const pageTitleNode = useMemo(() => {
    if (tab === 'system') return 'Hệ Thống';
    if (tab === 'suggestions') return 'Đề xuất';
    return tabLabel;
  }, [tab, tabLabel]);

  return (
    <div className="admin-dash admin-dash--kurenai" lang="vi">
      <aside className="admin-dash__sidebar" aria-label="Điều hướng quản trị">
        <div className="admin-dash__sidebar-brand">
          <span className="admin-dash__sidebar-brand-title">Admin</span>
        </div>

        <nav className="admin-dash__sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-dash__sidebar-link ${tab === t.id ? 'admin-dash__sidebar-link--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="admin-dash__sidebar-link-ico" aria-hidden>
                {t.icon}
              </span>
              <span className="admin-dash__sidebar-link-label">
                {t.id === 'system' ? (
                  <span className="admin-dash__sidebar-link-text-nowrap">Hệ Thống</span>
                ) : t.id === 'suggestions' ? (
                  'Đề xuất'
                ) : (
                  t.label
                )}
              </span>
            </button>
          ))}
        </nav>

        <div className="admin-dash__sidebar-foot">
          <div className="admin-dash__status-pill admin-dash__status-pill--sidebar" title="Trạng thái hệ thống">
            <span className="admin-dash__pulse" aria-hidden />
            Hệ thống hoạt động bình thường
          </div>
          <div className="admin-dash__sidebar-links">
            <button type="button" className="admin-dash__sidebar-muted-link" onClick={() => navigate(ROUTES.ACCOUNT)}>
              Tài khoản
            </button>
            <button
              type="button"
              className="admin-dash__sidebar-muted-link"
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-dash__main-col">
        <header className="admin-dash__main-head">
          <div className="admin-dash__main-head-text">
            <h1 className="admin-dash__page-title admin-dash__page-title--vi">{pageTitleNode}</h1>
            <p className="admin-dash__welcome">Chào mừng, {displayName}</p>
          </div>
        </header>

        <div className="admin-dash__canvas">
          <div className="admin-dash__washi" aria-hidden />
          <div className="admin-dash__sakura" aria-hidden>
            <SakuraRainLayer petalCount={20} buoyant />
          </div>
          <div className="admin-dash__body admin-dash__body--canvas">
            <AnimatePresence mode="wait">
              <Motion.div
                key={tab}
                className="admin-dash__tab-motion"
                initial={reduceMotion ? false : { opacity: 0, x: 28, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -22, filter: 'blur(4px)' }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === 'overview' && <OverviewTab />}
                {tab === 'revenue' && <RevenueTab />}
                {tab === 'payments' && <PaymentsAdminTab />}
                {tab === 'users' && <UsersTab />}
                {tab === 'games' && <GamesAdminTab />}
                {tab === 'moderation' && <ModerationAdminTab />}
                {tab === 'system' && <SystemAdminTab />}
                {tab === 'suggestions' && <SuggestionsTab />}
              </Motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
