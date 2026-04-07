import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useCurrentUserId } from '../../../hooks/useCurrentUserId';
import { useTheme } from '../../../context/ThemeContext';
import { ROUTES } from '../../../constants/routes';
import { notifyChatInboxRevised } from '../../../hooks/useChatUnreadTotal';
import { chatService } from '../services/chatService';
import { socialService } from '../../../services/socialService';
import { ChatShellProvider, useChatShell } from '../context/ChatShellContext';
import yumeLogo from '../../../assets/yume-logo.png';

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return ['?', '?', '?'];
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return [parts[0][0], parts[1][0], parts[2][0]].map((c) => c.toUpperCase());
  }
  if (parts.length === 2) {
    return [parts[0][0], parts[1][0]].map((c) => c.toUpperCase());
  }
  const w = parts[0] || 'A';
  return [w[0], w[w.length - 1] || w[0]].map((c) => c.toUpperCase());
}

function formatRelativeShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(diff / 60000);
  if (mins >= 1) return `${mins}m`;
  return 'mới';
}

/** Khớp backend OnlinePresenceRules.StaleAfterSeconds — chỉ online khi vừa có heartbeat gần đây. */
const PRESENCE_TTL_MS = 120_000;

function isPresenceOnline(row) {
  const raw = row?.isOnline ?? row?.IsOnline;
  const st = String(row?.presenceStatus ?? row?.PresenceStatus ?? '').toLowerCase();
  if (raw === true || st === 'online') return true;
  if (raw === false || st === 'offline' || st === 'away') return false;
  const lastSeen = row?.lastSeenAt ?? row?.LastSeenAt;
  const t = lastSeen ? new Date(lastSeen).getTime() : NaN;
  return Number.isFinite(t) && Date.now() - t <= PRESENCE_TTL_MS;
}

