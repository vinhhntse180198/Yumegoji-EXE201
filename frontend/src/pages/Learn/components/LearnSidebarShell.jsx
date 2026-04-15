import { Fragment } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ROUTES } from '../../../data/routes';
import { getJlptLevelCodeFromUser, jlptRank } from '../../../utils/learnLevelCode';

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

function IconKanji({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconChat({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3h-2l-4 3v-3H7a3 3 0 01-3-3V6z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLock({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const JLPT_LEVELS = ['N5', 'N4', 'N3'];

/** Một thẻ trong cột sidebar (mẫu Hanami: nhiều khối bo góc tách nhau) */
function ShellCard({ variant, children }) {
  return <div className={`learn-shell-card learn-shell-card--${variant}`}>{children}</div>;
}

function LessonListSection({ sectionFilter, goFilter, lessonGroups, visibleGroups, visibleDbLessons }) {
  return (
    <ShellCard variant="lessons">
      <div className="learn-nav__group-label learn-sidebar__list-label">Danh sách bài</div>
      <div className="learn-nav__tabs learn-nav__tabs--shell" role="tablist" aria-label="Lọc theo nhóm">
        <button
          type="button"
          role="tab"
          aria-selected={sectionFilter === 'all'}
          className={`learn-nav__tab${sectionFilter === 'all' ? ' learn-nav__tab--active' : ''}`}
          onClick={() => goFilter('all')}
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
            onClick={() => goFilter(g.section)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="learn-sidebar__scroll">
        {visibleGroups.map((group) => (
          <Fragment key={group.section}>
            {sectionFilter === 'all' ? <div className="learn-nav__section-label">{group.label}</div> : null}
            <ul className="learn-nav__list learn-nav__list--section">
              {group.items.map((lesson) => (
                <li key={lesson.slug}>
                  <NavLink
                    to={`${ROUTES.LEARN}/${lesson.slug}`}
                    className={({ isActive }) => `learn-nav__link${isActive ? ' learn-nav__link--active' : ''}`}
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
    </ShellCard>
  );
}

/**
 * Cột trái trang Học — thứ tự (trên → dưới):
 * 1) Tiến độ học viên  2) JLPT  3) Phân loại + lộ trình  4) Danh sách bài  5) Thử thách tuần
 */
export function LearnSidebarShell({
  user,
  displayName,
  isAuthenticated,
  sidebarPct,
  sidebarDone,
  sidebarTotal,
  sectionFilter,
  goFilter,
  lessonGroups,
  visibleGroups,
  visibleDbLessons,
}) {
  const levelCode = getJlptLevelCodeFromUser(user);
  const ur = jlptRank(levelCode);

  return (
    <aside className="learn-layout__nav learn-sidebar learn-sidebar--shell" aria-label="Điều hướng khóa học">
      <div className="learn-shell-stack">
        <ShellCard variant="user">
          <Link className="learn-sidebar__back" to={ROUTES.DASHBOARD}>
            ← Về Dashboard
          </Link>
          <div className="learn-shell-user">
            <div className="learn-shell-user__name">{displayName}</div>
            <div className="learn-shell-user__line">
              Học viên — <strong>JLPT {levelCode}</strong>
              {isAuthenticated && sidebarTotal > 0 ? (
                <>
                  {' '}
                  — {sidebarPct}% ({sidebarDone}/{sidebarTotal})
                </>
              ) : null}
            </div>
            <div className="learn-shell-user__bar" aria-hidden>
              <div
                className="learn-shell-user__fill"
                style={{ width: `${isAuthenticated && sidebarTotal ? sidebarPct : 0}%` }}
              />
            </div>
          </div>
        </ShellCard>

        <ShellCard variant="jlpt">
          <div className="learn-shell-jlpt" aria-label="Cấp độ JLPT (theo hồ sơ)">
            {JLPT_LEVELS.map((code) => {
              const cr = jlptRank(code);
              let mod = 'learn-shell-jlpt__item--future';
              if (cr === ur) mod = 'learn-shell-jlpt__item--current';
              else if (cr > ur) mod = 'learn-shell-jlpt__item--done';
              else if (cr < ur) mod = 'learn-shell-jlpt__item--locked';
              return (
                <div key={code} className={`learn-shell-jlpt__item ${mod}`}>
                  <span className="learn-shell-jlpt__code">{code}</span>
                  {cr > ur ? <IconCheck className="learn-shell-jlpt__ico" /> : null}
                  {cr < ur ? <IconLock className="learn-shell-jlpt__ico" /> : null}
                </div>
              );
            })}
          </div>
        </ShellCard>

        <ShellCard variant="filters">
          <div className="learn-shell-cats-label">Phân loại học tập</div>
          <nav className="learn-shell-cats" aria-label="Lọc theo dạng bài">
            <button
              type="button"
              className={`learn-shell-cats__btn${sectionFilter === 'vocab' ? ' learn-shell-cats__btn--active' : ''}`}
              onClick={() => goFilter('vocab')}
            >
              <IconChar className="learn-shell-cats__ico" />
              Từ vựng
            </button>
            <button
              type="button"
              className={`learn-shell-cats__btn${sectionFilter === 'grammar' ? ' learn-shell-cats__btn--active' : ''}`}
              onClick={() => goFilter('grammar')}
            >
              <IconGrammar className="learn-shell-cats__ico" />
              Ngữ pháp
            </button>
            <button
              type="button"
              className={`learn-shell-cats__btn${sectionFilter === 'kanji' ? ' learn-shell-cats__btn--active' : ''}`}
              onClick={() => goFilter('kanji')}
            >
              <IconKanji className="learn-shell-cats__ico" />
              Kanji
            </button>
            <button
              type="button"
              className={`learn-shell-cats__btn${sectionFilter === 'dialogue' ? ' learn-shell-cats__btn--active' : ''}`}
              onClick={() => goFilter('dialogue')}
            >
              <IconChat className="learn-shell-cats__ico" />
              Hội thoại
            </button>
          </nav>
          <NavLink
            to={ROUTES.LEARN}
            end
            className={({ isActive }) => `learn-shell-roadmap${isActive ? ' learn-shell-roadmap--active' : ''}`}
          >
            <IconRoadmap className="learn-shell-roadmap__ico" />
            Lộ trình tổng quan
          </NavLink>
        </ShellCard>

        <LessonListSection
          sectionFilter={sectionFilter}
          goFilter={goFilter}
          lessonGroups={lessonGroups}
          visibleGroups={visibleGroups}
          visibleDbLessons={visibleDbLessons}
        />

        <ShellCard variant="weekly">
          <Link className="learn-shell-weekly" to={`${ROUTES.PLAY}/daily`}>
            <span className="learn-shell-weekly__kicker">Thử thách hàng tuần</span>
            <span className="learn-shell-weekly__title">Ôn nhanh · nhận XP</span>
            <span className="learn-shell-weekly__go">Vào thử thách →</span>
          </Link>
        </ShellCard>
      </div>
    </aside>
  );
}
