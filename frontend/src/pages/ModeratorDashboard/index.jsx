import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import { moderationService } from '../../services/moderationService';
import { ChatMonitorTab } from './tabs/ChatMonitorTab';
import { ContentTab } from './tabs/ContentTab';
import { LogsTab } from './tabs/LogsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { ReportsTab } from './tabs/ReportsTab';
import { StudentsTab } from './tabs/StudentsTab';

const Motion = motion;

const TAB_STATIC = [
  { id: 'overview', label: 'Tổng quan', icon: '📊', badge: null },
  { id: 'reports', label: 'Báo cáo và xử lý', icon: '🚩', badgeKey: 'pending' },
  { id: 'chat', label: 'Giám sát chat', icon: '💬', badge: null },
  { id: 'content', label: 'Bài học và nội dung', icon: '📚', badge: null },
];

export default function ModeratorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    moderationService.getStaffOverview(7).then(setOverview).catch(() => setOverview(null));
  }, []);

  const displayName = useMemo(
    () => user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'Điều hành viên',
    [user],
  );

  const pendingCount = overview != null ? (overview.pendingCount ?? overview.PendingCount ?? 0) : null;
  const resolvedToday = overview != null ? (overview.resolvedTodayCount ?? overview.ResolvedTodayCount ?? 0) : null;
  const newHint = overview != null ? (overview.newSinceYesterdayCount ?? overview.NewSinceYesterdayCount ?? null) : null;
  const learnerCount = overview != null ? (overview.registeredLearnersCount ?? overview.RegisteredLearnersCount ?? 0) : null;

  const hasOv = overview !== null;

  const animPending = useAnimatedNumber(hasOv ? Number(pendingCount ?? 0) : 0, { duration: 950, reduceMotion });
  const animResolved = useAnimatedNumber(hasOv ? Number(resolvedToday ?? 0) : 0, { duration: 950, reduceMotion });
  const animNew = useAnimatedNumber(hasOv ? Number(newHint ?? 0) : 0, { duration: 950, reduceMotion });
  const animLearners = useAnimatedNumber(hasOv ? Number(learnerCount ?? 0) : 0, { duration: 950, reduceMotion });

  const tabs = useMemo(
    () => [
      ...TAB_STATIC,
      {
        id: 'students',
        label: 'Học viên',
        icon: '🎓',
        badge: learnerCount != null ? learnerCount : '—',
      },
      { id: 'logs', label: 'Nhật ký và nội bộ', icon: '📋', badge: null },
    ],
    [learnerCount],
  );

  function tabBadge(t) {
    if (t.badge != null) return t.badge;
    if (t.badgeKey === 'pending') return pendingCount != null ? pendingCount : '—';
    return null;
  }

  const tabEnter = useMemo(
    () => (reduceMotion ? false : { opacity: 0, x: 26, filter: 'blur(5px)' }),
    [reduceMotion],
  );

  const initials = useMemo(() => String(displayName || 'M').slice(0, 2).toUpperCase(), [displayName]);

  return (
    <div className="mod-dash mod-dash--kurenai" lang="vi">
      <aside className="mod-dash__k-side" aria-label="Điều hướng điều hành">
        <div className="mod-dash__k-brand">
          <span className="mod-dash__k-brand-mark" aria-hidden>
            🌸
          </span>
          <div>
            <span className="mod-dash__k-brand-title">YumeGo-ji</span>
            <span className="mod-dash__k-brand-sub">Moderator Dojo</span>
          </div>
        </div>
        <nav className="mod-dash__k-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`mod-dash__k-link ${tab === t.id ? 'mod-dash__k-link--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="mod-dash__k-link-ico" aria-hidden>
                {t.icon}
              </span>
              <span className="mod-dash__k-link-label">
                {t.label}
                {tabBadge(t) != null ? <span className="mod-dash__k-badge">{tabBadge(t)}</span> : null}
              </span>
            </button>
          ))}
        </nav>
        <div className="mod-dash__k-foot">
          <div className="mod-dash__k-user">
            <span className="mod-dash__k-user-av" aria-hidden>
              {initials}
            </span>
            <div>
              <div className="mod-dash__k-user-name">{displayName}</div>
              <div className="mod-dash__k-user-role">Điều hành viên</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="mod-dash__k-main">
        <header className="mod-dash__k-head">
          <div>
            <h1 className="mod-dash__k-page-title">Trang chủ Moderator</h1>
            <p className="mod-dash__k-page-sub">Tổng quan hệ thống và trạng thái báo cáo.</p>
            <p className="mod-dash__k-welcome">Chào mừng, {displayName}</p>
          </div>
        </header>

        <div className="mod-dash__k-stats" role="list">
          <div className="mod-dash__k-stat mod-dash__k-stat--amber" role="listitem">
            <span className="mod-dash__k-stat-ico" aria-hidden>
              ⚠
            </span>
            <div>
              <div className="mod-dash__k-stat-value">{hasOv ? Math.round(animPending) : '—'}</div>
              <div className="mod-dash__k-stat-label">Báo cáo chờ xử lý</div>
            </div>
          </div>
          <div className="mod-dash__k-stat mod-dash__k-stat--green" role="listitem">
            <span className="mod-dash__k-stat-ico" aria-hidden>
              ✓
            </span>
            <div>
              <div className="mod-dash__k-stat-value">{hasOv ? Math.round(animResolved) : '—'}</div>
              <div className="mod-dash__k-stat-label">Đã xử lý hôm nay</div>
            </div>
          </div>
          <div className="mod-dash__k-stat mod-dash__k-stat--kurenai" role="listitem">
            <span className="mod-dash__k-stat-ico" aria-hidden>
              📌
            </span>
            <div>
              <div className="mod-dash__k-stat-value">{hasOv ? Math.round(animNew) : '—'}</div>
              <div className="mod-dash__k-stat-label">Báo cáo mới (ước lượng 24h)</div>
            </div>
          </div>
          <div className="mod-dash__k-stat mod-dash__k-stat--deep" role="listitem">
            <span className="mod-dash__k-stat-ico" aria-hidden>
              👥
            </span>
            <div>
              <div className="mod-dash__k-stat-value">{hasOv ? Math.round(animLearners) : '—'}</div>
              <div className="mod-dash__k-stat-label">Học viên đang quản lý</div>
            </div>
          </div>
        </div>

        <div className="mod-dash__k-canvas">
          <div className="mod-dash__k-washi" aria-hidden />
          <div className="mod-dash__k-sakura" aria-hidden>
            <SakuraRainLayer petalCount={18} buoyant />
          </div>
          <div className={`mod-dash__k-body${tab === 'content' ? ' mod-dash__body--content-hub' : ''}`}>
            <AnimatePresence mode="wait">
              <Motion.div
                key={tab}
                className="mod-dash__k-motion"
                initial={tabEnter}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === 'overview' && <OverviewTab />}
                {tab === 'reports' && <ReportsTab />}
                {tab === 'chat' && <ChatMonitorTab />}
                {tab === 'content' && <ContentTab />}
                {tab === 'students' && <StudentsTab />}
                {tab === 'logs' && <LogsTab />}
              </Motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
