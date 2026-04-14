import { useMemo } from 'react';
import { authService } from '../services/authService';

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * ID người dùng đăng nhập — dùng cho chat / kết bạn.
 * JWT (`sub`) phải khớp với Bearer token axios; nếu React `user` còn stale (tab khác đổi tài khoản),
 * ưu tiên JWT để `message.userId === myId` khớp với cách backend lưu tin.
 */
export function useCurrentUserId(user) {
  return useMemo(() => {
    const fromJwt = authService.getJwtUserId();
    const fromUser = toNum(user?.id ?? user?.userId ?? user?.Id ?? user?.UserId);

    if (fromJwt != null && fromUser != null && fromJwt !== fromUser) {
      return fromJwt;
    }
    if (fromJwt != null) return fromJwt;
    if (fromUser != null) return fromUser;
    return authService.getEffectiveUserId();
  }, [user]);
}
