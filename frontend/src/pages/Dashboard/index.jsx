import { useMemo, useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../data/routes';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import { authService } from '../../services/authService';
import { ChatbotWidget } from '../../components/support/ChatbotWidget';
import { PremiumBadge } from '../../components/profile/PremiumBadge';
import { userIsPremium } from '../../utils/userPremium';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';

/** Alias để ESLint nhận diện biến dùng qua JSX. */
const Motion = motion;

const dashRoot = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.085, delayChildren: 0.04 },
  },
};

const dashItem = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 340, damping: 30 },
  },
};

const dashStatGrid = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.065 },
  },
};

const dashCol = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

const RANK_TIERS = [
  { label: 'Bronze', minExp: 0 },
  { label: 'Silver', minExp: 5000 },
  { label: 'Gold', minExp: 15000 },
  { label: 'Platinum', minExp: 30000 },
];

function formatIntVi(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const v = Math.round(Math.abs(x));
  const signed = x < 0 ? '-' : '';
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return signed + s;
}

function rankProgressFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  let idx = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (e >= RANK_TIERS[i].minExp) {
      idx = i;
      break;
    }
  }
  const cur = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1];
  if (!next) {
    return {
      currentLabel: cur.label,
      barPct: 100,
      foot: 'Bạn đã đạt rank cao nhất trong hệ thống hiện tại.',
      targetLine: `${formatIntVi(e)} XP`,
    };
  }
  const span = next.minExp - cur.minExp;
  const inTier = Math.min(100, Math.max(0, Math.round(((e - cur.minExp) / span) * 100)));
  return {
    currentLabel: cur.label,
    barPct: inTier,
    foot: `${inTier}% đến rank tiếp theo`,
    targetLine: `${formatIntVi(e)} / ${formatIntVi(next.minExp)} XP — ${next.label} (${formatIntVi(next.minExp)} XP)`,
  };
}

