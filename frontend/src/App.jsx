import { Suspense } from 'react';
import { AnimatePresence, motion as motionFr, useReducedMotion } from 'framer-motion';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { ThemeProvider } from './context/ThemeProvider';
import { AppRoutes } from './routes';
import { Header } from './layout/Header';
import { LearnerTopNav } from './layout/LearnerTopNav';
import { Footer } from './layout/Footer';
import { ROUTES } from './data/routes';
import { SystemAnnouncementBanner } from './components/system/SystemAnnouncementBanner';
import './index.css';
import './styles/theme.css';
import './styles/learner-nav.css';
import './styles/pages/homepage.css';
import './styles/pages/auth.css';
import './styles/pages/chat.css';
import './styles/pages/dashboard.css';
import './styles/pages/yume-dashboard.css';
import './styles/pages/level-up-test.css';
import './styles/pages/upgrade.css';
import './styles/pages/learn-course.css';
import './styles/pages/admin-dashboard.css';
import './styles/pages/moderator-dashboard.css';

const Motion = motionFr;

/** Nhóm route learner để chuyển cảnh (Học tập ↔ Trò chơi ↔ …) không animate từng path con. */
function learnerSectionKey(pathname) {
  if (!pathname) return '';
  if (pathname.startsWith(ROUTES.DASHBOARD)) return 'dashboard';
  if (pathname.startsWith(ROUTES.LEARN)) return 'learn';
  if (pathname.startsWith(ROUTES.PLAY)) return 'play';
  if (pathname.startsWith(ROUTES.CHAT)) return 'chat';
  if (pathname.startsWith(ROUTES.UPGRADE)) return 'upgrade';
  if (pathname.startsWith(ROUTES.ADMIN)) return 'admin';
  if (pathname.startsWith(ROUTES.MODERATOR)) return 'moderator';
  if (pathname.startsWith('/level-up-test')) return 'level-up';
  if (pathname.startsWith(ROUTES.PLACEMENT_TEST)) return 'placement';
  if (pathname.startsWith(ROUTES.ACCOUNT)) return 'account';
  return pathname;
}

function AppShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  usePresenceHeartbeat();
  const chatFull = location.pathname.startsWith('/chat');
  const learnerShell =
    isAuthenticated &&
    (location.pathname === ROUTES.DASHBOARD ||
      location.pathname.startsWith(ROUTES.ADMIN) ||
      location.pathname.startsWith(ROUTES.MODERATOR) ||
      location.pathname.startsWith(ROUTES.LEARN) ||
      location.pathname.startsWith(ROUTES.PLAY) ||
      location.pathname.startsWith('/level-up-test') ||
      location.pathname.startsWith(ROUTES.PLACEMENT_TEST) ||
      chatFull);

  return (
    <div
      className={`app ${chatFull ? 'app--chat-full' : ''} ${learnerShell ? 'app--learner' : ''}`}
    >
      {learnerShell ? <LearnerTopNav /> : <Header />}
      <main
        className={`app-main ${chatFull ? 'app-main--chat' : ''} ${learnerShell ? 'app-main--learner' : ''}`}
      >
        <SystemAnnouncementBanner />
        {learnerShell ? (
          <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={learnerSectionKey(location.pathname)}
              className="app-main-motion"
              initial={reduceMotion ? false : { opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -20 }}
              transition={{
                duration: reduceMotion ? 0.05 : 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Suspense fallback={<div className="app-loading">Đang tải...</div>}>
                <AppRoutes />
              </Suspense>
            </Motion.div>
          </AnimatePresence>
        ) : (
          <Suspense fallback={<div className="app-loading">Đang tải...</div>}>
            <AppRoutes />
          </Suspense>
        )}
      </main>
      {!learnerShell && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
