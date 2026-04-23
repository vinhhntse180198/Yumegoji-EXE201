import { useCallback, useMemo, useState } from 'react';
import { ChatShellContext } from './chatShellContext';
import { notifyChatInboxRevised } from '../hooks/useChatUnreadTotal';

export function ChatShellProvider({ children }) {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [roomSummary, setRoomSummary] = useState(null);
  /**
   * Đồng bộ chấm online sidebar với header khi đang mở chat riêng: presence phòng (GET …/presence) có thể khớp trước GET /friends (poll 45s).
   * { peerUserId, online: true | false | null } — null = chưa biết, không ghi đè danh sách bạn bè.
   */
  const [directRoomPresence, setDirectRoomPresence] = useState(null);
  /** Tăng sau khi POST read — sidebar (YumeChatLayout) refetch GET /rooms để cập nhật badge chưa đọc. */
  const [inboxRevision, setInboxRevision] = useState(0);
  const bumpInboxRevision = useCallback(() => {
    setInboxRevision((n) => n + 1);
    notifyChatInboxRevised();
  }, []);

  /** Tăng khi presence phòng đổi — refetch GET /friends để chấm xanh Bạn bè khớp header (không chỉ dựa poll 45s). */
  const [friendsRevision, setFriendsRevision] = useState(0);
  const bumpFriendsRevision = useCallback(() => {
    setFriendsRevision((n) => n + 1);
  }, []);

  const closeRightPanel = useCallback(() => setRightPanelOpen(false), []);

  const value = useMemo(
    () => ({
      rightPanelOpen,
      setRightPanelOpen,
      closeRightPanel,
      roomSummary,
      setRoomSummary,
      directRoomPresence,
      setDirectRoomPresence,
      inboxRevision,
      bumpInboxRevision,
      friendsRevision,
      bumpFriendsRevision,
    }),
    [
      rightPanelOpen,
      closeRightPanel,
      roomSummary,
      directRoomPresence,
      inboxRevision,
      bumpInboxRevision,
      friendsRevision,
      bumpFriendsRevision,
    ]
  );

  return <ChatShellContext.Provider value={value}>{children}</ChatShellContext.Provider>;
}
