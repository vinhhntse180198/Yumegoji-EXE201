import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { N5_LESSONS } from '../../data/n5BeginnerCourse';
import { useAuth } from '../../hooks/useAuth';
import http from '../../services/http';
import { isStaffUser } from '../../utils/roles';

function extractPreviewTiles(title, max = 5) {
  const jp = title?.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g);
  if (jp?.length) return jp.slice(0, max);
  const t = (title || '·').slice(0, max);
  return t.split('');
}

function normalizeLesson(row) {
  return {
    id: row.id ?? row.Id,
    slug: row.slug ?? row.Slug,
    title: row.title ?? row.Title,
    categoryName: row.categoryName ?? row.CategoryName ?? '',
    sortOrder: row.sortOrder ?? row.SortOrder ?? 0,
    levelId: row.levelId ?? row.LevelId ?? 0,
  };
}

/** completed | active | locked | guest-open */
function rowStatesForAuth(lessons, progressByLessonId) {
  const isDone = (id) => {
    const p = progressByLessonId.get(id);
    if (!p) return false;
    const st = (p.status ?? p.Status ?? '').toLowerCase();
    const pct = Number(p.progressPercent ?? p.ProgressPercent ?? 0);
    return st === 'completed' || pct >= 100;
  };

  let firstIncomplete = -1;
  for (let i = 0; i < lessons.length; i++) {
    if (!isDone(lessons[i].id)) {
      firstIncomplete = i;
      break;
    }
  }

  return lessons.map((lesson, i) => {
    if (isDone(lesson.id)) return { lesson, state: 'completed' };
    if (firstIncomplete === -1) return { lesson, state: 'completed' };
    if (i === firstIncomplete) return { lesson, state: 'active' };
    return { lesson, state: 'locked' };
  });
}

function rowStatesGuest(lessons) {
  return lessons.map((lesson) => ({ lesson, state: 'guest-open' }));
}

function displayCategory(name) {
  const s = String(name || 'Bài học').trim();
  return s.toUpperCase();
}

