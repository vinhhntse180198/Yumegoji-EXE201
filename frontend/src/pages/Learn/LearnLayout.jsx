import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { N5_LESSONS } from '../../data/n5BeginnerCourse';
import { useAuth } from '../../hooks/useAuth';
import http from '../../api/client';
import LearnAiWidget from './LearnAiWidget';

const SECTION_ORDER = ['dialogue', 'reference', 'reading', 'vocab', 'kanji', 'grammar'];
const STATIC_SLUGS = new Set(N5_LESSONS.map((l) => l.slug));

function defaultLearnCta() {
  return {
    ctaSlug: N5_LESSONS[0]?.slug ?? '',
    ctaTitle: N5_LESSONS[0]?.navTitle ?? 'Bài tiếp theo',
  };
}

/** Chỉ gọi API — không setState (tránh cảnh báo React Compiler trong useEffect). */
async function fetchLearnLayoutSnapshot(isAuthenticated) {
  try {
    const lr = await http.get('/api/lessons', { params: { page: 1, pageSize: 100 } });
    const items = lr.data?.items ?? lr.data?.Items ?? [];
    const list = Array.isArray(items) ? items : [];

    if (!isAuthenticated) {
      return {
        publishedFromDb: list,
        sidebarTotal: 0,
        sidebarDone: 0,
        ...defaultLearnCta(),
      };
    }

    const pr = await http.get('/api/users/me/progress', { params: { page: 1, pageSize: 100 } });
    const progress = pr.data?.items ?? pr.data?.Items ?? [];
    const progressMap = new Map();
    for (const p of Array.isArray(progress) ? progress : []) {
      const id = p.lessonId ?? p.LessonId;
      if (id != null) progressMap.set(id, p);
    }
    let done = 0;
    for (const row of list) {
      const id = row.id ?? row.Id;
      const p = progressMap.get(id);
      if (!p) continue;
      const st = String(p.status ?? p.Status ?? '').toLowerCase();
      const pct = Number(p.progressPercent ?? p.ProgressPercent ?? 0);
      if (st === 'completed' || pct >= 100) done++;
    }

    const sorted = [...list].sort((a, b) => {
      const la = a.levelId ?? a.LevelId ?? 0;
      const lb = b.levelId ?? b.LevelId ?? 0;
      if (la !== lb) return la - lb;
      const sa = a.sortOrder ?? a.SortOrder ?? 0;
      const sb = b.sortOrder ?? b.SortOrder ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.id ?? a.Id) - (b.id ?? b.Id);
    });
    let first = null;
    for (const row of sorted) {
      const id = row.id ?? row.Id;
      const p = progressMap.get(id);
      const st = p ? String(p.status ?? p.Status ?? '').toLowerCase() : '';
      const pct = p ? Number(p.progressPercent ?? p.ProgressPercent ?? 0) : 0;
      const completed = st === 'completed' || pct >= 100;
      if (!completed) {
        first = row;
        break;
      }
    }

    let ctaSlug = defaultLearnCta().ctaSlug;
    let ctaTitle = defaultLearnCta().ctaTitle;
    if (first) {
      const slug = first.slug ?? first.Slug;
      const title = first.title ?? first.Title;
      if (slug) {
        ctaSlug = slug;
        ctaTitle = title || 'Tiếp tục học';
      }
    } else if (sorted[0]) {
      const slug = sorted[0].slug ?? sorted[0].Slug;
      const title = sorted[0].title ?? sorted[0].Title;
      if (slug) {
        ctaSlug = slug;
        ctaTitle = title || 'Ôn tập';
      }
    } else {
      ctaSlug = N5_LESSONS[0]?.slug ?? '';
      ctaTitle = N5_LESSONS[0]?.navTitle ?? 'Bài mẫu N5';
    }

    return {
      publishedFromDb: list,
      sidebarTotal: list.length,
      sidebarDone: done,
      ctaSlug,
      ctaTitle,
    };
  } catch {
    return {
      publishedFromDb: [],
      sidebarTotal: 0,
      sidebarDone: 0,
      ...defaultLearnCta(),
    };
  }
}

