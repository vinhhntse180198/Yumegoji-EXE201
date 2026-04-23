/* eslint-env browser */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as FM from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ROUTES } from '../../data/routes';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { isStaffUser } from '../../utils/roles';
import { isRequired, isEmail } from '../../utils/validators';
import { AuthSakuraLayer } from '../../components/auth/AuthSakuraLayer';
import { AuthHeroAvatars } from '../../components/auth/AuthHeroAvatars';
import {
  loginShellVariants,
  loginStaggerParent,
  loginStaggerItem,
  loginHeroGlass,
} from './loginMotion';
import yumeLogo from '../../assets/yume-logo.png';

const Motion = FM.motion;
const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function IconEnvelope() {
  return (
    <svg className="auth-field-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8l9 6 9-6M3 8v10h18V8"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="auth-field-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGoogleG() {
  return (
    <svg className="auth-google-fallback-pill__g" width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function IconEye({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6zm9-2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.3 9.3 0 0 1 12 5c5 0 9 6 9 6a17 17 0 0 1-4.1 4.3M6.2 6.2C4.2 7.7 3 12 3 12s4 6 9 6c1.1 0 2.1-.2 3.1-.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const message = location.state?.message;
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (message) setError('');
  }, [message]);

  const routeAfterAuth = useCallback(
    (data) => {
      const u = authService.mergeUserWithRoleFromToken(data?.user ?? authService.getStoredUser());
      if (data?.needsPlacementTest && !isStaffUser(u)) {
        navigate(ROUTES.PLACEMENT_TEST, { replace: true });
      } else {
        navigate(getPostLoginRoute(u, from), { replace: true });
      }
    },
    [navigate, from],
  );

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
      routeAfterAuth(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = useCallback(
    async (credential) => {
      if (!credential) return;
      setError('');
      setLoading(true);
      try {
        const data = await loginWithGoogle({ idToken: credential });
        routeAfterAuth(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Đăng nhập Google thất bại.');
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, routeAfterAuth],
  );

  useEffect(() => {
    if (!VITE_GOOGLE_CLIENT_ID) return undefined;
    const mountEl = googleBtnRef.current;
    if (!mountEl) return undefined;

    let cancelled = false;
    let intervalId;

    const tryMount = () => {
      const g = globalThis.google;
      if (cancelled || !g?.accounts?.id) return false;
      mountEl.replaceChildren();
      g.accounts.id.initialize({
        client_id: VITE_GOOGLE_CLIENT_ID,
        callback: (res) => {
          void onGoogleCredential(res?.credential);
        },
      });
      const wrap = mountEl.closest('.auth-google-pill-wrap');
      const w = Math.min(280, wrap?.clientWidth || mountEl.parentElement?.clientWidth || 280);
      g.accounts.id.renderButton(mountEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: w,
        locale: 'vi',
      });
      return true;
    };

    if (!tryMount()) {
      intervalId = globalThis.setInterval(() => {
        if (tryMount() && intervalId != null) globalThis.clearInterval(intervalId);
      }, 120);
    }

    return () => {
      cancelled = true;
      if (intervalId != null) globalThis.clearInterval(intervalId);
      mountEl.replaceChildren();
    };
  }, [onGoogleCredential]);

  return (
    <div className="auth-page auth-page--animated-login">
      <AuthSakuraLayer count={36} />

      <Motion.div
        className="auth-shell auth-shell--v3"
        variants={loginShellVariants}
        initial="hidden"
        animate="visible"
      >
        <Motion.section className="auth-left auth-left--photo auth-left--v3">
          <Motion.div className="auth-left__hero-copy" variants={loginHeroGlass} initial="hidden" animate="visible">
            <h2 className="auth-left__title">
              Master the Art of <span className="auth-left__accent">Japanese</span>
            </h2>
            <p className="auth-left__desc">
              Join thousands of learners on a journey through grammar, kanji, and culture — with care on YumeGo-ji.
            </p>
            <div className="auth-left__hero-footer" aria-hidden="true">
              <AuthHeroAvatars />
              <div>
                Joined by <strong>12,000+</strong> learners
              </div>
            </div>
          </Motion.div>
        </Motion.section>

        <Motion.section className="auth-right auth-right--v3" variants={loginStaggerParent} initial="hidden" animate="visible">
          <Motion.div className="auth-login-brand" variants={loginStaggerItem}>
            <img src={yumeLogo} alt="" width={40} height={40} />
            <span className="auth-login-brand__text">YumeGo-ji</span>
          </Motion.div>

          <Motion.h1 className="auth-right__title" variants={loginStaggerItem}>
            Welcome back
          </Motion.h1>
          <Motion.p className="auth-right__subtitle" variants={loginStaggerItem}>
            Please enter your details to sign in.
          </Motion.p>

          {message && (
            <Motion.p className="auth-card__message" variants={loginStaggerItem}>
              {message}
            </Motion.p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <Motion.div
              className="auth-form__stagger"
              variants={loginStaggerParent}
              initial="hidden"
              animate="visible"
            >
              <Motion.div
                className="input-group input-group--auth-motion"
                variants={loginStaggerItem}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <label htmlFor="login-email" className="input-label">
                  Email address
                </label>
                <div className="auth-field-wrap">
                  <span className="auth-field-icon">
                    <IconEnvelope />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className="auth-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </Motion.div>

              <Motion.div
                className="input-group input-group--auth-motion"
                variants={loginStaggerItem}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <div className="auth-row">
                  <label htmlFor="login-password" className="input-label">
                    Password
                  </label>
                  <Link className="auth-link" to={ROUTES.RESET_PASSWORD}>
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-field-wrap auth-field-wrap--password">
                  <span className="auth-field-icon">
                    <IconLock />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <Motion.button
                    type="button"
                    className="auth-field-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    whileTap={{ scale: 0.92 }}
                  >
                    <IconEye open={showPassword} />
                  </Motion.button>
                </div>
              </Motion.div>

              {error && (
                <Motion.p className="form-error" variants={loginStaggerItem}>
                  {error}
                </Motion.p>
              )}

              <Motion.div variants={loginStaggerItem}>
                <Motion.button
                  type="submit"
                  className="btn btn--block btn--lg btn--auth-primary"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Đang xử lý...' : 'Sign In to Learning'}
                </Motion.button>
              </Motion.div>
            </Motion.div>
          </form>

          <Motion.div
            className="auth-google-only"
            variants={loginStaggerItem}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <p className="auth-google-only__label">Đăng nhập với</p>
            <div className="auth-google-pill-wrap">
              {VITE_GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="auth-google-mount auth-google-mount--pill" />
              ) : (
                <Motion.button
                  type="button"
                  className="auth-google-fallback-pill"
                  disabled={loading}
                  onClick={() =>
                    setError(
                      'Chưa cấu hình Google OAuth: thêm VITE_GOOGLE_CLIENT_ID vào frontend/.env (xem .env.example), GoogleAuth:ClientId trên backend, và chạy backend/doc/sql/060-google-oauth-users.sql nếu DB chưa có google_sub.',
                    )
                  }
                  aria-label="Đăng nhập với Google — cần cấu hình Client ID"
                  title="Cần VITE_GOOGLE_CLIENT_ID — xem frontend/.env.example"
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <IconGoogleG />
                  <span>Google</span>
                </Motion.button>
              )}
            </div>
          </Motion.div>

          <Motion.p className="auth-footer" variants={loginStaggerItem}>
            Don&apos;t have an account? <Link to={ROUTES.REGISTER}>Create an account</Link>
          </Motion.p>
          <Motion.div variants={loginStaggerItem}>
            <Link to={ROUTES.HOME} className="auth-back">
              ← Về trang chủ
            </Link>
          </Motion.div>

          <p className="auth-login-tagline">Experience the harmony of language</p>
        </Motion.section>
      </Motion.div>
    </div>
  );
}
