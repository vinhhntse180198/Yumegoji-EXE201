import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import { PrivateRoute } from './guards/PrivateRoute';
import { AdminRoute } from './guards/AdminRoute';
import { ModeratorRoute } from './guards/ModeratorRoute';

const Homepage = lazy(() => import('../pages/Homepage'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const PlacementTest = lazy(() => import('../pages/PlacementTest'));
const LevelUpTest = lazy(() => import('../pages/LevelUpTest'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const ModeratorDashboard = lazy(() => import('../pages/ModeratorDashboard'));
const Chat = lazy(() => import('../pages/Chat/ChatPage'));
const ChatRoom = lazy(() => import('../pages/Chat/ChatRoomPage'));
const UpgradePage = lazy(() => import('../pages/Upgrade'));
const PlayLayout = lazy(() => import('../pages/Play/PlayLayout'));
const PlayHub = lazy(() => import('../pages/Play/PlayHub'));
const PlayLeaderboard = lazy(() => import('../pages/Play/PlayLeaderboard'));
const PlayAchievements = lazy(() => import('../pages/Play/PlayAchievements'));
const PlayGuide = lazy(() => import('../pages/Play/PlayGuide'));
const PlayDailyChallenge = lazy(() => import('../pages/Play/PlayDailyChallenge'));
const PlayPvpLobby = lazy(() => import('../pages/Play/PlayPvpLobby'));
const PlayShop = lazy(() => import('../pages/Play/PlayShop'));
const KanaMatchGame = lazy(() => import('../pages/Play/KanaMatchGame'));
const KanjiMemoryGame = lazy(() => import('../pages/Play/KanjiMemoryGame'));
const LearnLayout = lazy(() => import('../pages/Learn/LearnLayout'));
const LearnIndex = lazy(() => import('../pages/Learn/LearnIndex'));
const LearnLesson = lazy(() => import('../pages/Learn/LearnLesson'));
const AccountPage = lazy(() => import('../pages/Account'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

function AppRoutes() {
  return (
    <Suspense fallback={<div className="app-loading">Đang tải...</div>}>
      <Routes>
        <Route path={ROUTES.HOME} element={<Homepage />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.PLACEMENT_TEST}
          element={
            <PrivateRoute>
              <PlacementTest />
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.LEVEL_UP_TEST}
          element={
            <PrivateRoute>
              <LevelUpTest />
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN}
          element={
            <PrivateRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.MODERATOR}
          element={
            <PrivateRoute>
              <ModeratorRoute>
                <ModeratorDashboard />
              </ModeratorRoute>
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.CHAT}
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/room/:roomId"
          element={
            <PrivateRoute>
              <ChatRoom />
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.UPGRADE}
          element={
            <PrivateRoute>
              <UpgradePage />
            </PrivateRoute>
          }
        />
        <Route
          path={ROUTES.PLAY}
          element={
            <PrivateRoute>
              <PlayLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<PlayHub />} />
          <Route path="guide" element={<PlayGuide />} />
          <Route path="daily" element={<PlayDailyChallenge />} />
          <Route path="pvp" element={<PlayPvpLobby />} />
          <Route path="leaderboard" element={<PlayLeaderboard />} />
          <Route path="achievements" element={<PlayAchievements />} />
          <Route path="shop" element={<PlayShop />} />
          <Route path="kanji-memory" element={<KanjiMemoryGame />} />
          <Route path=":gameSlug" element={<KanaMatchGame />} />
        </Route>
        <Route
          path={ROUTES.LEARN}
          element={
            <PrivateRoute>
              <LearnLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<LearnIndex />} />
          <Route path=":slug" element={<LearnLesson />} />
        </Route>
        <Route
          path={ROUTES.ACCOUNT}
          element={
            <PrivateRoute>
              <AccountPage />
            </PrivateRoute>
          }
        />
        <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}

export { AppRoutes };
