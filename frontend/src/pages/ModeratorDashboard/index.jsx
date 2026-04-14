import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { moderationService } from '../../services/moderationService';
import { ChatMonitorTab } from './tabs/ChatMonitorTab';
import { ContentTab } from './tabs/ContentTab';
import { LogsTab } from './tabs/LogsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { ReportsTab } from './tabs/ReportsTab';
import { StudentsTab } from './tabs/StudentsTab';

const TAB_STATIC = [
  { id: 'overview', label: 'Tổng quan', icon: '📊', badge: null },
  { id: 'reports', label: 'Báo cáo & xử lý', icon: '🚩', badgeKey: 'pending' },
  { id: 'chat', label: 'Giám sát chat', icon: '💬', badge: null },
  { id: 'content', label: 'Bài học & nội dung', icon: '📚', badge: null },
];

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    moderationService.getStaffOverview(7).then(setOverview).catch(() => setOverview(null));
  }, []);

  const displayName = useMemo(
    () => user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'Điều hành viên',
    [user]
  );

  const pendingCount =
    overview != null ? (overview.pendingCount ?? overview.PendingCount ?? 0) : null;
  const resolvedToday =
    overview != null ? (overview.resolvedTodayCount ?? overview.ResolvedTodayCount ?? 0) : null;
  const newHint =
    overview != null ? (overview.newSinceYesterdayCount ?? overview.NewSinceYesterdayCount ?? null) : null;
  const learnerCount =
    overview != null ? (overview.registeredLearnersCount ?? overview.RegisteredLearnersCount ?? 0) : null;

  const tabs = useMemo(
    () => [
      ...TAB_STATIC,
      {
        id: 'students',
        label: 'Học viên',
        icon: '🎓',
        badge: learnerCount != null ? learnerCount : '—',
      },
      { id: 'logs', label: 'Nhật ký & nội bộ', icon: '📋', badge: null },
    ],
    [learnerCount],
  );

  function tabBadge(t) {
    if (t.badge != null) return t.badge;
    if (t.badgeKey === 'pending') return pendingCount != null ? pendingCount : '—';
    return null;
  }

  return (
    <div className="mod-dash">
      <header className="mod-dash__hero">
        <div className="mod-dash__hero-inner">
          <div className="mod-dash__brand-block">
            <span className="mod-dash__brand-ico" aria-hidden>
              督
            </span>
            <div>
              <h1 className="mod-dash__title">
                <span className="mod-dash__title-jp">監督ダッシュボード</span>
                <span className="mod-dash__title-en">Moderator</span>
              </h1>
              <p className="mod-dash__welcome">Chào mừng, {displayName}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mod-dash__stats">
        <div className="mod-dash__stat mod-dash__stat--amber">
          <span className="mod-dash__stat-ico" aria-hidden>
            ⚠
          </span>
          <div>
            <div className="mod-dash__stat-value">{pendingCount != null ? pendingCount : '—'}</div>
            <div className="mod-dash__stat-label">Báo cáo chờ xử lý</div>
          </div>
        </div>
        <div className="mod-dash__stat mod-dash__stat--green">
          <span className="mod-dash__stat-ico" aria-hidden>
            ✓
          </span>
          <div>
            <div className="mod-dash__stat-value">{resolvedToday != null ? resolvedToday : '—'}</div>
            <div className="mod-dash__stat-label">Đã xử lý hôm nay</div>
          </div>
        </div>
        <div className="mod-dash__stat mod-dash__stat--purple">
          <span className="mod-dash__stat-ico" aria-hidden>
            📌
          </span>
          <div>
            <div className="mod-dash__stat-value">{newHint ?? '—'}</div>
            <div className="mod-dash__stat-label">Báo cáo mới (ước lượng 24h)</div>
          </div>
        </div>
        <div className="mod-dash__stat">
          <span className="mod-dash__stat-ico" aria-hidden>
            👥
          </span>
          <div>
            <div className="mod-dash__stat-value">{learnerCount != null ? learnerCount : '—'}</div>
            <div className="mod-dash__stat-label">Học viên đang quản lý</div>
          </div>
        </div>
      </div>

      <nav className="mod-dash__tabs mod-dash__tabs--wrap" aria-label="Khu vực điều hành">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mod-dash__tab ${tab === t.id ? 'mod-dash__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="mod-dash__tab-ico" aria-hidden>
              {t.icon}
            </span>
            {t.label}
            {tabBadge(t) != null ? <span className="mod-dash__tab-badge">{tabBadge(t)}</span> : null}
          </button>
        ))}
      </nav>

      <div className={`mod-dash__body${tab === 'content' ? ' mod-dash__body--content-hub' : ''}`}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'chat' && <ChatMonitorTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'students' && <StudentsTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}
