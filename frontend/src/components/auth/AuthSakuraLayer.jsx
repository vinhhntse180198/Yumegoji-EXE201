import { useMemo } from 'react';
import * as FM from 'framer-motion';

const Motion = FM.motion;

function SakuraPetal({ petal: p }) {
  return (
    <Motion.span
      className="auth-sakura-petal"
      style={{
        left: p.left,
        width: p.w,
        height: p.h,
      }}
      initial={{ y: '-8vh', opacity: 0.45, rotate: p.rot }}
      animate={{
        y: ['0vh', '108vh'],
        x: [0, p.drift * 0.6, p.drift],
        rotate: [p.rot, p.rot + 220],
        opacity: [0.25, 0.75, 0.35],
      }}
      transition={{
        duration: p.duration,
        repeat: Infinity,
        ease: 'linear',
        delay: p.delay,
      }}
    />
  );
}

/**
 * Cánh hoa anh đào rơi nhẹ (trang đăng nhập) — pointer-events: none.
 */
export function AuthSakuraLayer({ count = 26 }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 17 + (i % 7) * 11) % 100}%`,
        delay: (i * 0.18) % 5,
        duration: 11 + (i % 8),
        w: 6 + (i % 6),
        h: 8 + (i % 5),
        drift: (i % 2 === 0 ? 1 : -1) * (18 + (i % 36)),
        rot: i * 14,
      })),
    [count],
  );

  const nodes = [];
  for (let i = 0; i < petals.length; i += 1) {
    const p = petals[i];
    nodes.push(<SakuraPetal key={p.id} petal={p} />);
  }

  return (
    <div className="auth-sakura-layer" aria-hidden="true">
      {nodes}
    </div>
  );
}
