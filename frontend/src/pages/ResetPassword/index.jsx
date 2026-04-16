import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { AuthHeroAvatars } from '../../components/auth/AuthHeroAvatars';
import { ROUTES } from '../../data/routes';
import { isRequired, minLength, isEmail } from '../../utils/validators';

/** Lấy token từ URL đầy đủ do API dev trả (vd http://localhost:8080/reset-password?token=…). */
function extractTokenFromResetUrl(resetUrl) {
  if (!resetUrl || typeof resetUrl !== 'string') return '';
  try {
    const u = resetUrl.startsWith('http://') || resetUrl.startsWith('https://')
      ? new URL(resetUrl)
      : new URL(resetUrl, globalThis.location?.origin || 'http://localhost:8080');
    const t = u.searchParams.get('token');
    return t ? decodeURIComponent(t) : '';
  } catch {
    return '';
  }
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasTokenInUrl = Boolean(tokenFromUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isRequired(password)) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (!minLength(password, 6)) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      if (hasTokenInUrl) {
        await authService.resetPassword({ token: tokenFromUrl, newPassword: password });
      } else {
        if (!isRequired(email)) {
          setError('Vui lòng nhập email.');
          setLoading(false);
          return;
        }
        if (!isEmail(email)) {
          setError('Email không hợp lệ.');
          setLoading(false);
          return;
        }
        const data = await authService.forgotPassword({ email });
        const token = extractTokenFromResetUrl(data?.resetUrl);
        if (!token) {
          setError(
            data?.smtpNotConfigured
              ? 'Chưa cấu hình SMTP nên không có email; API dev cũng không trả liên kết (kiểm tra email đã đăng ký, ASPNETCORE_ENVIRONMENT=Development, Frontend:PublicBaseUrl trên backend).'
              : 'Không nhận được mã đặt lại. Email có thể chưa đăng ký, hoặc server production không trả link — hãy mở liên kết trong email sau khi đã cấu hình SMTP.',
          );
          setLoading(false);
          return;
        }
        await authService.resetPassword({ token, newPassword: password });
      }

      setDone(true);
      setTimeout(
        () =>
          navigate(ROUTES.LOGIN, {
            replace: true,
            state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' },
          }),
        1500,
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-left auth-left--photo">
          <h2 className="auth-left__title">Mật khẩu mới, hành trình tiếp tục.</h2>
          <p className="auth-left__desc">Chọn mật khẩu đủ mạnh và dễ nhớ với bạn.</p>
          <div className="auth-left__mini" aria-hidden="true">
            <AuthHeroAvatars />
            <div>
              Joined by <strong>12,000+</strong> learners
            </div>
          </div>
        </section>

        <section className="auth-right">
          <h1 className="auth-right__title">Đặt lại mật khẩu</h1>
          <p className="auth-right__subtitle">
            {hasTokenInUrl
              ? 'Nhập mật khẩu mới cho tài khoản của bạn.'
              : 'Nhập email đã đăng ký và mật khẩu mới (một bước — không cần trang quên mật khẩu riêng).'}
          </p>

          {done ? (
            <p className="auth-card__message">Đã cập nhật. Đang chuyển về trang đăng nhập…</p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {!hasTokenInUrl && (
                <div className="input-group">
                  <label htmlFor="reset-email" className="input-label">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              )}
              <div className="input-group">
                <label htmlFor="reset-password" className="input-label">
                  Mật khẩu mới
                </label>
                <input
                  id="reset-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label htmlFor="reset-confirm" className="input-label">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  className="input-field"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
              <Link to={ROUTES.RESET_PASSWORD} className="auth-back" replace>
                Nhập lại từ đầu
              </Link>
              <Link to={ROUTES.LOGIN} className="auth-back">
                ← Đăng nhập
              </Link>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
