import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ROUTES } from '../../data/routes';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { isStaffUser } from '../../utils/roles';
import { isRequired, isEmail } from '../../utils/validators';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const message = location.state?.message;

  useEffect(() => {
    if (message) setError('');
  }, [message]);

  // Bỏ auto-redirect ngay khi đã đăng nhập, để điều hướng được kiểm soát trong handleSubmit

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isRequired(email)) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!isEmail(email)) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!isRequired(password)) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const data = await login({ email, password });
      const u = data?.user ?? authService.getStoredUser();
      if (data?.needsPlacementTest && !isStaffUser(u)) {
        navigate(ROUTES.PLACEMENT_TEST, { replace: true });
      } else {
        navigate(getPostLoginRoute(u, from), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-left auth-left--photo">
          <h2 className="auth-left__title">Master Japanese with every petal.</h2>
          <p className="auth-left__desc">
            Continue your journey through the levels of JLPT with our curated curriculum.
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
          <h1 className="auth-right__title">Welcome Back</h1>
          <p className="auth-right__subtitle">Please enter your details to continue learning.</p>
          {message && <p className="auth-card__message">{message}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <div className="auth-row">
                <label htmlFor="login-email" className="input-label">
                  Email
                </label>
              </div>
              <input
                id="login-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sakura_learner@nihongo.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <div className="auth-row">
                <label htmlFor="login-password" className="input-label">
                  Password
                </label>
                <a className="auth-link" href="#" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <input
                id="login-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Sign In to Learning →'}
            </button>
          </form>

          <div className="auth-divider">OR CONTINUE WITH</div>
          <div className="auth-social">
            <button type="button" className="auth-social__btn" onClick={() => {}}>
              <span className="auth-social__dot" aria-hidden="true" /> Google
            </button>
            <button type="button" className="auth-social__btn" onClick={() => {}}>
              <span className="auth-social__dot" aria-hidden="true" /> Line
            </button>
          </div>

          <p className="auth-footer">
            New to Sakura Nihongo? <Link to={ROUTES.REGISTER}>Create an account</Link>
          </p>
          <Link to={ROUTES.HOME} className="auth-back">
            ← Về trang chủ
          </Link>
        </section>
      </div>
    </div>
  );
}
