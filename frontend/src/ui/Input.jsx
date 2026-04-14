import { useId } from 'react';

/**
 * Input text/email/password với label và error
 */
export function Input({
  id,
  label,
  error,
  type = 'text',
  className = '',
  ...props
}) {
  const autoId = useId();
  const inputId = id || props.name || `input-${autoId.replace(/:/g, '')}`;
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input id={inputId} type={type} className="input-field" aria-invalid={!!error} {...props} />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
