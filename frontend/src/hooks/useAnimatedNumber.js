import { useEffect, useState } from 'react';

/**
 * Đếm từ 0 → target (easing). Khi reduceMotion === true: trả về target (không RAF, không setState đồng bộ trong effect).
 * @param {unknown} target
 * @param {{ duration?: number, reduceMotion?: boolean | null }} opts
 */
export function useAnimatedNumber(target, { duration = 1000, reduceMotion = false } = {}) {
  const safe = Number.isFinite(Number(target)) ? Number(target) : 0;
  const skipMotion = reduceMotion === true;
  const ms = Math.max(1, duration);

  const [v, setV] = useState(0);

  useEffect(() => {
    if (skipMotion) {
      return undefined;
    }

    const g = globalThis;
    const now =
      typeof g.performance?.now === 'function'
        ? () => g.performance.now()
        : () => Date.now();
    const schedule =
      typeof g.requestAnimationFrame === 'function'
        ? (cb) => g.requestAnimationFrame(cb)
        : (cb) => g.setTimeout(cb, 16);
    const cancel =
      typeof g.cancelAnimationFrame === 'function'
        ? (id) => g.cancelAnimationFrame(id)
        : (id) => g.clearTimeout(id);

    let handle = 0;
    let cancelled = false;
    const t0 = now();

    const tick = () => {
      if (cancelled) return;
      const p = Math.min(1, (now() - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      setV(Math.round(safe * eased));
      if (p < 1) handle = schedule(tick);
    };

    handle = schedule(tick);
    return () => {
      cancelled = true;
      cancel(handle);
    };
  }, [safe, ms, skipMotion]);

  if (skipMotion) {
    return safe;
  }

  return v;
}