/** Thẻ lưới — bám sát mẫu (XONG / ĐANG HỌC, nền trắng, viền đỏ bài đang học) */
function TrackCard({ lesson, state, to }) {
  const tiles = extractPreviewTiles(lesson.title, 5);
  const isLocked = state === 'locked';
  const badge =
    state === 'completed'
      ? { cls: 'learn-track-card__badge--done', text: 'XONG' }
      : state === 'locked'
        ? { cls: 'learn-track-card__badge--locked', text: 'KHÓA' }
        : state === 'guest-open'
          ? { cls: 'learn-track-card__badge--sample', text: 'BÀI MẪU' }
          : { cls: 'learn-track-card__badge--active', text: 'ĐANG HỌC' };
  const btnClass =
    state === 'completed'
      ? 'learn-track-card__btn learn-track-card__btn--review'
      : state === 'locked'
        ? 'learn-track-card__btn learn-track-card__btn--locked'
        : 'learn-track-card__btn learn-track-card__btn--primary';
  const label = state === 'completed' ? 'Ôn tập' : 'Học ngay';

  return (
    <div
      className={`learn-track-card learn-track-card--${state === 'guest-open' ? 'guest' : state}`}
    >
      <div className="learn-track-card__head">
        <span className={`learn-track-card__badge ${badge.cls}`}>{badge.text}</span>
        <span className="learn-track-card__cat">{displayCategory(lesson.categoryName)}</span>
      </div>
      <h4 className="learn-track-card__title">{lesson.title}</h4>
      <div className="learn-track-card__tiles" aria-hidden>
        {tiles.map((ch, i) => (
          <span key={i} className="learn-track-card__tile" lang="ja">
            {ch}
          </span>
        ))}
      </div>
      <div className="learn-track-card__foot">
        {isLocked ? (
          <span className={btnClass} role="button" aria-disabled="true">
            {label}
          </span>
        ) : (
          <Link className={btnClass} to={to}>
            {label}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function LearnIndex() {
  const { isAuthenticated, user } = useAuth();
  const staffNoLearnerTests = isStaffUser(user);
  const [apiLessons, setApiLessons] = useState([]);
  const [progressItems, setProgressItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const lr = await http.get('/api/lessons', { params: { page: 1, pageSize: 100 } });
      const items = lr.data?.items ?? lr.data?.Items ?? [];
      setApiLessons((Array.isArray(items) ? items : []).map(normalizeLesson));

      if (isAuthenticated) {
        const pr = await http.get('/api/users/me/progress', { params: { page: 1, pageSize: 100 } });
        const pi = pr.data?.items ?? pr.data?.Items ?? [];
        setProgressItems(Array.isArray(pi) ? pi : []);
      } else {
        setProgressItems([]);
      }
    } catch {
      setApiLessons([]);
      setProgressItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const progressByLessonId = useMemo(() => {
    const m = new Map();
    for (const p of progressItems) {
      const id = p.lessonId ?? p.LessonId;
      if (id) m.set(id, p);
    }
    return m;
  }, [progressItems]);

  const sortedApi = useMemo(() => {
    return [...apiLessons].sort((a, b) => {
      if (a.levelId !== b.levelId) return a.levelId - b.levelId;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id - b.id;
    });
  }, [apiLessons]);

  const apiRows = useMemo(() => {
    if (!sortedApi.length) return [];
    return isAuthenticated
      ? rowStatesForAuth(sortedApi, progressByLessonId)
      : rowStatesGuest(sortedApi);
  }, [sortedApi, progressByLessonId, isAuthenticated]);

  // Bài mẫu N5: luôn ở trạng thái "chưa học" cho mỗi trình duyệt,
  // không dùng tick xanh/Ôn tập để tránh hiểu nhầm đã hoàn thành.
  const n5Rows = useMemo(
    () => N5_LESSONS.map((lesson) => ({ lesson, state: 'guest-open' })),
    [],
  );

  const apiCompleted = sortedApi.filter((l) => {
    const p = progressByLessonId.get(l.id);
    if (!p) return false;
    const st = (p.status ?? p.Status ?? '').toLowerCase();
    const pct = Number(p.progressPercent ?? p.ProgressPercent ?? 0);
    return st === 'completed' || pct >= 100;
  }).length;

  const totalTrack = sortedApi.length;
  const doneTrack = apiCompleted;
  const progressPct = totalTrack ? Math.round((doneTrack / totalTrack) * 100) : 0;

  const remainder = Math.max(0, totalTrack - doneTrack);

  return (
    <div className="learn-dashboard">
      <header className="learn-dashboard__hero">
        <div className="learn-dashboard__hero-main">
          <span className="learn-dashboard__tag">CHƯƠNG TRÌNH N5</span>
          <h1 className="learn-dashboard__title">Lộ trình học tập</h1>
          <p className="learn-dashboard__lead">
            {isAuthenticated
              ? 'Theo dõi tiến độ bài từ hệ thống, ôn bài đã xong và tiếp tục bài đang học. Bài mẫu N5 học thêm ở khối phía dưới.'
              : 'Đăng nhập để lưu tiến độ bài moderator. Bài mẫu N5 vẫn mở được để học thử.'}
          </p>
        </div>
        <div className="learn-dashboard__stat-card">
          <div className="learn-dashboard__stat-label">Tiến độ hoàn thành</div>
          <div className="learn-dashboard__stat-pct">{totalTrack ? `${progressPct}%` : '—'}</div>
          <div className="learn-dashboard__stat-bar" aria-hidden>
            <div className="learn-dashboard__stat-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="learn-dashboard__stat-meta">
            {totalTrack > 0
              ? remainder > 0
                ? `${doneTrack}/${totalTrack} bài hoàn thành — Còn ${remainder} bài`
                : `${doneTrack}/${totalTrack} bài hoàn thành`
              : isAuthenticated
                ? 'Chưa có bài hệ thống — dùng bài mẫu N5'
                : 'Đăng nhập để xem tiến độ bài hệ thống'}
          </p>
        </div>
      </header>

      {loading ? (
        <p className="learn-track__loading">Đang tải danh sách…</p>
      ) : null}

      {sortedApi.length > 0 ? (
        <section className="learn-track learn-track--cards" aria-labelledby="learn-track-api-title">
          <div className="learn-section-head">
            <h2 id="learn-track-api-title" className="learn-section-head__title">
              BÀI TỪ HỆ THỐNG
            </h2>
            <span className="learn-section-head__link" aria-hidden>
              Xem tất cả ›
            </span>
          </div>
          <div className="learn-track__grid">
            {apiRows.map(({ lesson, state }) => (
              <TrackCard
                key={lesson.id}
                lesson={lesson}
                state={state}
                to={`${ROUTES.LEARN}/${encodeURIComponent(lesson.slug)}`}
              />
            ))}
          </div>
        </section>
      ) : !loading ? (
        <p className="learn-track__empty">Chưa có bài đã xuất bản từ moderator.</p>
      ) : null}

      <section className="learn-track learn-track--cards learn-track--n5" aria-labelledby="learn-track-n5-title">
        <div className="learn-section-head">
            <h2 id="learn-track-n5-title" className="learn-section-head__title">
              BÀI MẪU N5
            </h2>
          <span className="learn-section-head__link" aria-hidden>
            Lộ trình mẫu
          </span>
        </div>
        <div className="learn-track__grid learn-track__grid--n5">
          {n5Rows.map(({ lesson, state }) => (
            <TrackCard
              key={lesson.slug}
              lesson={{
                id: lesson.slug,
                slug: lesson.slug,
                title: lesson.navTitle,
                categoryName: lesson.sectionLabel,
              }}
              state={state}
              to={`${ROUTES.LEARN}/${encodeURIComponent(lesson.slug)}`}
            />
          ))}
        </div>
      </section>

      {!staffNoLearnerTests ? (
        <section className="learn-promo-banner" aria-labelledby="learn-promo-title">
          <div className="learn-promo-banner__text">
            <h2 id="learn-promo-title" className="learn-promo-banner__title">
              Bạn đã sẵn sàng kiểm tra trình độ?
            </h2>
            <p className="learn-promo-banner__desc">
              Làm bài test đầu vào hoặc chơi minigame để ôn tập — giữ vững nhịp học mỗi ngày.
            </p>
            <div className="learn-promo-banner__actions">
              <Link className="learn-promo-banner__btn" to={ROUTES.PLACEMENT_TEST}>
                Làm bài thi thử
              </Link>
              <Link className="learn-promo-banner__btn learn-promo-banner__btn--ghost" to={ROUTES.PLAY}>
                Trò chơi ôn tập
              </Link>
            </div>
          </div>
          <div className="learn-promo-banner__art" aria-hidden />
        </section>
      ) : (
        <section className="learn-promo-banner learn-promo-banner--staff" aria-labelledby="learn-promo-staff-title">
          <div className="learn-promo-banner__text">
            <h2 id="learn-promo-staff-title" className="learn-promo-banner__title">
              Khu vực học tập
            </h2>
            <p className="learn-promo-banner__desc">
              Tài khoản điều hành không dùng bài test đầu vào / thi nâng level. Bạn vẫn có thể xem bài học hoặc chơi ôn
              tập nếu cần.
            </p>
            <div className="learn-promo-banner__actions">
              <Link className="learn-promo-banner__btn learn-promo-banner__btn--ghost" to={ROUTES.PLAY}>
                Trò chơi ôn tập
              </Link>
            </div>
          </div>
          <div className="learn-promo-banner__art" aria-hidden />
        </section>
      )}

      <p className="learn-track__hint">
        Gợi ý: mở bài từ DB và bấm <strong>Hoàn thành bài học</strong> ở cuối trang để cập nhật tiến độ. Bài mẫu
        N5: bấm <strong>Đánh dấu xong (N5)</strong> trong trang bài.
      </p>
    </div>
  );
}
