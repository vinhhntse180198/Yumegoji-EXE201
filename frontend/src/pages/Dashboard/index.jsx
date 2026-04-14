import { useMemo, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../data/routes';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import { authService } from '../../services/authService';
import { ChatbotWidget } from '../../components/support/ChatbotWidget';
import { PremiumBadge } from '../../components/profile/PremiumBadge';
import { userIsPremium } from '../../utils/userPremium';

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
  return new Intl.NumberFormat('vi-VN').format(Math.round(x));
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

const PROGRESS_BAR_COLORS = ['teal', 'blue', 'purple'];

function levelLabel(code) {
  const c = String(code || 'N4').toUpperCase();
  const map = {
    N5: 'N5 Sơ cấp',
    N4: 'N4 Trung cấp',
    N3: 'N3 Trung cao',
    N2: 'N2 Cao cấp',
    N1: 'N1 Thành thạo',
  };
  return map[c] || `${c} — Học viên`;
}

export default function Dashboard() {
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
    const role = String(user?.role ?? user?.Role ?? 'user').toLowerCase();
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
  const levelTitle = levelLabel(levelCode);

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

  return (
    <div className="yume-dashboard">
      <section className="yume-dashboard__hero">
        <div className="yume-dashboard__hero-text">
          <h1 className="yume-dashboard__greet">
            <span className="yume-dashboard__greet-row">
              <span>
                Xin chào, {displayName}! <span aria-hidden>👋</span>
              </span>
              {isPremium ? <PremiumBadge variant="large" /> : null}
            </span>
          </h1>
          <p className="yume-dashboard__sub">Chào mừng bạn đến với nền tảng học tiếng Nhật</p>
          {isPremium ? (
            <div className="yume-dashboard__premium-strip">
              <PremiumBadge />
              <p className="yume-dashboard__premium-strip-hint">
                Bạn đang dùng <strong>gói Premium</strong> — học không giới hạn lượt chơi, mở bài nâng cao và các quyền theo trang Nâng cấp.
              </p>
            </div>
          ) : null}
        </div>
        <div
          className={`yume-dashboard__rank-badge${isPremium ? ' yume-dashboard__rank-badge--premium' : ''}`}
        >
          <span className="yume-dashboard__rank-icon" aria-hidden>
            🎓
          </span>
          <div>
            <div className="yume-dashboard__rank-level">{levelTitle}</div>
            <div className="yume-dashboard__rank-name">Rank: {rankInfo.currentLabel}</div>
          </div>
        </div>
      </section>

      <section className="yume-dashboard__stats">
        <article className="yume-stat-card">
          <div className="yume-stat-card__icon yume-stat-card__icon--star">⭐</div>
          <div className="yume-stat-card__label">Cấp độ hiện tại</div>
          <div className="yume-stat-card__value">{levelTitle}</div>
        </article>
        <article className="yume-stat-card">
          <div className="yume-stat-card__icon yume-stat-card__icon--cal">📅</div>
          <div className="yume-stat-card__label">Chuỗi ngày học</div>
          <div className="yume-stat-card__value">
            {summaryLoading ? '…' : `${formatIntVi(streakDays)} ngày`}
          </div>
          <div className="yume-stat-card__hint">
            {summaryLoading ? 'Đang tải…' : streakDays > 0 ? 'Tiếp tục phát huy!' : 'Học hôm nay để bắt đầu chuỗi.'}
          </div>
        </article>
        <article className="yume-stat-card">
          <div className="yume-stat-card__icon yume-stat-card__icon--xp">🏆</div>
          <div className="yume-stat-card__label">Điểm tích lũy</div>
          <div className="yume-stat-card__value">
            {summaryLoading ? '…' : `${formatIntVi(exp)} XP`}
          </div>
          <div className="yume-stat-card__hint">
            {summaryLoading ? 'Đang tải…' : 'Từ học bài & chơi game (API)'}
          </div>
        </article>
        <article className="yume-stat-card">
          <div className="yume-stat-card__icon yume-stat-card__icon--lesson">📈</div>
          <div className="yume-stat-card__label">Bài học hoàn thành</div>
          <div className="yume-stat-card__value">
            {summaryLoading ? '…' : `${formatIntVi(completedLessons)} bài`}
          </div>
        </article>
      </section>

      {summaryError ? (
        <p className="yume-dashboard__banner-error" role="alert">
          {summaryError}
        </p>
      ) : null}

      <section className="yume-dashboard__rank-bar">
        <div className="yume-rank-bar__head">
          <span className="yume-rank-bar__title">
            <span aria-hidden>⚡</span> Rank hiện tại: {summaryLoading ? '…' : rankInfo.currentLabel}
          </span>
          <span className="yume-rank-bar__target">
            {summaryLoading ? 'Đang tải…' : rankInfo.targetLine}
          </span>
        </div>
        <div
          className="yume-rank-bar__track"
          role="progressbar"
          aria-valuenow={summaryLoading ? 0 : rankInfo.barPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="yume-rank-bar__fill"
            style={{ width: `${summaryLoading ? 0 : rankInfo.barPct}%` }}
          />
        </div>
        <p className="yume-rank-bar__foot">{summaryLoading ? 'Đang tải…' : rankInfo.foot}</p>
      </section>

      <div className="yume-dashboard__grid2">
        <section className="yume-panel">
          <h2 className="yume-panel__title">Tiến độ học tập</h2>
          <p className="yume-panel__sub">Nội dung cấp độ {levelCode} — {levelTitle}</p>
          <ul className="yume-progress-list">
            {summaryLoading ? (
              <li>
                <span>Đang tải tiến độ theo cấp độ…</span>
              </li>
            ) : levelRows.length === 0 ? (
              <li>
                <span>Chưa có bài học đã xuất bản theo cấp độ, hoặc chưa có dữ liệu.</span>
              </li>
            ) : (
              levelRows.map((row, i) => {
                const code = pick(row, 'levelCode', 'LevelCode') ?? '';
                const name = pick(row, 'levelName', 'LevelName') ?? code;
                const pct = Math.round(Number(pick(row, 'completionPercent', 'CompletionPercent')) || 0);
                const done = pick(row, 'completedLessons', 'CompletedLessons') ?? 0;
                const total = pick(row, 'totalPublishedLessons', 'TotalPublishedLessons') ?? 0;
                const color = PROGRESS_BAR_COLORS[i % PROGRESS_BAR_COLORS.length];
                const label = code ? `${code} — ${name}` : name;
                return (
                  <li key={String(pick(row, 'levelId', 'LevelId') ?? i)}>
                    <span title={`${done}/${total} bài hoàn thành`}>{label}</span>
                    <div className="yume-progress-track">
                      <span
                        className={`yume-progress-track__fill yume-progress-track__fill--${color}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <span className="yume-progress-pct">{pct}%</span>
                  </li>
                );
              })
            )}
          </ul>
          <p className="yume-panel__locked">
            <span aria-hidden>🔒</span> Nội dung N3 sẽ mở khi bạn lên cấp N3
          </p>
        </section>

        <section className="yume-panel">
          <h2 className="yume-panel__title">Hoạt động nhanh</h2>
          <ul className="yume-quick-list">
            <li>
              <Link to={ROUTES.LEARN} className="yume-quick-row">
                <span>Tiếp tục học tập {levelCode}</span>
                <span className="yume-quick-row__arrow">→</span>
              </Link>
            </li>
            <li>
              <Link to={ROUTES.PLAY} className="yume-quick-row">
                <span>Chơi trò chơi</span>
                <span className="yume-quick-row__arrow">→</span>
              </Link>
            </li>
            <li>
              <Link to={`${ROUTES.PLAY}/leaderboard`} className="yume-quick-row">
                <span>Bảng xếp hạng</span>
                <span className="yume-quick-row__arrow">→</span>
              </Link>
            </li>
            <li>
              <Link to={`${ROUTES.PLAY}/achievements`} className="yume-quick-row">
                <span>Thành tích EXP</span>
                <span className="yume-quick-row__arrow">→</span>
              </Link>
            </li>
            <li>
              <Link to={ROUTES.CHAT} className="yume-quick-row">
                <span>Trò chuyện với học viên khác</span>
                <span className="yume-quick-row__arrow">→</span>
              </Link>
            </li>
            {levelCode === 'N5' && (
              <li>
                <Link to="/level-up-test/N4" className="yume-quick-row yume-quick-row--primary">
                  <span>Thi lên N4</span>
                  <span className="yume-quick-row__arrow">→</span>
                </Link>
              </li>
            )}
            {levelCode === 'N4' && (
              <li>
                <Link to="/level-up-test/N3" className="yume-quick-row yume-quick-row--primary">
                  <span>Thi lên N3</span>
                  <span className="yume-quick-row__arrow">→</span>
                </Link>
              </li>
            )}
          </ul>
          <h3 className="yume-chat-rooms__title">Phòng chat dành cho bạn:</h3>
          <div className="yume-chat-rooms">
            <Link to={ROUTES.CHAT} className="yume-pill">
              Phòng chung
            </Link>
            <Link to={ROUTES.CHAT} className="yume-pill">
              {levelTitle}
            </Link>
            <Link to={ROUTES.CHAT} className="yume-pill">
              N5 Sơ cấp
            </Link>
          </div>
        </section>
      </div>

      <ChatbotWidget />
    </div>
  );
}
