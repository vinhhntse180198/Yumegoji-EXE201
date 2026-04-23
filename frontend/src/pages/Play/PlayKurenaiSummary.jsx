import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import '../../styles/pages/play-kurenai-summary.css';

const Motion = motion;

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

function clampRingTarget(ring) {
  const max = Math.max(1, Number(ring.max) || 100);
  const v = Number(ring.value);
  const raw = Number.isFinite(v) ? v : 0;
  return { target: Math.min(max, Math.max(0, raw)), max };
}

/**
 * Màn kết quả phiên — Kurenai + Sakura + đếm điểm + thẻ EXP/Xu.
 *
 * @param {{
 *   className?: string,
 *   kicker: string,
 *   headline: string,
 *   subline?: string,
 *   ring?: { value: number, max: number, centerLabel?: string } | null,
 *   scoreFallback?: import('react').ReactNode,
 *   showPerfect?: boolean,
 *   exp?: number | null,
 *   xu?: number | null,
 *   rewardsLoading?: boolean,
 *   alwaysShowRewardStrip?: boolean,
 *   statsLine?: string | null,
 *   children?: import('react').ReactNode,
 *   links?: import('react').ReactNode,
 *   onPlayAgain: () => void,
 *   playAgainLabel?: string,
 *   secondaryTo: string,
 *   secondaryLabel?: string,
 *   navBack?: { to: string, label: string },
 * }} props
 */
