import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './authContext';

function readUserFromStorage() {
  if (!authService.getStoredToken()) return null;
  return authService.getStoredUser() ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUserFromStorage);
  const [loading, setLoading] = useState(false);
  const [needsPlacementTest, setNeedsPlacementTest] = useState(
    () => authService.getNeedsPlacementTest?.() ?? false,
  );

  const checkAuth = useCallback(() => {
    if (!authService.getStoredToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(authService.getStoredUser());
    setLoading(false);
  }, []);

  /** Tab khác đăng nhập/đăng xuất (cùng origin) — đồng bộ user/token để chat không lệch định danh. */
  useEffect(() => {
    function onStorage(e) {
      if (e.storageArea !== localStorage) return;
      const key = e.key;
      if (key === null || key === 'app_token' || key === 'app_user') {
        checkAuth();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [checkAuth]);

  /** Sau khi kết thúc phiên game — làm mới xu/EXP trong nav (VIP, v.v.) từ API. */
  useEffect(() => {
    function onPlayProgressRefresh() {
      const id = authService.getEffectiveUserId();
      if (id == null) return;
      void authService
        .getUserById(id)
        .then((u) => {
          if (u) setUser(u);
        })
        .catch(() => {});
    }
    window.addEventListener('yume-play-exp-refresh', onPlayProgressRefresh);
    return () => window.removeEventListener('yume-play-exp-refresh', onPlayProgressRefresh);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user || authService.getStoredUser());
    if (typeof data?.needsPlacementTest === 'boolean') {
      setNeedsPlacementTest(!!data.needsPlacementTest);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setNeedsPlacementTest(false);
  }, []);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
    needsPlacementTest,
    setNeedsPlacementTest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
