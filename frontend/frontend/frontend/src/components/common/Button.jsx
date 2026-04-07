/**
 * Nút tái sử dụng: primary, secondary, danger, disabled
 */
export function Button({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  ...props
}) {
  const classNames = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classNames} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
