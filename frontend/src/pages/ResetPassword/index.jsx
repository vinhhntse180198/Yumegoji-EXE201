import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ROUTES } from '../../data/routes';
import { isRequired, minLength } from '../../utils/validators';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) {
      setError(
        'Thiếu mã trong địa chỉ (phải có ?token=…). Quay lại trang Quên mật khẩu và dùng nút “Bước tiếp” (dev) hoặc liên kết trong email khi server đã gửi thư.'
      );
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!tokenFromUrl) return;
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
      await authService.resetPassword({ token: tokenFromUrl, newPassword: password });
      setDone(true);
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true, state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' } }), 1500);
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
            <div className="auth-avatars">
              <span className="auth-avatar" />
              <span className="auth-avatar" />
              <span className="auth-avatar" />
            </div>
            <div>
              Joined by <strong>12,000+</strong> learners
            </div>
          </div>
        </section>

        <section className="auth-right">
          <h1 className="auth-right__title">Đặt lại mật khẩu</h1>
          <p className="auth-right__subtitle">Nhập mật khẩu mới cho tài khoản của bạn.</p>

          {done ? (
            <p className="auth-card__message">Đã cập nhật. Đang chuyển về trang đăng nhập…</p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
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
                  disabled={loading || !tokenFromUrl}
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
                  disabled={loading || !tokenFromUrl}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading || !tokenFromUrl}>
                {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
              <Link to={ROUTES.FORGOT_PASSWORD} className="auth-back">
                Yêu cầu liên kết mới
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