export default function Dashboard() {
  const reduceMotion = useReducedMotion();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await fetchMyProgressSummary();
      setSummary(data);
    } catch {
      setSummaryError('Không tải được thống kê học tập. Thử tải lại trang.');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = String(
      user?.role ?? user?.Role ?? authService.getRoleFromStoredToken() ?? 'user',
    ).toLowerCase();
    if (role === 'admin') {
      navigate(ROUTES.ADMIN, { replace: true });
    } else if (role === 'moderator') {
      navigate(ROUTES.MODERATOR, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  /** Đồng bộ cờ Premium từ DB — một lần khi vào Dashboard (id ổn định), tránh lệch sau khi admin duyệt. */
  const userIdStable = user?.id ?? user?.userId ?? user?.Id;
  useEffect(() => {
    if (userIdStable == null) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const profile = await authService.getMyProfile();
        if (cancelled || !profile) return;
        const prem = profile.isPremium ?? profile.IsPremium;
        if (prem === undefined) return;
        setUser((prev) => {
          if (!prev) return prev;
          const nextPrem = !!prem;
          const cur = !!(prev.isPremium ?? prev.IsPremium);
          if (cur === nextPrem) return prev;
          const next = { ...prev, isPremium: nextPrem, IsPremium: nextPrem };
          authService.setStoredUser(next);
          return next;
        });
      } catch {
        /* im lặng */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userIdStable, setUser]);

  const displayName = useMemo(() => {
    return user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'bạn';
  }, [user]);

  const isPremium = useMemo(() => userIsPremium(user), [user]);

  // Suy ra code level (N5/N4/N3) từ user; fallback 'N4' nếu thiếu.
  let levelCode = user?.levelCode || user?.level || null;
  const rawLevelId = user?.levelId ?? user?.LevelId ?? null;
  if (!levelCode && rawLevelId != null) {
    const idNum = Number(rawLevelId);
    if (idNum === 1) levelCode = 'N5';
    else if (idNum === 2) levelCode = 'N4';
    else if (idNum === 3) levelCode = 'N3';
  }
  levelCode = (levelCode || 'N4').toUpperCase();

  const exp = pick(summary, 'exp', 'Exp') ?? 0;
  const streakDays = pick(summary, 'streakDays', 'StreakDays') ?? 0;
  const byLevel = pick(summary, 'byLevel', 'ByLevel') ?? [];
  const rankInfo = rankProgressFromExp(exp);
  const completedLessons = Array.isArray(byLevel)
    ? byLevel.reduce((s, row) => s + (pick(row, 'completedLessons', 'CompletedLessons') ?? 0), 0)
    : 0;

  const levelRows = Array.isArray(byLevel)
    ? byLevel.filter((row) => (pick(row, 'totalPublishedLessons', 'TotalPublishedLessons') ?? 0) > 0)
    : [];

  const levelNumber = Math.max(1, Math.round(Number(exp || 0) / 65));
  const dailyGoalPct = Math.min(100, Math.max(8, rankInfo.barPct));
  const xpToNext = Math.max(0, 5000 - (Number(exp || 0) % 5000));
  const quickActions = [
    { title: `Tiếp tục học tập ${levelCode}`, sub: 'Tiến tới bài học tiếp theo', to: ROUTES.LEARN, icon: '▶' },
    { title: 'Chơi game', sub: 'Từ học bài & chơi game (API)', to: ROUTES.PLAY, icon: '🎮' },
    { title: 'Bảng xếp hạng', sub: 'Theo dõi thứ hạng tuần', to: `${ROUTES.PLAY}/leaderboard`, icon: '📊' },
    { title: 'Thành tích', sub: 'Hệ thống huy hiệu và EXP', to: `${ROUTES.PLAY}/achievements`, icon: '🏆' },
  ];
  const chatRooms = [
    { name: 'General Chat', sub: 'Phòng công cộng cho mọi học viên' },
    { name: `${levelCode} Study Group`, sub: `Phòng học theo cấp độ ${levelCode}` },
    { name: 'Japanese Culture', sub: 'Chia sẻ văn hóa và tips học' },
  ];
  const topRows = levelRows.slice(0, 2);

  return (
    <div className="yume-dashboard yume-dashboard--mock yume-dashboard--crimson-sakura">
      <SakuraRainLayer petalCount={26} />
      <Motion.div
        className="yume-dashboard__motion-root"
        variants={dashRoot}
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
      >
        <Motion.section className="yume-mock-hero" variants={dashItem}>
          <div className="yume-mock-hero__left">
            <div className="yume-mock-tags">
              {isPremium ? <span className="yume-mock-tag">Premium Member</span> : null}
              <span className="yume-mock-tag">Rank: {rankInfo.currentLabel}</span>
            </div>
            <h1 className="yume-mock-greet">
              Xin chào, <span>{displayName}!</span>
            </h1>
            <p className="yume-mock-sub">Ready to master your Kanji today? Hành trình học của bạn đang tiến triển tốt.</p>
          </div>
          <aside className="yume-mock-rank-card">
            <div className="yume-mock-rank-card__title">Rank hiện tại</div>
            <div className="yume-mock-rank-card__name">{rankInfo.currentLabel} Tier</div>
            <div className="yume-mock-rank-card__line">
              <span>Progress to next</span>
              <strong>{rankInfo.barPct}%</strong>
            </div>
            <div className="yume-mock-rank-card__track" role="progressbar" aria-valuenow={rankInfo.barPct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${rankInfo.barPct}%` }} />
            </div>
          </aside>
        </Motion.section>

        <Motion.div className="yume-mock-stats" variants={dashStatGrid}>
          <Motion.article className="yume-mock-stat" variants={dashItem}>
            <div className="yume-mock-stat__label">Current Level</div>
            <div className="yume-mock-stat__value">Level {levelNumber}</div>
          </Motion.article>
          <Motion.article className="yume-mock-stat" variants={dashItem}>
            <div className="yume-mock-stat__label">Daily Streak</div>
            <div className="yume-mock-stat__value">{summaryLoading ? '…' : `${formatIntVi(streakDays)} Days`}</div>
          </Motion.article>
          <Motion.article className="yume-mock-stat" variants={dashItem}>
            <div className="yume-mock-stat__label">Accumulated XP</div>
            <div className="yume-mock-stat__value">{summaryLoading ? '…' : `${formatIntVi(exp)} XP`}</div>
          </Motion.article>
          <Motion.article className="yume-mock-stat" variants={dashItem}>
            <div className="yume-mock-stat__label">Completed Lessons</div>
            <div className="yume-mock-stat__value">{summaryLoading ? '…' : formatIntVi(completedLessons)}</div>
          </Motion.article>
        </Motion.div>

        {summaryError ? (
          <Motion.p className="yume-dashboard__banner-error" role="alert" variants={dashItem}>
            {summaryError}
          </Motion.p>
        ) : null}

        <Motion.div className="yume-mock-main" variants={dashCol}>
          <Motion.div className="yume-mock-main__left" variants={dashCol}>
            <Motion.section className="yume-mock-panel" variants={dashItem}>
              <div className="yume-mock-panel__title">Quick Actions</div>
              <div className="yume-mock-actions">
                {quickActions.map((a) => (
                  <Link key={a.title} to={a.to} className="yume-mock-action">
                    <span className="yume-mock-action__icon">{a.icon}</span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.sub}</small>
                    </span>
                  </Link>
                ))}
              </div>
              {levelCode === 'N5' && (
                <Link to="/level-up-test/N4" className="yume-mock-levelup">
                  Thi lên N4 →
                </Link>
              )}
              {levelCode === 'N4' && (
                <Link to="/level-up-test/N3" className="yume-mock-levelup">
                  Thi lên N3 →
                </Link>
              )}
            </Motion.section>

            <Motion.section className="yume-mock-panel" variants={dashItem}>
              <div className="yume-mock-panel__title yume-mock-panel__title--row">
                <span>JLPT Path</span>
                <Link to={ROUTES.LEARN}>View Curriculum →</Link>
              </div>
              <div className="yume-mock-jlpt-list">
                {summaryLoading ? (
                  <div className="yume-mock-jlpt-empty">Đang tải tiến độ…</div>
                ) : topRows.length === 0 ? (
                  <div className="yume-mock-jlpt-empty">Chưa có dữ liệu lộ trình.</div>
                ) : (
                  topRows.map((row, idx) => {
                    const code = pick(row, 'levelCode', 'LevelCode') ?? '';
                    const name = pick(row, 'levelName', 'LevelName') ?? code;
                    const pct = Math.round(Number(pick(row, 'completionPercent', 'CompletionPercent')) || 0);
                    const done = pick(row, 'completedLessons', 'CompletedLessons') ?? 0;
                    const total = pick(row, 'totalPublishedLessons', 'TotalPublishedLessons') ?? 0;
                    return (
                      <div key={String(pick(row, 'levelId', 'LevelId') ?? idx)} className="yume-mock-jlpt">
                        <div className="yume-mock-jlpt__badge">{code || 'N?'}</div>
                        <div className="yume-mock-jlpt__body">
                          <div className="yume-mock-jlpt__head">
                            <strong>{name}</strong>
                            <span>{pct}% Mastery</span>
                          </div>
                          <div className="yume-mock-jlpt__track">
                            <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                          </div>
                          <small>
                            {done}/{total} modules completed
                          </small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Motion.section>
          </Motion.div>

          <Motion.div className="yume-mock-main__right" variants={dashCol}>
            <Motion.section className="yume-mock-panel" variants={dashItem}>
              <div className="yume-mock-panel__title">Chat Rooms</div>
              <div className="yume-mock-rooms">
                {chatRooms.map((r) => (
                  <Link key={r.name} to={ROUTES.CHAT} className="yume-mock-room">
                    <span>
                      <strong>{r.name}</strong>
                      <small>{r.sub}</small>
                    </span>
                    <b>›</b>
                  </Link>
                ))}
              </div>
              <Link to={ROUTES.CHAT} className="yume-mock-room-all">
                Browse All Rooms
              </Link>
            </Motion.section>

            <Motion.section className="yume-mock-goal" variants={dashItem}>
              <div className="yume-mock-goal__title">Daily Goal</div>
              <p>You are {formatIntVi(xpToNext)} XP away from your next rank milestone.</p>
              <div className="yume-mock-goal__bottom">
                <div className="yume-mock-goal__ring">
                  <span>{dailyGoalPct}%</span>
                </div>
                <Link to={ROUTES.LEARN} className="yume-mock-goal__btn">
                  Study Now
                </Link>
              </div>
            </Motion.section>
            {isPremium ? (
              <Motion.div variants={dashItem} className="yume-dashboard__premium-motion">
                <div className="yume-dashboard__premium-strip">
                  <PremiumBadge />
                  <p className="yume-dashboard__premium-strip-hint">Bạn đang dùng gói Premium và đã mở khóa đầy đủ quyền học tập.</p>
                </div>
              </Motion.div>
            ) : (
              <Motion.div variants={dashItem}>
                <Link className="yume-mock-upgrade" to={ROUTES.UPGRADE}>
                  Nâng cấp Premium để mở toàn bộ tính năng →
                </Link>
              </Motion.div>
            )}
          </Motion.div>
        </Motion.div>
      </Motion.div>

      <ChatbotWidget />
    </div>
  );
}
