import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { ChatbotWidget } from '../../components/support/ChatbotWidget';
import { HOMEPAGE_CTA, HOMEPAGE_HERO, HOMEPAGE_METHOD, HOMEPAGE_TESTIMONIALS, HOMEPAGE_WHY } from '../../data/homepageContent';
import { HeroImageCarousel } from '../../components/home/HeroImageCarousel';
import { useAuth } from '../../hooks/useAuth';
import { fetchMyProgressSummary } from '../../services/learningProgressService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function formatIntVi(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const v = Math.round(Math.abs(x));
  const signed = x < 0 ? '-' : '';
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return signed + s;
}

function aggregateLessonProgress(byLevel) {
  const rows = Array.isArray(byLevel) ? byLevel : [];
  let completed = 0;
  let total = 0;
  for (const row of rows) {
    completed += Number(pick(row, 'completedLessons', 'CompletedLessons') ?? 0) || 0;
    total += Number(pick(row, 'totalPublishedLessons', 'TotalPublishedLessons') ?? 0) || 0;
  }
  const safeDone = Math.min(completed, Math.max(total, 0));
  const pct = total > 0 ? Math.min(100, Math.round((safeDone / total) * 100)) : 0;
  return { completed, total, pct };
}

/** Trang chủ marketing (Sakura Nihongo) — style: `styles/pages/homepage.css` */
export default function Homepage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [progressSummary, setProgressSummary] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    setProgressLoading(true);
    try {
      const data = await fetchMyProgressSummary();
      setProgressSummary(data);
    } catch {
      setProgressSummary(null);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProgressSummary(null);
      setProgressLoading(false);
      return;
    }
    void loadProgress();
  }, [isAuthenticated, loadProgress]);

  const memberFirstName = useMemo(() => {
    const raw = String(user?.displayName || user?.username || user?.name || '').trim();
    if (!raw) return '';
    return raw.split(/\s+/)[0] || raw;
  }, [user]);

  const progressFloat = useMemo(() => {
    if (!isAuthenticated) return null;
    if (progressLoading) {
      return {
        label: 'Tóm tắt học tập',
        value: 'Đang tải…',
        hint: 'Đang lấy dữ liệu từ tài khoản của bạn.',
        muted: false,
        pct: null,
      };
    }
    if (!progressSummary) {
      return {
        label: 'Tóm tắt học tập',
        value: 'Chưa tải được dữ liệu',
        hint: 'Thử tải lại trang hoặc đăng nhập lại.',
        muted: true,
        pct: null,
      };
    }
    const exp = Number(pick(progressSummary, 'exp', 'Exp') ?? 0) || 0;
    const streak = Number(pick(progressSummary, 'streakDays', 'StreakDays') ?? 0) || 0;
    const byLevel = pick(progressSummary, 'byLevel', 'ByLevel') ?? [];
    const { completed, total, pct } = aggregateLessonProgress(byLevel);

    if (total < 1) {
      return {
        label: 'Tóm tắt học tập',
        value: 'Lộ trình đang cập nhật',
        hint: 'Vào mục Học tập để bắt đầu bài đầu tiên.',
        muted: true,
        pct: null,
      };
    }
    if (completed < 1) {
      return {
        label: 'Tóm tắt học tập',
        value: `0 / ${formatIntVi(total)} bài`,
        hint: `Streak ${formatIntVi(streak)} ngày · EXP ${formatIntVi(exp)} — bắt đầu từ một bài bất kỳ trên Học tập.`,
        muted: true,
        pct: 0,
      };
    }
    return {
      label: 'Tóm tắt học tập',
      value: `${formatIntVi(completed)} / ${formatIntVi(total)} bài`,
      hint: `Streak ${formatIntVi(streak)} ngày · EXP ${formatIntVi(exp)} · Hoàn thành ${pct}% lộ trình đã xuất bản.`,
      muted: false,
      pct,
    };
  }, [isAuthenticated, progressLoading, progressSummary]);

  const hero = useMemo(() => {
    if (!isAuthenticated) return HOMEPAGE_HERO;
    return {
      ...HOMEPAGE_HERO,
      badge: memberFirstName ? `Chào mừng quay lại, ${memberFirstName} 👋` : 'Chào mừng quay lại 👋',
      title: 'Tiếp tục chinh phục',
      highlight: 'tiếng Nhật.',
      description:
        'Vào khu học tập để làm bài, ôn Kanji và xem tiến độ — nội dung bên dưới vẫn giúp bạn nhớ vì sao YumeGo-ji khác biệt.',
      primaryCta: 'Tiếp tục học',
      secondaryCta: 'Vào Dashboard',
    };
  }, [isAuthenticated, memberFirstName]);

  /** Anchor trong URL (/#method, …) — cuộn tới section sau khi SPA đã render (khách / link từ footer). */
  useEffect(() => {
    if (location.pathname !== ROUTES.HOME) return;
    const id = (location.hash || '').replace(/^#/, '').trim();
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.sn-reveal'));
    if (!nodes.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="homepage">
      <div className="sn-petals" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`sn-petal sn-petal--${(i % 4) + 1}`} />
        ))}
      </div>

      <section className="sn-hero sn-reveal is-visible">
        <div className="sn-container sn-hero__grid">
          <div className="sn-hero__content sn-reveal is-visible">
            <span className="sn-hero__badge">{hero.badge}</span>
            <h1 className="sn-hero__title">
              {hero.title} <span className="sn-hero__accent">{hero.highlight}</span>
            </h1>
            <p className="sn-hero__desc">{hero.description}</p>
            <div className="sn-hero__cta">
              {isAuthenticated ? (
                <Link to={ROUTES.LEARN} className="btn btn--primary btn--lg sn-btn--gradient">
                  {hero.primaryCta}
                </Link>
              ) : (
                <Link to={ROUTES.REGISTER} className="btn btn--primary btn--lg sn-btn--gradient">
                  {hero.primaryCta}
                </Link>
              )}
              {isAuthenticated ? (
                <Link to={ROUTES.DASHBOARD} className="btn btn--outline btn--lg sn-btn--soft">
                  {hero.secondaryCta}
                </Link>
              ) : (
                <a href="#method" className="btn btn--outline btn--lg sn-btn--soft">
                  {hero.secondaryCta}
                </a>
              )}
            </div>
          </div>

          <div className="sn-hero__visual sn-reveal is-visible">
            <div className="sn-visual-blob" aria-hidden="true" />
            <div className="sn-visual-card sn-visual-card--tilt">
              <div className="sn-visual-frame">
                <HeroImageCarousel
                  images={hero.slides ?? [hero.image]}
                  fallbackSrc={hero.image}
                  alt="Hình minh họa Nhật Bản"
                  intervalMs={6200}
                />
              </div>
              <div className="sn-visual-float sn-visual-float--metric">
                <div className="sn-visual-float__icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path
                      d="M4 18V6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M8 16V10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M12 16V7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M16 16V9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.55"
                    />
                    <path
                      d="M20 16V5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <div>
                  <div className="sn-visual-float__label">
                    {isAuthenticated ? progressFloat?.label ?? 'Tóm tắt học tập' : HOMEPAGE_HERO.metricLabel}
                  </div>
                  {isAuthenticated && progressFloat ? (
                    <>
                      <div
                        className={`sn-visual-float__value${progressFloat.muted ? ' sn-visual-float__value--muted' : ''}`}
                      >
                        {progressFloat.value}
                      </div>
                      {typeof progressFloat.pct === 'number' ? (
                        <div className="sn-visual-float__track" role="progressbar" aria-valuenow={progressFloat.pct} aria-valuemin={0} aria-valuemax={100}>
                          <span className="sn-visual-float__fill" style={{ width: `${progressFloat.pct}%` }} />
                        </div>
                      ) : null}
                      <p className="sn-visual-float__hint">{progressFloat.hint}</p>
                    </>
                  ) : (
                    <>
                      <div className="sn-visual-float__value">{HOMEPAGE_HERO.metricValue}</div>
                      <p className="sn-visual-float__hint sn-visual-float__hint--demo">Ví dụ minh họa — không phải tiến độ thật.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="sn-section sn-section--method sn-reveal">
        <div className="sn-container">
          <h2 className="sn-title">{HOMEPAGE_METHOD.title}</h2>
          <p className="sn-subtitle">{HOMEPAGE_METHOD.subtitle}</p>
          <div className="sn-grid-3">
            {HOMEPAGE_METHOD.features.map((f) => (
              <article key={f.title} className="sn-feature sn-feature--elevated sn-feature--icon-only sn-reveal">
                <div className="sn-feature__icon" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="sn-feature__title">{f.title}</h3>
                <p className="sn-feature__text">{f.description}</p>
                <a className="sn-feature__link" href="#method">
                  {f.linkLabel} <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="sn-section sn-section--why sn-reveal">
        <div className="sn-container sn-why__grid">
          <div className="sn-why__gallery" aria-hidden="true">
            <div className="sn-why__img sn-why__img--a">
              <img src={HOMEPAGE_WHY.images[0]} alt="" loading="lazy" />
            </div>
            <div className="sn-why__img sn-why__img--b">
              <img src={HOMEPAGE_WHY.images[1]} alt="" loading="lazy" />
            </div>
          </div>

          <div className="sn-why__content">
            <h2 className="sn-why__heading">{HOMEPAGE_WHY.title}</h2>
            <div className="sn-why__list">
              {HOMEPAGE_WHY.items.map((it) => (
                <div key={it.title} className="sn-why__row">
                  <div className="sn-why__check" aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <h3 className="sn-why__item-title">{it.title}</h3>
                    <p className="sn-why__item-text">{it.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="sn-section sn-section--testimonials sn-reveal">
        <div className="sn-container">
          <h2 className="sn-title">{HOMEPAGE_TESTIMONIALS.title}</h2>
          <p className="sn-subtitle">{HOMEPAGE_TESTIMONIALS.subtitle}</p>
          <div className="sn-grid-3">
            {HOMEPAGE_TESTIMONIALS.items.map((t) => (
              <article key={t.name} className="sn-testimonial sn-reveal">
                <div className="sn-testimonial__stars" aria-label="5 sao">
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                  <span>★</span>
                </div>
                <p className="sn-testimonial__quote">“{t.quote}”</p>
                <div className="sn-testimonial__meta">
                  <div className="sn-testimonial__avatar">
                    {t.avatarUrl ? (
                      <img
                        className="sn-testimonial__avatar-img"
                        src={t.avatarUrl}
                        alt={t.name}
                        width={44}
                        height={44}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="sn-testimonial__name">{t.name}</div>
                    <div className="sn-testimonial__level">{t.level}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sn-cta sn-reveal">
        <div className="sn-container sn-cta__inner sn-cta__inner--center sn-reveal">
          <div className="sn-cta__sakura" aria-hidden="true">
            ❀
          </div>
          <h2 className="sn-cta__title">
            {isAuthenticated ? 'Sẵn sàng vào bài học tiếp theo?' : HOMEPAGE_CTA.title}
          </h2>
          <p className="sn-cta__text sn-cta__text--wide">
            {isAuthenticated
              ? 'Tiếp tục từ chỗ bạn dừng — lộ trình và game vẫn ở đây khi bạn cần ôn thêm.'
              : HOMEPAGE_CTA.subtitle}
          </p>
          <Link
            to={isAuthenticated ? ROUTES.LEARN : ROUTES.REGISTER}
            className="btn btn--inverted btn--lg sn-cta__btn"
          >
            {isAuthenticated ? 'Mở khu học tập' : HOMEPAGE_CTA.button}
          </Link>
        </div>
      </section>

      <ChatbotWidget />
    </div>
  );
}
