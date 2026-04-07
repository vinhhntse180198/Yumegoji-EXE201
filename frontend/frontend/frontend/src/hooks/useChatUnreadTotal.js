import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../features/chat/services/chatService';

/** Đồng bộ với bump inbox trong chat (ChatShellContext). */
export const CHAT_INBOX_REVISED_EVENT = 'moji-chat-inbox-revised';

export function notifyChatInboxRevised() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_INBOX_REVISED_EVENT));
  }
}

/**
 * Tổng unread trên tất cả phòng (GET /api/Chat/rooms) — dùng badge trên nav "Chat".
 */
export function useChatUnreadTotal(enabled) {
  const [total, setTotal] = useState(0);
  /** Danh sách phòng lần fetch gần nhất — dùng trừ unread phòng đang mở trên nav. */
  const [rooms, setRooms] = useState([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTotal(0);
      setRooms([]);
      return;
    }
    try {
      const list = await chatService.getMyRooms({ limit: 100 });
      const arr = Array.isArray(list) ? list : [];
      const sum = arr.reduce(
        (acc, r) => acc + (Number(r.unreadCount ?? r.UnreadCount ?? 0) || 0),
        0
      );
      setTotal(sum);
      setRooms(arr);
    } catch {
      setTotal(0);
      setRooms([]);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const onFocus = () => void refresh();
    const onEvt = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(CHAT_INBOX_REVISED_EVENT, onEvt);
    const id = window.setInterval(() => void refresh(), 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CHAT_INBOX_REVISED_EVENT, onEvt);
      window.clearInterval(id);
    };
  }, [enabled, refresh]);

  return { total, rooms, refresh };
}
