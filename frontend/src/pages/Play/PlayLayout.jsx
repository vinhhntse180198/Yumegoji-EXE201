import { Outlet, useLocation } from 'react-router-dom';
import '../../styles/pages/play-games.css';
import PlayExpBar from './PlayExpBar';

const PLAY_HUBISH = new Set(['guide', 'daily', 'pvp', 'leaderboard', 'achievements', 'kanji-memory', 'shop']);

function showSessionExpBar(pathname) {
  const norm = pathname.replace(/\/+$/, '') || '/';
  if (norm === '/play') return false;
  const parts = norm.split('/').filter(Boolean);
  if (parts[0] !== 'play' || parts.length < 2) return false;
  return !PLAY_HUBISH.has(parts[1]);
}

export default function PlayLayout() {
  const { pathname } = useLocation();
  const hubHome = /^\/play\/?$/.test(pathname);
  const showExp = showSessionExpBar(pathname);

  return (
    <div className={`page page-play yume-page play-layout${hubHome ? ' play-layout--hub' : ''}`}>
      {showExp ? <PlayExpBar /> : null}
      <Outlet />
    </div>
  );
}
