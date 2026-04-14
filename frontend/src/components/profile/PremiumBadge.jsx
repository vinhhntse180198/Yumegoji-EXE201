/**
 * Huy hiệu gói Premium — dùng Account, Dashboard, nav (vàng / vàng đậm dark).
 */
export function PremiumBadge({ className = '', variant = 'default' }) {
  const mod =
    variant === 'large' ? 'yume-premium-badge--lg' : variant === 'nav' ? 'yume-premium-badge--nav' : '';
  return (
    <span
      className={`yume-premium-badge ${mod} ${className}`.trim()}
      title="Tài khoản gói Premium"
    >
      <span className="yume-premium-badge__icon" aria-hidden>
        👑
      </span>
      <span className="yume-premium-badge__text">Premium</span>
    </span>
  );
}