function IconBookMini({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a2 2 0 012-2h5v16H6a2 2 0 01-2-2V5zm8-2h5a2 2 0 012 2v11a2 2 0 01-2 2h-5V3z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRoadmap({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChar({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 8h4M12 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconGrammar({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LearnLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sectionFilter, setSectionFilter] = useState('all');
  const [publishedFromDb, setPublishedFromDb] = useState([]);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [sidebarDone, setSidebarDone] = useState(0);
  const [ctaSlug, setCtaSlug] = useState(N5_LESSONS[0]?.slug ?? '');
  const [ctaTitle, setCtaTitle] = useState(N5_LESSONS[0]?.navTitle ?? 'Bài tiếp theo');

  const isLearnIndex = location.pathname === ROUTES.LEARN;

  const applyLearnLayoutSnapshot = useCallback((snap) => {
    setPublishedFromDb(snap.publishedFromDb);
    setSidebarTotal(snap.sidebarTotal);
    setSidebarDone(snap.sidebarDone);
    setCtaSlug(snap.ctaSlug);
    setCtaTitle(snap.ctaTitle);
  }, []);

  const reloadLearnLayoutData = useCallback(() => {
    void fetchLearnLayoutSnapshot(isAuthenticated).then(applyLearnLayoutSnapshot);
  }, [isAuthenticated, applyLearnLayoutSnapshot]);

  useEffect(() => {
    let cancelled = false;
    void fetchLearnLayoutSnapshot(isAuthenticated).then((snap) => {
      if (cancelled) return;
      applyLearnLayoutSnapshot(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyLearnLayoutSnapshot]);

  const dbOnlyLessons = useMemo(
    () =>
      publishedFromDb.filter((row) => {
        const s = row.slug ?? row.Slug;
        return s && !STATIC_SLUGS.has(s);
      }),
    [publishedFromDb],
  );

  /** Bài từ DB theo tab (trước đây chỉ hiện khi «Tất cả» → dễ tưởng bài import bị mất). */
  const visibleDbLessons = useMemo(() => {
    if (sectionFilter === 'all') return dbOnlyLessons;
    return dbOnlyLessons.filter((row) => {
      const t = String(row.categoryType ?? row.CategoryType ?? '').trim().toLowerCase();
      return t === sectionFilter;
    });
  }, [dbOnlyLessons, sectionFilter]);

  const lessonGroups = useMemo(() => {
    const map = new Map();
    for (const lesson of N5_LESSONS) {
      if (!map.has(lesson.section)) {
        map.set(lesson.section, { label: lesson.sectionLabel, items: [] });
      }
      map.get(lesson.section).items.push(lesson);
    }
    return SECTION_ORDER.filter((key) => map.has(key)).map((key) => ({
      section: key,
      label: map.get(key).label,
      items: map.get(key).items,
    }));
  }, []);

  const visibleGroups = useMemo(
    () =>
      sectionFilter === 'all'
        ? lessonGroups
        : lessonGroups.filter((g) => g.section === sectionFilter),
    [lessonGroups, sectionFilter],
  );

  const sidebarPct = sidebarTotal ? Math.round((sidebarDone / sidebarTotal) * 100) : 0;
  const displayName =
    user?.displayName?.trim() ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Học viên';

  function goFilter(key) {
    setSectionFilter(key);
    if (!isLearnIndex) navigate(ROUTES.LEARN);
  }

  return (
    <div className="page learn-layout learn-layout--shodo yume-page">
      <div className="learn-layout__grid learn-layout__grid--shodo">
        <aside className="learn-layout__nav learn-sidebar" aria-label="Điều hướng khóa học">
          <Link className="learn-sidebar__back" to={ROUTES.DASHBOARD}>
            ← Về Dashboard
          </Link>

          <div className="learn-sidebar__progress-card">
            <div className="learn-sidebar__progress-icon" aria-hidden>
              <IconBookMini />
            </div>
            <div className="learn-sidebar__progress-body">
              <div className="learn-sidebar__progress-name">{displayName}</div>
              <div className="learn-sidebar__progress-label">Học viên · Lộ trình N5</div>
              <div className="learn-sidebar__progress-track" aria-hidden>
                <div
                  className="learn-sidebar__progress-fill"
                  style={{ width: `${isAuthenticated && sidebarTotal ? sidebarPct : 0}%` }}
                />
              </div>
              <p className="learn-sidebar__progress-meta">
                {isAuthenticated && sidebarTotal > 0
                  ? `Tiến độ: ${sidebarPct}% · ${sidebarDone}/${sidebarTotal} bài`
                  : isAuthenticated
                    ? 'Chưa có bài hệ thống — học bài mẫu N5 bên phải'
                    : 'Đăng nhập để lưu tiến độ bài hệ thống'}
              </p>
            </div>
          </div>

          <nav className="learn-sidebar__quick" aria-label="Lối tắt chương">
            <NavLink
              to={ROUTES.LEARN}
              end
              className={({ isActive }) =>
                `learn-sidebar__quick-link${isActive ? ' learn-sidebar__quick-link--active' : ''}`
              }
            >
              <IconRoadmap className="learn-sidebar__quick-ico" />
              Lộ trình
            </NavLink>
            <button
              type="button"
              className={`learn-sidebar__quick-link${sectionFilter === 'all' && isLearnIndex ? ' learn-sidebar__quick-link--active' : ''}`}
              onClick={() => goFilter('all')}
            >
              <IconBookMini className="learn-sidebar__quick-ico" />
              Bài học
            </button>
            <button
              type="button"
              className={`learn-sidebar__quick-link${sectionFilter === 'vocab' ? ' learn-sidebar__quick-link--active' : ''}`}
              onClick={() => goFilter('vocab')}
            >
              <IconChar className="learn-sidebar__quick-ico" />
              Từ vựng
            </button>
            <button
              type="button"
              className={`learn-sidebar__quick-link${sectionFilter === 'grammar' ? ' learn-sidebar__quick-link--active' : ''}`}
              onClick={() => goFilter('grammar')}
            >
              <IconGrammar className="learn-sidebar__quick-ico" />
              Ngữ pháp
            </button>
          </nav>

          <div className="learn-nav__group-label learn-sidebar__list-label">Danh sách bài</div>
          <div className="learn-nav__tabs" role="tablist" aria-label="Lọc theo nhóm">
            <button
              type="button"
              role="tab"
              aria-selected={sectionFilter === 'all'}
              className={`learn-nav__tab${sectionFilter === 'all' ? ' learn-nav__tab--active' : ''}`}
              onClick={() => setSectionFilter('all')}
            >
              Tất cả
            </button>
            {lessonGroups.map((g) => (
              <button
                key={g.section}
                type="button"
                role="tab"
                aria-selected={sectionFilter === g.section}
                className={`learn-nav__tab${sectionFilter === g.section ? ' learn-nav__tab--active' : ''}`}
                onClick={() => setSectionFilter(g.section)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="learn-sidebar__scroll">
            {visibleGroups.map((group) => (
              <Fragment key={group.section}>
                {sectionFilter === 'all' ? (
                  <div className="learn-nav__section-label">{group.label}</div>
                ) : null}
                <ul className="learn-nav__list learn-nav__list--section">
                  {group.items.map((lesson) => (
                    <li key={lesson.slug}>
                      <NavLink
                        to={`${ROUTES.LEARN}/${lesson.slug}`}
                        className={({ isActive }) =>
                          `learn-nav__link${isActive ? ' learn-nav__link--active' : ''}`
                        }
                        end
                      >
                        <span className="learn-nav__text">{lesson.navTitle}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </Fragment>
            ))}
            {visibleDbLessons.length > 0 ? (
              <>
                <div className="learn-nav__section-label learn-nav__section-label--db">Bài từ hệ thống</div>
                <ul className="learn-nav__list learn-nav__list--section">
                  {visibleDbLessons.map((row) => {
                    const slug = row.slug ?? row.Slug;
                    const title = row.title ?? row.Title;
                    const cat = row.categoryName ?? row.CategoryName;
                    return (
                      <li key={row.id ?? row.Id}>
                        <NavLink
                          to={`${ROUTES.LEARN}/${encodeURIComponent(slug)}`}
                          className={({ isActive }) =>
                            `learn-nav__link learn-nav__link--stack${isActive ? ' learn-nav__link--active' : ''}`
                          }
                          end
                        >
                          <span className="learn-nav__db-meta">{cat}</span>
                          <span className="learn-nav__text">{title}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </div>

          {ctaSlug ? (
            <Link className="learn-sidebar__cta" to={`${ROUTES.LEARN}/${encodeURIComponent(ctaSlug)}`}>
              <span className="learn-sidebar__cta-kicker">TIẾP TỤC HÀNH TRÌNH</span>
              <span className="learn-sidebar__cta-title">{ctaTitle}</span>
            </Link>
          ) : null}
        </aside>

        <main className="learn-layout__main learn-layout__main--shodo">
          <Outlet context={{ reloadSidebarProgress: reloadLearnLayoutData }} />
        </main>
      </div>
      <LearnAiWidget isAuthenticated={isAuthenticated} />
    </div>
  );
}
