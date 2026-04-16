import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { executeForgotPassword } from './forgotPasswordFlow';

/** API dev trả URL đầy đủ — chuyển thành path nội bộ cho React Router. */
function toAppResetPath(absoluteOrRelative) {
  if (!absoluteOrRelative) return '';
  try {
    if (absoluteOrRelative.startsWith('http://') || absoluteOrRelative.startsWith('https://')) {
      const u = new URL(absoluteOrRelative);
      return `${u.pathname}${u.search}`;
    }
  } catch {
    return absoluteOrRelative;
  }
  return absoluteOrRelative;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDevResetUrl('');
    setLoading(true);
    const result = await executeForgotPassword(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    if (result.data?.resetUrl) setDevResetUrl(result.data.resetUrl);
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-left auth-left--photo">
          <h2 className="auth-left__title">Đặt lại mật khẩu an toàn.</h2>
          <p className="auth-left__desc">
            Nhập email đã đăng ký. Nếu tài khoản tồn tại, hệ thống sẽ gửi hướng dẫn (hoặc liên kết thử nghiệm ở môi trường
            dev).
          </p>
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
          <h1 className="auth-right__title">Quên mật khẩu</h1>
          <p className="auth-right__subtitle">Nhập email để tiếp tục.</p>

          {done ? (
            <div className="auth-form">
              <p className="auth-card__message">
                Khi server đã cấu hình gửi email (SMTP), bạn sẽ nhận thư có liên kết; hãy kiểm tra cả thư mục spam.
              </p>
              {devResetUrl ? (
                <>
                  <p className="auth-card__message">
                    <strong>Hiện tại ứng dụng chưa gửi email thật,</strong> nên bạn sẽ <strong>không</strong> thấy thư
                    trong Gmail. Ô nhập <strong>mật khẩu mới</strong> nằm ở bước tiếp theo — trang{' '}
                    <strong>Đặt lại mật khẩu</strong> (<code>/reset-password?token=…</code>).
                  </p>
                  <Link to={toAppResetPath(devResetUrl)} className="btn btn--primary btn--block btn--lg">
                    Bước tiếp: nhập mật khẩu mới →
                  </Link>
                </>
              ) : (
                <p className="auth-card__message">
                  Không có liên kết nhanh (API không chạy ở chế độ Development hoặc chưa cấu hình). Khi đó chỉ có email
                  (sau khi cấu hình SMTP) mới đưa bạn tới trang nhập lại mật khẩu.
                </p>
              )}
              <Link to={ROUTES.LOGIN} className="auth-back">
                ← Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="forgot-email" className="input-label">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sakura_learner@nihongo.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}
              </button>
              <Link to={ROUTES.LOGIN} className="auth-back">
                ← Quay lại đăng nhập
              </Link>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