export function PlayKurenaiSummary({
  className = '',
  kicker,
  headline,
  subline = '',
  ring = null,
  scoreFallback = null,
  showPerfect = false,
  exp = null,
  xu = null,
  rewardsLoading = false,
  alwaysShowRewardStrip = false,
  statsLine = null,
  children = null,
  links = null,
  onPlayAgain,
  playAgainLabel = 'Chơi lại',
  secondaryTo,
  secondaryLabel = 'Danh sách game',
  navBack = null,
}) {
  const reduceMotion = useReducedMotion();
  const gradId = useId().replace(/:/g, '');
  const [displayScore, setDisplayScore] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);

  const ringValue = ring != null ? Number(ring.value) : null;
  const ringMax = ring != null ? Number(ring.max) : null;
  const clampedLive =
    ringValue != null && ringMax != null ? clampRingTarget({ value: ringValue, max: ringMax }) : { target: 0, max: 100 };

  useEffect(() => {
    if (reduceMotion || ringValue == null || ringMax == null) return;
    const { target, max } = clampRingTarget({ value: ringValue, max: ringMax });
    let raf = 0;
    const start = performance.now();
    const dur = 1180;
    const tick = (t) => {
      const p = Math.min(1, Math.max(0, (t - start) / dur));
      const eased = 1 - (1 - p) ** 3;
      setDisplayScore(Math.round(target * eased));
      setRingProgress((target / max) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, ringValue, ringMax]);

  const ringProgVisual = reduceMotion ? clampedLive.target / clampedLive.max : ringProgress;
  const scoreNumVisual = reduceMotion ? clampedLive.target : displayScore;
  const dashOffset = ring ? RING_C * (1 - ringProgVisual) : RING_C;
  const centerLabel = ring?.centerLabel?.trim() || 'ĐIỂM';

  const showExpCard = alwaysShowRewardStrip || rewardsLoading || exp != null;
  const showXuCard = alwaysShowRewardStrip || rewardsLoading || xu != null;
  const showRewardRow = showExpCard || showXuCard;

  return (
    <div className={`play-game play-kurenai-summary ${className}`.trim()}>
      <div className="play-kurenai-summary__sakura-stack" aria-hidden>
        <div className="play-kurenai-summary__sakura play-kurenai-summary__sakura--far">
          <SakuraRainLayer petalCount={14} />
        </div>
        <div className="play-kurenai-summary__sakura play-kurenai-summary__sakura--mid">
          <SakuraRainLayer petalCount={22} buoyant />
        </div>
        <div className="play-kurenai-summary__sakura play-kurenai-summary__sakura--near">
          <SakuraRainLayer petalCount={11} buoyant />
        </div>
      </div>
      <div className="play-kurenai-summary__wash" aria-hidden />

      {navBack ? (
        <div className="play-kurenai-summary__navback">
          <Link className="play-kurenai-summary__navback-link" to={navBack.to}>
            {navBack.label}
          </Link>
        </div>
      ) : null}

      <Motion.div
        className="play-kurenai-summary__inner"
        initial={reduceMotion ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.05 : 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="play-kurenai-summary__kicker">{kicker}</p>
        <h1 className="play-kurenai-summary__headline">{headline}</h1>
        {subline ? <p className="play-kurenai-summary__sub">{subline}</p> : null}

        {ring ? (
          <Motion.div
            className="play-kurenai-summary__score-card"
            initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="play-kurenai-summary__ring-wrap">
              <svg className="play-kurenai-summary__ring-svg" viewBox="0 0 120 120" aria-hidden>
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c92a35" />
                    <stop offset="100%" stopColor="#7f151a" />
                  </linearGradient>
                </defs>
                <circle className="play-kurenai-summary__ring-track" cx="60" cy="60" r={RING_R} />
                <circle
                  className="play-kurenai-summary__ring-prog"
                  cx="60"
                  cy="60"
                  r={RING_R}
                  stroke={`url(#${gradId})`}
                  strokeDasharray={RING_C}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="play-kurenai-summary__ring-center">
                <span className="play-kurenai-summary__ring-num">{scoreNumVisual}</span>
                <span className="play-kurenai-summary__ring-cap">{centerLabel}</span>
              </div>
            </div>
            {showPerfect ? (
              <div className="play-kurenai-summary__petals" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="play-kurenai-summary__petal-ico">
                    🌸
                  </span>
                ))}
              </div>
            ) : null}
            {showPerfect ? <p className="play-kurenai-summary__perfect">Hoàn hảo!</p> : null}
          </Motion.div>
        ) : scoreFallback ? (
          <div className="play-kurenai-summary__score-card">
            <div className="play-kurenai-summary__score-fallback">{scoreFallback}</div>
          </div>
        ) : null}

        {showRewardRow ? (
          <div className="play-kurenai-summary__rewards">
            {showExpCard ? (
              <Motion.div
                className="play-kurenai-summary__reward"
                initial={reduceMotion ? false : { opacity: 0, x: -38 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0.05 : 0.48,
                  delay: reduceMotion ? 0 : 0.72,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="play-kurenai-summary__reward-ico play-kurenai-summary__reward-ico--exp" aria-hidden>
                  ★
                </span>
                <div>
                  <span className="play-kurenai-summary__reward-label">Kinh nghiệm thu được</span>
                  {rewardsLoading ? (
                    <span className="play-kurenai-summary__reward-pending">Đang cập nhật…</span>
                  ) : (
                    <span className="play-kurenai-summary__reward-val">+{Number(exp) || 0} EXP</span>
                  )}
                </div>
              </Motion.div>
            ) : null}
            {showXuCard ? (
              <Motion.div
                className="play-kurenai-summary__reward"
                initial={reduceMotion ? false : { opacity: 0, x: 38 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0.05 : 0.48,
                  delay: reduceMotion ? 0 : 0.88,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="play-kurenai-summary__reward-ico play-kurenai-summary__reward-ico--xu" aria-hidden>
                  ✦
                </span>
                <div>
                  <span className="play-kurenai-summary__reward-label">Xu thưởng</span>
                  {rewardsLoading ? (
                    <span className="play-kurenai-summary__reward-pending">Đang cập nhật…</span>
                  ) : (
                    <span className="play-kurenai-summary__reward-val">+{Number(xu) || 0} Xu</span>
                  )}
                </div>
              </Motion.div>
            ) : null}
          </div>
        ) : null}

        {statsLine ? <p className="play-kurenai-summary__stats">{statsLine}</p> : null}

        {children ? <div className="play-kurenai-summary__notes">{children}</div> : null}

        {links ? <div className="play-kurenai-summary__hint play-kurenai-summary__links">{links}</div> : null}

        <div className="play-kurenai-summary__actions">
          <button type="button" className="play-kurenai-summary__btn play-kurenai-summary__btn--primary" onClick={onPlayAgain}>
            <span className="play-kurenai-summary__btn-ico" aria-hidden>
              ↻
            </span>
            {playAgainLabel}
          </button>
          <Link className="play-kurenai-summary__btn play-kurenai-summary__btn--ghost" to={secondaryTo}>
            <span className="play-kurenai-summary__btn-ico" aria-hidden>
              ≡
            </span>
            {secondaryLabel}
          </Link>
        </div>
      </Motion.div>
    </div>
  );
}
