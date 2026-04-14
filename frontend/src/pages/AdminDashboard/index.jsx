import { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContentAdminTab } from './tabs/ContentAdminTab';
import { GamesAdminTab } from './tabs/GamesAdminTab';
import { ModerationAdminTab } from './tabs/ModerationAdminTab';
import { OverviewTab } from './tabs/OverviewTab';
import { PaymentsAdminTab } from './tabs/PaymentsAdminTab';
import { RevenueTab } from './tabs/RevenueTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { SystemAdminTab } from './tabs/SystemAdminTab';
import { UsersTab } from './tabs/UsersTab';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: '📊' },
  { id: 'revenue', label: 'Doanh thu', icon: '💲' },
  { id: 'payments', label: 'Thanh toán', icon: '🧾' },
  { id: 'users', label: 'Người dùng', icon: '👥' },
  { id: 'content', label: 'Nội dung học', icon: '📚' },
  { id: 'games', label: 'Trò chơi', icon: '🎮' },
  { id: 'moderation', label: 'Kiểm duyệt', icon: '🛡️' },
  { id: 'system', label: 'Hệ thống', icon: '⚙️' },
  { id: 'suggestions', label: 'Đề xuất', icon: '💡' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');

  const displayName = useMemo(
    () => user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'Quản trị viên',
    [user]
  );

  return (
    <div className="admin-dash">
      <div className="admin-dash__top">
        <div className="admin-dash__top-inner">
          <div className="admin-dash__brand-row">
            <span className="admin-dash__brand-mark" aria-hidden>
              達
            </span>
            <div>
              <h1 className="admin-dash__title">
                <span className="admin-dash__title-jp">管理ダッシュボード</span>
                <span className="admin-dash__title-en">Admin Dashboard</span>
              </h1>
              <p className="admin-dash__welcome">Chào mừng, {displayName}</p>
            </div>
          </div>
          <div className="admin-dash__status-pill" title="Trạng thái hệ thống">
            <span className="admin-dash__pulse" aria-hidden />
            Hệ thống hoạt động bình thường
          </div>
        </div>

        <nav className="admin-dash__tabs admin-dash__tabs--scroll" aria-label="Khu vực quản trị">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-dash__tab ${tab === t.id ? 'admin-dash__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="admin-dash__tab-ico" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-dash__body">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'payments' && <PaymentsAdminTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'content' && <ContentAdminTab />}
        {tab === 'games' && <GamesAdminTab />}
        {tab === 'moderation' && <ModerationAdminTab />}
        {tab === 'system' && <SystemAdminTab />}
        {tab === 'suggestions' && <SuggestionsTab />}
      </div>
    </div>
  );
}
