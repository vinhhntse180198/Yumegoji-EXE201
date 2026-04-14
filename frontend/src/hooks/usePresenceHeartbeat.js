import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { socialService } from '../services/socialService';

const INTERVAL_MS = 45_000;

/**
 * Gửi trạng thái online lên server để bạn bè thấy chấm xanh / IsOnline.
 * Backend: POST /api/Social/presence
 */
export function usePresenceHeartbeat() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;

    async function ping(status) {
      if (cancelled) return;
      try {
        await socialService.updatePresence(status);
      } catch {
        // bỏ qua — mạng/API lỗi không chặn UI
      }
    }

    void ping('online');

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void ping('online');
    }, INTERVAL_MS);

    function onVisibility() {
      if (document.visibilityState === 'visible') void ping('online');
    }
    document.addEventListener('visibilitychange', onVisibility);

    function onPageHide() {
      void ping('offline');
    }
    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      void ping('offline');
    };
  }, [isAuthenticated]);
}