function IconUserPlus({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconUsersGroupPlus({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconSearch({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const DEMO_GROUPS_VISUAL = [
  {
    id: 'demo-g1',
    name: 'Nhóm ABC',
    memberCount: 3,
    initials: ['H', 'B', 'P'],
    timeLabel: '9d',
    isPlaceholder: true,
  },
  {
    id: 'demo-g2',
    name: 'Nhóm XYZ',
    memberCount: 5,
    initials: ['X', 'Y', 'Z'],
    timeLabel: '2d',
    isPlaceholder: true,
  },
];

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string | number | null} [props.selectedRoomId]
 */
export function MojiChatLayout({ children, selectedRoomId = null }) {
  return (
    <ChatShellProvider>
      <MojiChatLayoutInner selectedRoomId={selectedRoomId}>{children}</MojiChatLayoutInner>
    </ChatShellProvider>
  );
}

function MojiChatLayoutInner({ children, selectedRoomId = null }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    rightPanelOpen,
    setRightPanelOpen,
    closeRightPanel,
    roomSummary,
    inboxRevision,
    bumpInboxRevision,
    directRoomPresence,
    friendsRevision,
  } = useChatShell();

  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [navMode, setNavMode] = useState('messages');
  const [listSearch, setListSearch] = useState('');
  const [inboxTab, setInboxTab] = useState('all');

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState('');

  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [friendModalStep, setFriendModalStep] = useState('search');
  const [friendPick, setFriendPick] = useState(null);
  const [friendIntroText, setFriendIntroText] = useState('Chào bạn ~ Có thể kết bạn được không?..');
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendBusyId, setFriendBusyId] = useState(null);
  const [friendToast, setFriendToast] = useState('');
  const [sidebarNotice, setSidebarNotice] = useState('');
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(null);
  const [requestActionId, setRequestActionId] = useState(null);
  const [invitesModalOpen, setInvitesModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState('received');
  const [groupMemberQuery, setGroupMemberQuery] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [sidebarRoomMenuId, setSidebarRoomMenuId] = useState(null);
  const [sidebarBusyRoomId, setSidebarBusyRoomId] = useState(null);
  const sidebarListRef = useRef(null);
  const prevSelectedRoomIdRef = useRef(null);

  const displayName = user?.displayName || user?.username || user?.name || user?.email || 'Bạn';
  const handle = user?.username || user?.email?.split('@')[0] || 'user';
  const avatarLetter = (displayName || 'U').slice(0, 1).toUpperCase();
  const myId = useCurrentUserId(user);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const my = await chatService.getMyRooms({ limit: 50 });
      setRooms(safeArray(my));
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setFriendsLoading(true);
    try {
      const list = await socialService.getFriends();
      setFriends(safeArray(list));
    } catch {
      if (!silent) setFriends([]);
    } finally {
      if (!silent) setFriendsLoading(false);
    }
  }, []);

  const loadIncomingRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const list = await socialService.getIncomingFriendRequests();
      const arr = safeArray(list);
      const pending = arr.filter((r) => {
        const s = String(r.status ?? r.Status ?? 'pending').toLowerCase();
        return s === 'pending' || s === '';
      });
      setIncomingRequests(pending);
    } catch (err) {
      setIncomingRequests([]);
      const noResponse = !err?.response && err?.request;
      const msg =
        err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || noResponse
          ? 'Không kết nối được API (kiểm tra backend đã bật và VITE_API_URL / proxy).'
          : err?.response?.data?.message || err?.message || 'Không tải được lời mời kết bạn.';
      setRequestsError(msg);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadOutgoingRequests = useCallback(async () => {
    try {
      const list = await socialService.getOutgoingFriendRequests();
      setOutgoingRequests(safeArray(list));
    } catch {
      setOutgoingRequests([]);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!inboxRevision) return;
    loadRooms();
  }, [inboxRevision, loadRooms]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (selectedRoomId == null || String(selectedRoomId).startsWith('demo-')) return;
    void loadFriends({ silent: true });
  }, [selectedRoomId, loadFriends]);

  /** Sau khi presence phòng đổi (ChatRoomPage) — cập nhật chấm xanh danh sách bạn bè. */
  useEffect(() => {
    const fr = friendsRevision ?? 0;
    if (fr < 1) return;
    void loadFriends({ silent: true });
  }, [friendsRevision, loadFriends]);

  /** Làm mới IsOnline của bạn bè (sau khi họ gửi heartbeat). */
  useEffect(() => {
    const t = window.setInterval(() => {
      void loadFriends({ silent: true });
    }, 45_000);
    return () => window.clearInterval(t);
  }, [loadFriends]);

  useEffect(() => {
    loadIncomingRequests();
  }, [loadIncomingRequests]);

  useEffect(() => {
    void loadOutgoingRequests();
  }, [loadOutgoingRequests]);

  useEffect(() => {
    if (!invitesModalOpen) return;
    void loadIncomingRequests();
    void loadOutgoingRequests();
  }, [invitesModalOpen, loadIncomingRequests, loadOutgoingRequests]);

  useEffect(() => {
    if (!groupModalOpen) return;
    void loadFriends();
  }, [groupModalOpen, loadFriends]);

  useEffect(() => {
    closeRightPanel();
  }, [selectedRoomId, closeRightPanel]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    function onDocMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [userMenuOpen]);

  useEffect(() => {
    if (sidebarRoomMenuId == null) return undefined;
    function onDocDown(e) {
      if (sidebarListRef.current && !sidebarListRef.current.contains(e.target)) {
        setSidebarRoomMenuId(null);
      }
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [sidebarRoomMenuId]);

  useEffect(() => {
    const prev = prevSelectedRoomIdRef.current;
    const cur = selectedRoomId;
    const switched = prev != null && cur != null && String(prev) !== String(cur);
    if (!switched) {
      prevSelectedRoomIdRef.current = cur ?? null;
      return;
    }

    setRooms((old) =>
      old.map((r) =>
        String(r?.id ?? r?.Id) === String(prev)
          ? { ...r, unreadCount: 0, UnreadCount: 0 }
          : r
      )
    );

    void chatService
      .markRoomRead(prev, null)
      .then(() => {
        bumpInboxRevision?.();
        notifyChatInboxRevised();
        return loadRooms();
      })
      .catch(() => {});

    prevSelectedRoomIdRef.current = cur ?? null;
  }, [selectedRoomId, loadRooms, bumpInboxRevision]);

  const friendOnlineByUserId = useMemo(() => {
    const map = new Map();
    for (const row of friends) {
      const f = row.friend ?? row.Friend;
      const uid = Number(f?.id ?? f?.Id ?? 0);
      if (!uid) continue;
      const online = isPresenceOnline(row);
      map.set(uid, online);
    }
    return map;
  }, [friends]);

  const effectiveFriendOnlineByUserId = useMemo(() => {
    const m = new Map(friendOnlineByUserId);
    const p = directRoomPresence;
    if (p?.peerUserId == null) return m;
    const id = Number(p.peerUserId);
    if (!id) return m;
    if (p.online === true) m.set(id, true);
    else if (p.online === false) m.set(id, false);
    return m;
  }, [friendOnlineByUserId, directRoomPresence]);

  const conversationRows = useMemo(() => {
    const fromApi = rooms.map((r) => {
      const peer = r.peerUser ?? r.PeerUser;
      const rawType = String(r.type || r.Type || '').toLowerCase();
      const isDirect = rawType === 'private';
      const peerUserId = Number(peer?.id ?? peer?.Id ?? 0) || null;
      const peerOnlineFromRoom = Boolean(peer?.isOnline ?? peer?.IsOnline ?? false);
      const isOnline =
        isDirect && peerUserId
          ? Boolean(effectiveFriendOnlineByUserId.get(peerUserId)) || peerOnlineFromRoom
          : false;
      const name =
        isDirect && peer
          ? peer.displayName || peer.DisplayName || peer.username || peer.Username || 'Chat riêng'
          : r.name || r.Name || 'Phòng chat';
      const ini = initialsFromName(name);
      while (ini.length < 3) ini.push('•');
      const last = r.lastMessage ?? r.LastMessage;
      const lastAt = last?.createdAt ?? last?.CreatedAt ?? r.updatedAt ?? r.UpdatedAt ?? r.createdAt ?? r.CreatedAt;
      const lastAtMs = lastAt ? new Date(lastAt).getTime() : 0;
      const unreadCount = Number(r.unreadCount ?? r.UnreadCount ?? 0) || 0;
      const snippet = last?.content ?? last?.Content;
      return {
        id: r.id ?? r.Id,
        name,
        memberCount: r.memberCount ?? r.membersCount ?? r.MembersCount ?? '—',
        initials: ini.slice(0, 3),
        timeLabel: formatRelativeShort(lastAt),
        snippet: snippet ? String(snippet).slice(0, 56) : null,
        isPlaceholder: false,
        isDirect,
        isOnline,
        peerUserId,
        roomType: rawType,
        myRole: r.myRole ?? r.MyRole,
        createdBy: r.createdBy ?? r.CreatedBy,
        unreadCount,
        lastAtMs,
      };
    });
    return fromApi.sort((a, b) => b.lastAtMs - a.lastAtMs);
  }, [rooms, effectiveFriendOnlineByUserId]);

  const visibleConversations = useMemo(() => {
    let rows = conversationRows;
    const q = listSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.name).toLowerCase().includes(q) ||
          (r.snippet && String(r.snippet).toLowerCase().includes(q))
      );
    }
    if (inboxTab === 'unread') {
      rows = rows.filter((r) => r.unreadCount > 0);
    }
    return rows;
  }, [conversationRows, listSearch, inboxTab]);

  const groupChats = useMemo(() => visibleConversations.filter((g) => !g.isDirect), [visibleConversations]);
  const directChats = useMemo(() => visibleConversations.filter((g) => g.isDirect), [visibleConversations]);

  const pendingOutgoingRequests = useMemo(() => {
    return outgoingRequests.filter((r) => {
      const s = String(r.status ?? r.Status ?? 'pending').toLowerCase();
      return s === 'pending' || s === '';
    });
  }, [outgoingRequests]);

  const friendRows = useMemo(() => {
    return friends.map((row) => {
      const f = row.friend ?? row.Friend;
      const uid = f?.id ?? f?.Id;
      const friendshipId = row.friendshipId ?? row.FriendshipId ?? uid;
      const uname = f?.username ?? f?.Username ?? '';
      const dname = f?.displayName ?? f?.DisplayName ?? uname;
      const uidNum = Number(uid) || 0;
      const online = uidNum ? Boolean(effectiveFriendOnlineByUserId.get(uidNum)) : isPresenceOnline(row);
      const lastSeen = row.lastSeenAt ?? row.LastSeenAt;
      return {
        key: friendshipId,
        id: uid,
        name: dname || uname || `User ${uid}`,
        username: uname,
        online,
        timeLabel: online ? 'online' : formatRelativeShort(lastSeen),
        snippet: online ? 'Đang hoạt động' : 'Offline',
      };
    });
  }, [friends, effectiveFriendOnlineByUserId]);

  const friendsForGroupPick = useMemo(() => {
    const q = groupMemberQuery.trim().toLowerCase();
    if (!q) return friendRows;
    return friendRows.filter(
      (f) => f.name.toLowerCase().includes(q) || String(f.username || '').toLowerCase().includes(q)
    );
  }, [friendRows, groupMemberQuery]);

  function goRoom(roomId) {
    if (roomId == null || String(roomId).startsWith('demo-')) return;
    navigate(`/chat/room/${roomId}`);
  }

  function handleCreateChat() {
    navigate(ROUTES.CHAT);
  }

  function openGroupModal() {
    setGroupError('');
    setGroupMemberQuery('');
    setGroupMemberIds([]);
    setGroupModalOpen(true);
  }

  function toggleGroupMember(uid) {
    if (uid == null || uid === '') return;
    const n = Number(uid);
    if (Number.isNaN(n)) return;
    setGroupMemberIds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) {
      setGroupError('Nhập tên nhóm.');
      return;
    }
    setGroupSaving(true);
    setGroupError('');
    try {
      const room = await chatService.createRoom({
        name,
        type: 'group',
        maxMembers: 50,
        initialMemberIds: groupMemberIds.length > 0 ? groupMemberIds : undefined,
      });
      const rid = room?.id ?? room?.Id;
      setGroupModalOpen(false);
      setGroupName('');
      setGroupMemberIds([]);
      setGroupMemberQuery('');
      await loadRooms();
      if (rid != null) navigate(`/chat/room/${rid}`);
    } catch (err) {
      setGroupError(err?.response?.data?.message || err?.message || 'Không tạo được nhóm.');
    } finally {
      setGroupSaving(false);
    }
  }

  function openFriendModal() {
    setFriendModalStep('search');
    setFriendPick(null);
    setFriendIntroText('Chào bạn ~ Có thể kết bạn được không?..');
    setFriendToast('');
    setFriendResults([]);
    setFriendQuery('');
    setFriendModalOpen(true);
  }

  function closeInvitesModal() {
    setInvitesModalOpen(false);
  }

  function closeFriendModal() {
    setFriendModalOpen(false);
    setFriendModalStep('search');
    setFriendPick(null);
    setFriendToast('');
    setFriendResults([]);
  }

  useEffect(() => {
    if (!sidebarNotice) return undefined;
    const t = window.setTimeout(() => setSidebarNotice(''), 4000);
    return () => window.clearTimeout(t);
  }, [sidebarNotice]);

  function selectUserForFriendStep(u) {
    const id = u?.id ?? u?.Id;
    if (id == null) return;
    if (myId != null && String(id) === String(myId)) return;
    const un = u?.username ?? u?.Username ?? '';
    const dn = u?.displayName ?? u?.DisplayName ?? un;
    setFriendPick({ id, username: un, displayName: dn });
    setFriendModalStep('confirm');
    setFriendToast('');
  }

  async function searchFriends() {
    const q = friendQuery.trim();
    if (q.length < 1) {
      setFriendResults([]);
      setFriendToast('');
      return;
    }
    setFriendSearching(true);
    setFriendToast('');
    try {
      const hits = safeArray(await socialService.searchUsers(q, 15));
      setFriendResults(hits);
      if (hits.length === 1) {
        selectUserForFriendStep(hits[0]);
      } else {
        setFriendModalStep('search');
        setFriendPick(null);
      }
    } catch {
      setFriendResults([]);
    } finally {
      setFriendSearching(false);
    }
  }

  async function sendRequestToUser(targetId) {
    if (targetId == null || (myId != null && String(targetId) === String(myId))) return;
    setFriendBusyId(targetId);
    setFriendToast('');
    try {
      await socialService.sendFriendRequest(targetId);
      closeFriendModal();
      setSidebarNotice('Đã gửi lời mời kết bạn.');
      void loadOutgoingRequests();
    } catch (err) {
      setFriendToast(err?.response?.data?.message || err?.message || 'Không gửi được lời mời.');
    } finally {
      setFriendBusyId(null);
    }
  }

  async function acceptRequest(requestId) {
    if (requestId == null) return;
    setRequestActionId(requestId);
    try {
      await socialService.acceptFriendRequest(requestId);
      await Promise.all([loadFriends(), loadIncomingRequests(), loadOutgoingRequests()]);
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Không chấp nhận được.');
    } finally {
      setRequestActionId(null);
    }
  }

  async function rejectRequest(requestId) {
    if (requestId == null) return;
    setRequestActionId(requestId);
    try {
      await socialService.rejectFriendRequest(requestId);
      await Promise.all([loadIncomingRequests(), loadOutgoingRequests()]);
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Không từ chối được.');
    } finally {
      setRequestActionId(null);
    }
  }

  async function cancelOutgoingRequest(requestId) {
    if (requestId == null) return;
    setRequestActionId(requestId);
    try {
      await socialService.cancelFriendRequest(requestId);
      await loadOutgoingRequests();
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Không thu hồi được lời mời.');
    } finally {
      setRequestActionId(null);
    }
  }

  async function openDirectChat(peerUserId) {
    if (peerUserId == null) return;
    try {
      const room = await chatService.getOrCreateDirect(peerUserId);
      const rid = room?.id ?? room?.Id;
      if (rid != null) {
        closeFriendModal();
        setNavMode('messages');
        navigate(`/chat/room/${rid}`);
      }
    } catch (err) {
      setFriendToast(err?.response?.data?.message || err?.message || 'Không mở được chat riêng.');
    }
  }

  function leaveLabelForRoomType(rt) {
    const t = String(rt || '').toLowerCase();
    if (t === 'private') return 'Rời cuộc trò chuyện';
    if (t === 'group') return 'Rời nhóm';
    return 'Rời phòng';
  }

  async function handleSidebarLeaveRoom(roomId, g) {
    if (roomId == null || g?.isPlaceholder) return;
    const isPrivate = String(g.roomType || '').toLowerCase() === 'private';
    const msg = isPrivate
      ? 'Rời cuộc trò chuyện này? Bạn có thể mở lại sau.'
      : 'Rời phòng / nhóm? Với phòng công khai bạn có thể tham gia lại bất cứ lúc nào.';
    if (!window.confirm(msg)) return;
    setSidebarBusyRoomId(roomId);
    setSidebarRoomMenuId(null);
    try {
      await chatService.leaveRoom(roomId);
      await loadRooms();
      notifyChatInboxRevised();
      if (selectedRoomId != null && String(selectedRoomId) === String(roomId)) {
        navigate(ROUTES.CHAT);
      }
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Không rời được phòng.');
    } finally {
      setSidebarBusyRoomId(null);
    }
  }

  async function handleSidebarDeleteGroup(roomId) {
    if (roomId == null) return;
    if (!window.confirm('Xóa nhóm cho tất cả thành viên? Hành động này không hoàn tác.')) return;
    setSidebarBusyRoomId(roomId);
    setSidebarRoomMenuId(null);
    try {
      await chatService.deleteRoom(roomId);
      await loadRooms();
      notifyChatInboxRevised();
      if (selectedRoomId != null && String(selectedRoomId) === String(roomId)) {
        navigate(ROUTES.CHAT);
      }
    } catch (err) {
      window.alert(
        err?.response?.data?.message ||
          err?.message ||
          (err?.response?.status === 403
            ? 'Chỉ admin hoặc người tạo nhóm mới có thể xóa nhóm.'
            : 'Không xóa được nhóm.')
      );
    } finally {
      setSidebarBusyRoomId(null);
    }
  }

  function renderConvListItems(rows, { showMenu = false } = {}) {
    return rows.map((g) => {
      const active = selectedRoomId != null && String(selectedRoomId) === String(g.id);
      const useMenu = showMenu && !g.isPlaceholder;
      const busy = sidebarBusyRoomId != null && String(sidebarBusyRoomId) === String(g.id);
      const menuOpen = useMenu && sidebarRoomMenuId != null && String(sidebarRoomMenuId) === String(g.id);
      const rowBtn = (
        <button
          type="button"
          className={`moji-chat__conv-row ${g.isDirect ? 'moji-chat__conv-row--direct' : ''} ${active ? 'moji-chat__conv-row--active' : ''}`}
          onClick={() => goRoom(g.id)}
          disabled={g.isPlaceholder}
          title={g.isPlaceholder ? 'Tham gia phòng từ server để mở chat' : undefined}
        >
          <div className={g.isDirect ? 'moji-chat__avatar-stack moji-chat__avatar-stack--single' : 'moji-chat__avatar-stack'} aria-hidden>
            {g.isDirect ? (
              <>
                <span className="moji-chat__avatar-ring">{g.initials[0]}</span>
                {g.isOnline ? <span className="moji-chat__avatar-online-dot" title="Đang hoạt động" /> : null}
              </>
            ) : (
              g.initials.slice(0, 3).map((ch, i) => (
                <span key={`${g.id}-av-${i}`} className="moji-chat__avatar-ring">
                  {ch}
                </span>
              ))
            )}
          </div>
          <div className="moji-chat__conv-body">
            <div className="moji-chat__conv-title-row">
              <span className="moji-chat__conv-name">{g.name}</span>
              <span className="moji-chat__conv-time">{g.timeLabel}</span>
            </div>
            <div className="moji-chat__conv-snippet-row">
              <span className="moji-chat__conv-snippet">
                {g.snippet ||
                  (typeof g.memberCount === 'number' ? `${g.memberCount} thành viên` : `${g.memberCount ?? '—'} thành viên`)}
              </span>
              {g.unreadCount > 0 && (
                <span className="moji-chat__conv-unread" title={`${g.unreadCount} chưa đọc`}>
                  {g.unreadCount > 99 ? '99+' : g.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      );

      return (
        <li key={g.id}>
          {useMenu ? (
            <div className="moji-chat__conv-li-inner">
              {rowBtn}
              <div className="moji-chat__conv-menu-wrap">
                <button
                  type="button"
                  className={`moji-chat__conv-menu-trigger ${menuOpen ? 'moji-chat__conv-menu-trigger--open' : ''}`}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label={`Tùy chọn ${g.name}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSidebarRoomMenuId((prev) => (prev === g.id ? null : g.id));
                  }}
                >
                  ⋮
                </button>
                {menuOpen ? (
                  <div className="moji-chat__conv-menu-dropdown" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="moji-chat__room-menu-item"
                      onClick={() => void handleSidebarLeaveRoom(g.id, g)}
                    >
                      {leaveLabelForRoomType(g.roomType)}
                    </button>
                    {g.roomType === 'group' ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="moji-chat__room-menu-item moji-chat__room-menu-item--danger"
                        onClick={() => void handleSidebarDeleteGroup(g.id)}
                      >
                        Xóa nhóm
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            rowBtn
          )}
        </li>
      );
    });
  }

  return (
    <div className="moji-chat">
      <nav className="moji-chat__nav-rail" aria-label="Menu điều hướng">
        <button
          type="button"
          className="moji-chat__nav-rail-btn moji-chat__nav-rail-btn--avatar"
          title="Tài khoản"
          onClick={() => setUserMenuOpen((o) => !o)}
        >
          <span className="moji-chat__nav-rail-avatar">{avatarLetter}</span>
        </button>

        <button
          type="button"
          className={`moji-chat__nav-rail-btn ${navMode === 'messages' ? 'moji-chat__nav-rail-btn--active' : ''}`}
          title="Tin nhắn"
          aria-current={navMode === 'messages' ? 'page' : undefined}
          onClick={() => setNavMode('messages')}
        >
          <span className="moji-chat__nav-rail-ico" aria-hidden>
            💬
          </span>
        </button>
        <button
          type="button"
          className={`moji-chat__nav-rail-btn ${navMode === 'contacts' ? 'moji-chat__nav-rail-btn--active' : ''}`}
          title="Danh bạ"
          onClick={() => setNavMode('contacts')}
        >
          <span className="moji-chat__nav-rail-ico" aria-hidden>
            👤
          </span>
        </button>
        <button
          type="button"
          className={`moji-chat__nav-rail-btn ${navMode === 'tasks' ? 'moji-chat__nav-rail-btn--active' : ''}`}
          title="Việc cần làm"
          onClick={() => setNavMode('tasks')}
        >
          <span className="moji-chat__nav-rail-ico" aria-hidden>
            ✓
          </span>
        </button>

        <div className="moji-chat__nav-rail-spacer" aria-hidden />

        <button
          type="button"
          className="moji-chat__nav-rail-btn"
          title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          onClick={toggleTheme}
        >
          <span className="moji-chat__nav-rail-ico" aria-hidden>
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
        <div className="moji-chat__nav-rail-foot" ref={menuRef}>
          <button
            type="button"
            className="moji-chat__nav-rail-btn"
            title="Cài đặt"
            onClick={() => setUserMenuOpen((o) => !o)}
          >
            <span className="moji-chat__nav-rail-ico" aria-hidden>
              ⚙️
            </span>
          </button>
          {userMenuOpen && (
            <div className="moji-chat__user-menu moji-chat__user-menu--rail" role="menu">
              <div className="moji-chat__user-menu-head">
                <span className="moji-chat__user-avatar">{avatarLetter}</span>
                <div>
                  <div className="moji-chat__user-name">{displayName}</div>
                  <div className="moji-chat__user-handle">@{handle}</div>
                </div>
              </div>
              <button type="button" className="moji-chat__user-menu-item" role="menuitem">
                <span className="moji-chat__menu-ico" aria-hidden>
                  👤
                </span>
                Tài khoản
              </button>
              <button
                type="button"
                className="moji-chat__user-menu-item"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  setNavMode('messages');
                  setInvitesModalOpen(true);
                }}
              >
                <span className="moji-chat__menu-ico" aria-hidden>
                  🔔
                </span>
                Lời mời kết bạn
                {incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}
              </button>
              <button
                type="button"
                className="moji-chat__user-menu-item moji-chat__user-menu-item--danger"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                  navigate(ROUTES.LOGIN);
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </nav>

      <aside className="moji-chat__list-panel" aria-label="Danh sách hội thoại">
        {navMode === 'messages' && (
          <>
            <div className="moji-chat__list-panel-head moji-chat__list-panel-head--brand">
              <div className="moji-chat__list-brand-row">
                <img src={yumeLogo} alt="" className="moji-chat__list-brand-logo" width={40} height={40} />
                <div className="moji-chat__list-brand-text">
                  <span className="moji-chat__list-brand">YumeGo-ji</span>
                  <span className="moji-chat__list-brand-tagline">Modern Chat Hub</span>
                </div>
              </div>
              <button
                type="button"
                className="moji-chat__theme-toggle-pill"
                title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                onClick={toggleTheme}
              >
                <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
              </button>
            </div>
            <div className="moji-chat__new-msg-wrap">
              <button type="button" className="moji-chat__btn-new-message" onClick={handleCreateChat}>
                <span className="moji-chat__btn-new-message-ico" aria-hidden>
                  💬
                </span>
                Gửi Tin Nhắn Mới
              </button>
            </div>
            {sidebarNotice ? (
              <div className="moji-chat__sidebar-notice" role="status">
                {sidebarNotice}
              </div>
            ) : null}
            <div className="moji-chat__list-search-wrap">
              <input
                type="search"
                className="moji-chat__list-search"
                placeholder="Tìm tên hoặc nội dung…"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                aria-label="Tìm hội thoại"
              />
            </div>
            <div className="moji-chat__list-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={inboxTab === 'all'}
                className={`moji-chat__list-tab ${inboxTab === 'all' ? 'moji-chat__list-tab--active' : ''}`}
                onClick={() => setInboxTab('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inboxTab === 'unread'}
                className={`moji-chat__list-tab ${inboxTab === 'unread' ? 'moji-chat__list-tab--active' : ''}`}
                onClick={() => setInboxTab('unread')}
              >
                Chưa đọc
              </button>
            </div>
            <div ref={sidebarListRef} className="moji-chat__list-scroll moji-chat__list-scroll--sections">
              {roomsLoading ? (
                <ul className="moji-chat__sidebar-skeleton" aria-hidden>
                  {[1, 2, 3, 4].map((k) => (
                    <li key={k} className="moji-chat__sidebar-skeleton-row">
                      <span className="moji-chat__sidebar-skeleton-av" />
                      <span className="moji-chat__sidebar-skeleton-text">
                        <span className="moji-chat__sidebar-skeleton-line" />
                        <span className="moji-chat__sidebar-skeleton-line moji-chat__sidebar-skeleton-line--short" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <section className="moji-chat__conv-section" aria-labelledby="moji-sec-groups">
                    <div className="moji-chat__section-head">
                      <h3 className="moji-chat__section-title" id="moji-sec-groups">
                        NHÓM CHAT
                      </h3>
                      <button
                        type="button"
                        className="moji-chat__section-icon-btn"
                        title="Tạo nhóm chat mới"
                        aria-label="Tạo nhóm chat mới"
                        onClick={openGroupModal}
                      >
                        <IconUsersGroupPlus />
                      </button>
                    </div>
                    {groupChats.length === 0 ? (
                      <p className="moji-chat__muted moji-chat__section-empty">
                        {inboxTab === 'unread' ? 'Không có nhóm chưa đọc.' : 'Chưa có nhóm chat.'}
                      </p>
                    ) : (
                      <ul className="moji-chat__conv-list">{renderConvListItems(groupChats, { showMenu: true })}</ul>
                    )}
                  </section>
                  <section className="moji-chat__conv-section" aria-labelledby="moji-sec-friends">
                    <div className="moji-chat__section-head">
                      <h3 className="moji-chat__section-title" id="moji-sec-friends">
                        BẠN BÈ
                      </h3>
                      <button
                        type="button"
                        className="moji-chat__section-icon-btn"
                        title="Lời mời kết bạn"
                        aria-label="Lời mời kết bạn"
                        onClick={() => setInvitesModalOpen(true)}
                      >
                        <IconUserPlus />
                      </button>
                    </div>
                    {directChats.length === 0 ? (
                      <p className="moji-chat__muted moji-chat__section-empty">
                        {inboxTab === 'unread' ? 'Không có chat riêng chưa đọc.' : 'Chưa có cuộc trò chuyện riêng.'}
                      </p>
                    ) : (
                      <ul className="moji-chat__conv-list">{renderConvListItems(directChats)}</ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </>
        )}

        {navMode === 'contacts' && (
          <div className="moji-chat__list-scroll moji-chat__list-scroll--contacts">
            <div className="moji-chat__list-panel-head moji-chat__list-panel-head--flat">
              <span className="moji-chat__list-brand">Danh bạ</span>
              <button type="button" className="moji-chat__list-icon-btn" title="Kết bạn" aria-label="Kết bạn" onClick={openFriendModal}>
                <IconUserPlus />
              </button>
            </div>
            <div className="moji-chat__contacts-invite-hint">
              <button
                type="button"
                className="moji-chat__contacts-invite-link"
                onClick={() => {
                  setNavMode('messages');
                  setInvitesModalOpen(true);
                }}
              >
                Lời mời kết bạn
                {incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}
              </button>
            </div>
            {friendsLoading ? (
              <p className="moji-chat__muted">Đang tải bạn bè…</p>
            ) : friendRows.length === 0 ? (
              <p className="moji-chat__muted">Chưa có bạn bè. Bấm + để tìm và gửi lời mời.</p>
            ) : (
              <ul className="moji-chat__friend-list">
                {friendRows.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      className="moji-chat__friend-card moji-chat__friend-card--action"
                      onClick={() => openDirectChat(f.id)}
                    >
                      <div className="moji-chat__friend-avatar-wrap">
                        <span className="moji-chat__friend-avatar">{f.name.slice(0, 1).toUpperCase()}</span>
                        {f.online && <span className="moji-chat__online-dot" title="Đang hoạt động" />}
                      </div>
                      <div className="moji-chat__friend-body">
                        <div className="moji-chat__friend-title-row">
                          <span className="moji-chat__friend-name">{f.name}</span>
                          <span className="moji-chat__friend-time">{f.timeLabel}</span>
                        </div>
                        <div className="moji-chat__friend-snippet">{f.snippet}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {navMode === 'tasks' && (
          <div className="moji-chat__list-placeholder">
            <p className="moji-chat__list-brand">Việc cần làm</p>
            <p className="moji-chat__muted">Tính năng đang phát triển — gắn với nhắc việc / deadline sau này.</p>
          </div>
        )}

      </aside>

      <section className="moji-chat__main">{children}</section>

      {rightPanelOpen && (
        <aside className="moji-chat__info-panel" aria-label="Thông tin hội thoại">
          <div className="moji-chat__info-panel-head">
            <h2 className="moji-chat__info-panel-title">Thông tin</h2>
            <button
              type="button"
              className="moji-chat__info-panel-close"
              aria-label="Đóng"
              onClick={() => setRightPanelOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="moji-chat__info-panel-cover">
            <div className="moji-chat__info-panel-avatar">
              {(roomSummary?.letter || roomSummary?.title || '?').toString().slice(0, 1).toUpperCase()}
            </div>
            <div className="moji-chat__info-panel-names">
              <div className="moji-chat__info-panel-name">{roomSummary?.title || `Hội thoại #${selectedRoomId}`}</div>
              <div className="moji-chat__info-panel-sub">{roomSummary?.subtitle || 'YumeGo-ji chat'}</div>
            </div>
          </div>
          <ul className="moji-chat__info-panel-sections">
            <li className="moji-chat__info-muted">Ảnh / file đã gửi — sắp có khi backend hỗ trợ.</li>
            <li className="moji-chat__info-muted">Link đã chia sẻ — sắp có.</li>
          </ul>
          <div className="moji-chat__info-panel-actions">
            <button type="button" className="moji-chat__info-action-btn" disabled>
              Ghim hội thoại
            </button>
            <button type="button" className="moji-chat__info-action-btn" disabled>
              Tắt thông báo
            </button>
          </div>
        </aside>
      )}

      {groupModalOpen && (
        <div
          className="moji-chat__modal-backdrop"
          role="presentation"
          onClick={() => !groupSaving && setGroupModalOpen(false)}
        >
          <div
            className="moji-chat__modal moji-chat__modal--group"
            role="dialog"
            aria-labelledby="moji-group-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="moji-chat__modal-head">
              <h2 id="moji-group-title" className="moji-chat__modal-title">
                Tạo Nhóm Chat Mới
              </h2>
              <button
                type="button"
                className="moji-chat__modal-x"
                aria-label="Đóng"
                disabled={groupSaving}
                onClick={() => setGroupModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <label className="moji-chat__modal-label">
                Tên nhóm
                <input
                  className="moji-chat__modal-input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Gõ tên nhóm vào đây…"
                  maxLength={120}
                  disabled={groupSaving}
                  autoComplete="off"
                />
              </label>
              <label className="moji-chat__modal-label">
                Mời thành viên
                <input
                  className="moji-chat__modal-input"
                  value={groupMemberQuery}
                  onChange={(e) => setGroupMemberQuery(e.target.value)}
                  placeholder="Tìm theo tên hiển thị…"
                  disabled={groupSaving}
                  autoComplete="off"
                />
              </label>
              <div className="moji-chat__group-member-box">
                {friendsLoading ? (
                  <p className="moji-chat__muted moji-chat__group-member-empty">Đang tải danh sách bạn…</p>
                ) : friendsForGroupPick.length === 0 ? (
                  <p className="moji-chat__muted moji-chat__group-member-empty">Chưa có bạn để mời. Hãy kết bạn trước.</p>
                ) : (
                  <ul className="moji-chat__group-member-list">
                    {friendsForGroupPick.map((f) => {
                      const uid = f.id;
                      const n = Number(uid);
                      const selected = groupMemberIds.includes(n);
                      return (
                        <li key={f.key}>
                          <button
                            type="button"
                            className={`moji-chat__group-member-row ${selected ? 'moji-chat__group-member-row--selected' : ''}`}
                            onClick={() => toggleGroupMember(uid)}
                            disabled={groupSaving}
                          >
                            <span className="moji-chat__group-member-check" aria-hidden>
                              {selected ? '✓' : ''}
                            </span>
                            <span className="moji-chat__group-member-av">{f.name.slice(0, 1).toUpperCase()}</span>
                            <span className="moji-chat__group-member-name">{f.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {groupError && <p className="moji-chat__modal-error">{groupError}</p>}
              <button
                type="submit"
                className="moji-chat__modal-btn moji-chat__modal-btn--primary moji-chat__modal-btn--block moji-chat__modal-btn--gradient"
                disabled={groupSaving}
              >
                <IconUserPlus className="moji-chat__inline-ico" />
                {groupSaving ? 'Đang tạo…' : 'Tạo nhóm'}
              </button>
            </form>
          </div>
        </div>
      )}

      {invitesModalOpen && (
        <div className="moji-chat__modal-backdrop" role="presentation" onClick={closeInvitesModal}>
          <div
            className="moji-chat__modal moji-chat__modal--invites"
            role="dialog"
            aria-labelledby="moji-invites-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="moji-chat__modal-head">
              <h2 id="moji-invites-title" className="moji-chat__modal-title">
                Lời mời kết bạn
              </h2>
              <button type="button" className="moji-chat__modal-x" aria-label="Đóng" onClick={closeInvitesModal}>
                ×
              </button>
            </div>
            <div className="moji-chat__invite-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={inviteTab === 'received'}
                className={`moji-chat__invite-tab ${inviteTab === 'received' ? 'moji-chat__invite-tab--active' : ''}`}
                onClick={() => setInviteTab('received')}
              >
                Đã nhận
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inviteTab === 'sent'}
                className={`moji-chat__invite-tab ${inviteTab === 'sent' ? 'moji-chat__invite-tab--active' : ''}`}
                onClick={() => setInviteTab('sent')}
              >
                Đã gửi
              </button>
            </div>
            <div className="moji-chat__invite-body">
              {inviteTab === 'received' && requestsLoading && (
                <p className="moji-chat__muted moji-chat__invite-empty">Đang tải…</p>
              )}
              {inviteTab === 'received' && requestsError && (
                <div className="moji-chat__invite-error">
                  <p className="moji-chat__modal-error">{requestsError}</p>
                  <button type="button" className="moji-chat__modal-btn moji-chat__modal-btn--ghost moji-chat__modal-btn--sm" onClick={() => loadIncomingRequests()}>
                    Thử lại
                  </button>
                </div>
              )}
              {inviteTab === 'received' && !requestsLoading && !requestsError && incomingRequests.length === 0 && (
                <p className="moji-chat__muted moji-chat__invite-empty">Không có lời mời chờ xử lý.</p>
              )}
              {inviteTab === 'received' && incomingRequests.length > 0 && (
                <ul className="moji-chat__invite-list">
                  {incomingRequests.map((req) => {
                    const rid = req.id ?? req.Id;
                    const from = req.fromUser ?? req.FromUser;
                    const un = from?.username ?? from?.Username ?? '';
                    const dn = (from?.displayName ?? from?.DisplayName ?? un) || 'Người gửi';
                    const busy = requestActionId === rid;
                    return (
                      <li key={rid} className="moji-chat__invite-item">
                        <div className="moji-chat__invite-user">
                          <span className="moji-chat__invite-av" aria-hidden>
                            {(dn || un).slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <div className="moji-chat__invite-name">{dn}</div>
                            <div className="moji-chat__invite-sub">@{un}</div>
                          </div>
                        </div>
                        <div className="moji-chat__invite-actions">
                          <button
                            type="button"
                            className="moji-chat__invite-btn moji-chat__invite-btn--accept"
                            disabled={busy}
                            onClick={() => acceptRequest(rid)}
                          >
                            {busy ? '…' : 'Chấp nhận'}
                          </button>
                          <button
                            type="button"
                            className="moji-chat__invite-btn moji-chat__invite-btn--reject"
                            disabled={busy}
                            onClick={() => rejectRequest(rid)}
                          >
                            Từ chối
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {inviteTab === 'sent' && pendingOutgoingRequests.length === 0 && (
                <p className="moji-chat__muted moji-chat__invite-empty">Bạn chưa gửi lời mời nào đang chờ.</p>
              )}
              {inviteTab === 'sent' && pendingOutgoingRequests.length > 0 && (
                <ul className="moji-chat__invite-list">
                  {pendingOutgoingRequests.map((req) => {
                    const rid = req.id ?? req.Id;
                    const to = req.toUser ?? req.ToUser;
                    const un = to?.username ?? to?.Username ?? '';
                    const dn = (to?.displayName ?? to?.DisplayName ?? un) || 'Người nhận';
                    const busy = requestActionId === rid;
                    return (
                      <li key={rid} className="moji-chat__invite-item">
                        <div className="moji-chat__invite-user">
                          <span className="moji-chat__invite-av" aria-hidden>
                            {(dn || un).slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <div className="moji-chat__invite-name">{dn}</div>
                            <div className="moji-chat__invite-sub">@{un}</div>
                          </div>
                        </div>
                        <div className="moji-chat__invite-actions moji-chat__invite-actions--single">
                          <button
                            type="button"
                            className="moji-chat__invite-btn moji-chat__invite-btn--withdraw"
                            disabled={busy}
                            onClick={() => cancelOutgoingRequest(rid)}
                          >
                            {busy ? '…' : 'Thu hồi'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="moji-chat__modal-btn moji-chat__modal-btn--primary moji-chat__modal-btn--block moji-chat__modal-btn--gradient"
              onClick={() => {
                closeInvitesModal();
                openFriendModal();
              }}
            >
              <IconUserPlus className="moji-chat__inline-ico" />
              Kết bạn
            </button>
          </div>
        </div>
      )}

      {friendModalOpen && (
        <div className="moji-chat__modal-backdrop" role="presentation" onClick={closeFriendModal}>
          <div
            className="moji-chat__modal moji-chat__modal--friend"
            role="dialog"
            aria-labelledby="moji-friend-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="moji-chat__modal-head">
              <h2 id="moji-friend-title" className="moji-chat__modal-title">
                Kết Bạn
              </h2>
              <button type="button" className="moji-chat__modal-x" aria-label="Đóng" onClick={closeFriendModal}>
                ×
              </button>
            </div>
            {friendModalStep === 'search' && (
              <>
                <label className="moji-chat__modal-label">
                  Tìm bằng username
                  <input
                    className="moji-chat__modal-input"
                    value={friendQuery}
                    onChange={(e) => setFriendQuery(e.target.value)}
                    placeholder="Gõ tên username vào đây…"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void searchFriends())}
                    autoComplete="off"
                  />
                </label>
                {friendToast && <p className="moji-chat__modal-toast moji-chat__modal-toast--warn">{friendToast}</p>}
                <ul className="moji-chat__modal-user-list">
                  {friendResults.map((u) => {
                    const id = u.id ?? u.Id;
                    const un = u.username ?? u.Username ?? '';
                    const dn = u.displayName ?? u.DisplayName ?? un;
                    const isSelf = myId != null && id != null && String(id) === String(myId);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className="moji-chat__modal-pick-row"
                          disabled={isSelf}
                          onClick={() => selectUserForFriendStep(u)}
                        >
                          <div>
                            <div className="moji-chat__modal-user-name">{dn}</div>
                            <div className="moji-chat__modal-user-sub">@{un}</div>
                          </div>
                          {isSelf ? <span className="moji-chat__muted moji-chat__muted--sm">Bạn</span> : <span className="moji-chat__modal-pick-hint">Chọn</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="moji-chat__modal-footer-row">
                  <button type="button" className="moji-chat__modal-btn moji-chat__modal-btn--ghost moji-chat__modal-btn--pill" onClick={closeFriendModal}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="moji-chat__modal-btn moji-chat__modal-btn--primary moji-chat__modal-btn--pill moji-chat__modal-btn--gradient"
                    onClick={() => void searchFriends()}
                  >
                    <IconSearch className="moji-chat__inline-ico" />
                    {friendSearching ? '…' : 'Tìm'}
                  </button>
                </div>
              </>
            )}
            {friendModalStep === 'confirm' && friendPick && (
              <>
                <p className="moji-chat__modal-toast moji-chat__modal-toast--success">
                  Tìm thấy @{friendPick.username} rồi nè 🥳
                </p>
                <label className="moji-chat__modal-label">
                  Giới thiệu
                  <textarea
                    className="moji-chat__modal-textarea"
                    rows={3}
                    value={friendIntroText}
                    onChange={(e) => setFriendIntroText(e.target.value)}
                    placeholder="Lời nhắn kèm lời mời (hiển thị trên giao diện — API hiện chỉ gửi lời mời)"
                  />
                </label>
                {friendToast ? <p className="moji-chat__modal-error">{friendToast}</p> : null}
                <div className="moji-chat__modal-footer-row">
                  <button
                    type="button"
                    className="moji-chat__modal-btn moji-chat__modal-btn--ghost moji-chat__modal-btn--pill"
                    onClick={() => {
                      setFriendModalStep('search');
                      setFriendPick(null);
                      setFriendToast('');
                    }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className="moji-chat__modal-btn moji-chat__modal-btn--primary moji-chat__modal-btn--pill moji-chat__modal-btn--gradient"
                    disabled={friendBusyId === friendPick.id}
                    onClick={() => void sendRequestToUser(friendPick.id)}
                  >
                    <IconUserPlus className="moji-chat__inline-ico" />
                    {friendBusyId === friendPick.id ? '…' : 'Kết Bạn'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
