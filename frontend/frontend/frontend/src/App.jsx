import { Suspense } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './routes';
import { Header } from './components/layout/Header';
import { LearnerTopNav } from './components/layout/LearnerTopNav';
import { Footer } from './components/layout/Footer';
import { ROUTES } from './constants/routes';
import './index.css';
import './styles/theme.css';
import './styles/learner-nav.css';
import './styles/pages/home.css';
import './styles/pages/auth.css';
import './styles/pages/chat.css';
import './styles/pages/dashboard.css';
import './styles/pages/yume-dashboard.css';
import './styles/pages/upgrade.css';
import './styles/pages/learn-course.css';
import './styles/pages/admin-dashboard.css';
import './styles/pages/moderator-dashboard.css';

function AppShell() {
  const location = useLocation();
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
      chatFull);

  return (
    <div
      className={`app ${chatFull ? 'app--chat-full' : ''} ${learnerShell ? 'app--learner' : ''}`}
    >
      {learnerShell ? <LearnerTopNav /> : <Header />}
      <main
        className={`app-main ${chatFull ? 'app-main--chat' : ''} ${learnerShell ? 'app-main--learner' : ''}`}
      >
        <Suspense fallback={<div className="app-loading">Đang tải...</div>}>
          <AppRoutes />
        </Suspense>
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
