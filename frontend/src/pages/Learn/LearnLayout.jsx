import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { N5_LESSONS } from '../../data/n5BeginnerCourse';
import { useAuth } from '../../hooks/useAuth';
import http from '../../api/client';
import LearnAiWidget from './LearnAiWidget';
import { LearnSidebarShell } from './components/LearnSidebarShell';

const SECTION_ORDER = ['dialogue', 'reference', 'reading', 'vocab', 'kanji', 'grammar'];
const STATIC_SLUGS = new Set(N5_LESSONS.map((l) => l.slug));

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

    return {
      publishedFromDb: list,
      sidebarTotal: list.length,
      sidebarDone: done,
    };
  } catch {
    return {
      publishedFromDb: [],
      sidebarTotal: 0,
      sidebarDone: 0,
    };
  }
}

export default function LearnLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sectionFilter, setSectionFilter] = useState('all');
  const [publishedFromDb, setPublishedFromDb] = useState([]);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const [sidebarDone, setSidebarDone] = useState(0);

  const isLearnIndex = location.pathname === ROUTES.LEARN;

  const applyLearnLayoutSnapshot = useCallback((snap) => {
    setPublishedFromDb(snap.publishedFromDb);
    setSidebarTotal(snap.sidebarTotal);
    setSidebarDone(snap.sidebarDone);
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
        <LearnSidebarShell
          user={user}
          displayName={displayName}
          isAuthenticated={isAuthenticated}
          sidebarPct={sidebarPct}
          sidebarDone={sidebarDone}
          sidebarTotal={sidebarTotal}
          sectionFilter={sectionFilter}
          goFilter={goFilter}
          lessonGroups={lessonGroups}
          visibleGroups={visibleGroups}
          visibleDbLessons={visibleDbLessons}
        />

        <main className="learn-layout__main learn-layout__main--shodo">
          <Outlet
            context={{
              reloadSidebarProgress: reloadLearnLayoutData,
              sectionFilter,
              goFilter,
            }}
          />
        </main>
      </div>
      <LearnAiWidget isAuthenticated={isAuthenticated} />
    </div>
  );
}
