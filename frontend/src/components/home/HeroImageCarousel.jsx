import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];
const MotionImg = motion.img;

/**
 * Carousel ảnh hero — tự động chuyển, chuyển cảnh mượt (Framer Motion).
 * URL lỗi sẽ bị bỏ qua; nếu hết URL còn `fallbackSrc` thì hiển thị một ảnh tĩnh.
 */
export function HeroImageCarousel({ images, alt, intervalMs = 6000, fallbackSrc }) {
  const sourceUrls = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [badUrls, setBadUrls] = useState(() => new Set());
  const goodUrls = useMemo(() => sourceUrls.filter((u) => !badUrls.has(u)), [sourceUrls, badUrls]);
  const displayUrls = useMemo(() => {
    if (goodUrls.length > 0) return goodUrls;
    if (fallbackSrc && !badUrls.has(fallbackSrc)) return [fallbackSrc];
    return [];
  }, [goodUrls, fallbackSrc, badUrls]);

  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (displayUrls.length <= 1 ? 0 : (i + 1) % displayUrls.length));
  }, [displayUrls.length]);

  useEffect(() => {
    if (displayUrls.length <= 1) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return undefined;
    const t = window.setInterval(next, intervalMs);
    return () => window.clearInterval(t);
  }, [next, intervalMs, displayUrls.length]);

  const safeIndex = displayUrls.length ? Math.min(index, displayUrls.length - 1) : 0;

  const onImgError = useCallback(() => {
    const cur = displayUrls[safeIndex];
    if (cur) setBadUrls((prev) => new Set(prev).add(cur));
    else next();
  }, [displayUrls, safeIndex, next]);

  if (!displayUrls.length) return null;

  const src = displayUrls[safeIndex];

  return (
    <div className="sn-visual-carousel" aria-roledescription="carousel" aria-label={alt}>
      <AnimatePresence mode="wait" initial={false}>
        <MotionImg
          key={src}
          className="sn-visual-img sn-visual-carousel__img"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.75, ease: EASE }}
          onError={onImgError}
        />
      </AnimatePresence>
    </div>
  );
}
