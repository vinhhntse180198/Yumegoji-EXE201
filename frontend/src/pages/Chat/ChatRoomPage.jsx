import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { startChatRoomConnection } from '../../services/chatRealtime';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { YumeChatLayout } from '../../components/chat/YumeChatLayout';
import { useChatShell } from '../../hooks/useChatShell';
import { ROUTES } from '../../data/routes';
import { notifyChatInboxRevised } from '../../hooks/useChatUnreadTotal';

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * ID người gửi — backend/SignalR có thể dùng tên khác nhau; không gộp nhầm sang current user.
 * Một số payload còn bọc user/sender trong object.
 */
function extractSenderUserId(m) {
  if (!m || typeof m !== 'object') return null;
  const top = toNum(
    m.userId ??
      m.UserId ??
      m.senderId ??
      m.SenderId ??
      m.senderUserId ??
      m.SenderUserId ??
      m.fromUserId ??
      m.FromUserId ??
      m.authorUserId ??
      m.AuthorUserId
  );
  if (top != null) return top;
  const nested = m.user ?? m.User ?? m.sender ?? m.Sender;
  if (nested && typeof nested === 'object') {
    return toNum(
      nested.id ??
        nested.Id ??
        nested.userId ??
        nested.UserId ??
        nested.senderId ??
        nested.SenderId
    );
  }
  return null;
}

function idsMatch(a, b) {
  if (a == null || b == null) return false;
  return String(Number(a)) === String(Number(b));
}

/** API có thể trả PascalCase (UserId, Id) — gom về id/userId số để so isOwn & key ổn định. */
function normalizeMessageShape(m) {
  if (!m || typeof m !== 'object') return m;
  const id = m.id ?? m.Id;
  const userId = extractSenderUserId(m);
  const rx = m.reactions ?? m.Reactions;
  return {
    ...m,
    ...(id != null ? { id } : {}),
    ...(userId != null ? { userId } : {}),
    content: m.content ?? m.Content ?? '',
    type: m.type ?? m.Type ?? 'text',
    createdAt: m.createdAt ?? m.CreatedAt,
    replyToId: m.replyToId ?? m.ReplyToId,
    isPinned: Boolean(m.isPinned ?? m.IsPinned),
    senderDisplayName: m.senderDisplayName ?? m.SenderDisplayName,
    senderUsername: m.senderUsername ?? m.SenderUsername,
    reactions: Array.isArray(rx) ? rx : [],
  };
}

/** Trùng id (REST + SignalR / double fetch) gây duplicate React key — giữ bản đầu theo thứ tự. */
function dedupeMessagesById(list) {
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const id = m?.id ?? m?.Id;
    const isTemp = id == null || String(id).startsWith('tmp-');
    if (isTemp) {
      out.push(m);
      continue;
    }
    const k = String(id);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return out;
}

/** GET /rooms/{id}/messages — PagedMessagesResponse (Items, HasMore, NextCursor). */
function parsePagedMessagesResponse(res) {
  const raw = res?.items ?? res?.Items ?? [];
  const list = Array.isArray(raw) ? raw : [];
  const hasMore = res?.hasMore ?? res?.HasMore ?? false;
  const nextCursor = res?.nextCursor ?? res?.NextCursor ?? null;
  return {
    items: dedupeMessagesById(list.map(normalizeMessageShape)),
    hasMore: Boolean(hasMore),
    nextCursor: nextCursor != null && nextCursor !== '' ? String(nextCursor) : null,
  };
}

/** Cuộn vùng feed tới đáy — đáng tin cậy hơn scrollIntoView lên sentinel trong flex. */
function scrollFeedToEnd(feedEl, { smooth = false } = {}) {
  if (!feedEl) return;
  const run = () => {
    feedEl.scrollTo({
      top: feedEl.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
  });
}

/** Nhãn ngày giữa các tin (giống mẫu Zalo). */
function formatDateSeparator(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function shouldShowDateSeparator(prevIso, curIso) {
  if (!curIso) return false;
  if (!prevIso) return true;
  const a = new Date(prevIso);
  const b = new Date(curIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true;
  return (
    a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate()
  );
}

/** Hiện mốc giờ giữa cụm tin (cách > 5 phút) — như MessageItem mẫu. */
function shouldShowTimeCluster(prevIso, curIso) {
  if (!curIso) return false;
  if (!prevIso) return true;
  const a = new Date(prevIso).getTime();
  const b = new Date(curIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return b - a > 300000;
}

function formatTimeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Tin tối ưu (_opt) chưa có id từ server — gán theo myId để luôn căn phải đúng mọi tài khoản. */
function messageSenderId(m, myId) {
  if (!m || typeof m !== 'object') return null;
  if (m._opt && myId != null) return myId;
  return extractSenderUserId(m);
}

function messageSenderName(m) {
  return (
    m.senderDisplayName ||
    m.SenderDisplayName ||
    m.senderUsername ||
    m.SenderUsername ||
    'Người gửi'
  );
}

/** Nhóm: tên hiển thị + @username — không gắn với username cụ thể (member, staff1, …). */
function messageSenderLabel(m) {
  const dn = m.senderDisplayName || m.SenderDisplayName || '';
  const un = m.senderUsername || m.SenderUsername || '';
  if (dn && un) return `${dn} (@${un})`;
  return dn || (un ? `@${un}` : 'Người gửi');
}

function getLatestPersistedMessageId(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    const id = item?.id ?? item?.Id;
    if (id == null) continue;
    const sid = String(id);
    if (sid.startsWith('tmp-')) continue;
    return id;
  }
  return null;
}

/** Chat 1–1: nếu API không gửi tên người gửi, dùng peer từ phòng để avatar vẫn đúng người. */
function peerAvatarLetter(m, isDirectRoom, peerUser) {
  const fromMsg = messageSenderName(m);
  const hasNameFromApi =
    !!(m.senderDisplayName || m.SenderDisplayName || m.senderUsername || m.SenderUsername);
  if (!isDirectRoom || !peerUser) {
    return fromMsg.slice(0, 1).toUpperCase();
  }
  if (hasNameFromApi) {
    return fromMsg.slice(0, 1).toUpperCase();
  }
  const pn =
    peerUser.displayName ||
    peerUser.DisplayName ||
    peerUser.username ||
    peerUser.Username ||
    '?';
  return pn.slice(0, 1).toUpperCase();
}

/** Phản ứng — khớp gợi ý backend (ReactionBody). */
const REACTION_PRESETS = [
  { id: 'like', label: '👍' },
  { id: 'love', label: '❤️' },
  { id: 'haha', label: '😂' },
  { id: 'wow', label: '😮' },
  { id: 'sad', label: '😢' },
  { id: 'angry', label: '😠' },
];

const COMPOSER_QUICK_EMOJI = ['😀', '😂', '🤣', '❤️', '👍', '👏', '🎉', '🔥', '😮', '😢', '🙏', '✨', '💪', '📚'];

const MAX_CHAT_IMAGE_BYTES = 1_200_000;
const MAX_CHAT_FILE_BYTES = 500_000;

const ACHIEVEMENT_STICKERS = [
  { key: 'n5_pass', emoji: '🌸', title: 'Hoàn thành N5', subtitle: 'Thành tích học tập' },
  { key: 'streak7', emoji: '🔥', title: 'Streak 7 ngày', subtitle: 'Luyện tập đều đặn' },
  { key: 'game_win', emoji: '🏆', title: 'Chiến thắng minigame', subtitle: 'Sticker độc quyền từ game' },
];

function findMessageById(list, mid) {
  if (mid == null) return null;
  return list.find((x) => String(x.id ?? x.Id) === String(mid)) ?? null;
}

function reactionLabel(emojiId) {
  const p = REACTION_PRESETS.find((r) => r.id === emojiId);
  return p ? p.label : emojiId;
}

/** Nội dung bong bóng: text / ảnh / file JSON / sticker & chia sẻ thành tích. */
function MessageBody({ m }) {
  const type = String(m.type || m.Type || 'text').toLowerCase();
  const raw = m.content ?? m.Content ?? '';
  if (type === 'image' && (raw.startsWith('data:image/') || raw.startsWith('http'))) {
    return (
      <span className="moji-chat__bubble-media">
        <img src={raw} alt="" className="moji-chat__bubble-img" loading="lazy" />
      </span>
    );
  }
  if (type === 'file') {
    let fileObj = null;
    try {
      fileObj = JSON.parse(raw);
    } catch {
      return <span className="moji-chat__bubble-text">{raw}</span>;
    }
    const o = fileObj;
    return (
      <span className="moji-chat__bubble-file">
        📎 <strong>{o?.name || 'Tệp đính kèm'}</strong>
        {o?.size != null ? (
          <span className="moji-chat__bubble-file-meta"> ({Math.round(o.size / 1024)} KB)</span>
        ) : null}
      </span>
    );
  }
  if (type === 'sticker' || type === 'achievement_share' || type === 'lesson_share') {
    let cardObj = null;
    try {
      cardObj = JSON.parse(raw);
    } catch {
      return <span className="moji-chat__bubble-text">{raw}</span>;
    }
    const o = cardObj;
    const sub = o?.subtitle || o?.courseName;
    return (
      <span className="moji-chat__bubble-card">
        <span className="moji-chat__bubble-card-ico" aria-hidden>
          {o?.emoji || '🏅'}
        </span>
        <span className="moji-chat__bubble-card-txt">
          <strong>{o?.title || o?.label || 'Chia sẻ'}</strong>
          {sub ? <small>{sub}</small> : null}
        </span>
      </span>
    );
  }
  return <span className="moji-chat__bubble-text">{raw}</span>;
}

function MessageReplyQuote({ parent, isOwn }) {
  if (!parent) return null;
  const prevText = (parent.content ?? parent.Content ?? '').slice(0, 120);
  const who = messageSenderLabel(parent);
  return (
    <div className={`moji-chat__reply-quote ${isOwn ? 'moji-chat__reply-quote--own' : ''}`}>
      <span className="moji-chat__reply-quote-bar" aria-hidden />
      <span className="moji-chat__reply-quote-inner">
        <span className="moji-chat__reply-quote-who">{who}</span>
        <span className="moji-chat__reply-quote-snippet">{prevText || 'Tin nhắn'}</span>
      </span>
    </div>
  );
}

function pinnedBannerSnippet(m) {
  if (!m) return '';
  const t = String(m.type || m.Type || 'text').toLowerCase();
  const raw = m.content || m.Content || '';
  if (t === 'text') return raw.slice(0, 120);
  if (t === 'image') return '[Ảnh]';
  if (t === 'file') {
    try {
      const o = JSON.parse(raw);
      return o.name || '[Tệp đính kèm]';
    } catch {
      return raw.slice(0, 80);
    }
  }
  try {
    const o = JSON.parse(raw);
    return o.title || o.label || o.courseName || '[Chia sẻ]';
  } catch {
    return raw.slice(0, 80);
  }
}

/** Nút phản ứng góc dưới bong bóng + popover dạng viên khi hover. */
function MessageReactionDock({ disabled, busy, onPick }) {
  return (
    <div className="moji-chat__reaction-dock" role="group" aria-label="Phản ứng tin nhắn">
      <div className="moji-chat__reaction-popover" role="menu">
        {REACTION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="menuitem"
            className="moji-chat__reaction-pop-hit"
            title={p.id}
            disabled={disabled || busy}
            onClick={() => onPick(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="moji-chat__reaction-trigger"
        aria-label="Phản ứng cảm xúc"
        aria-haspopup="true"
        disabled={disabled}
      >
        <span className="moji-chat__reaction-trigger-ico" aria-hidden>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </span>
      </button>
    </div>
  );
}

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = useCurrentUserId(user);
  const myDisplay =
    user?.displayName || user?.username || user?.name || user?.email || 'Bạn';

  const {
    setRoomSummary,
    setRightPanelOpen,
    rightPanelOpen,
    bumpInboxRevision,
    setDirectRoomPresence,
    bumpFriendsRevision,
  } = useChatShell();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [keywordWarning, setKeywordWarning] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const bottomRef = useRef(null);
  const feedRef = useRef(null);
  const loadingOlderRef = useRef(false);
  /** true = đang xem gần đáy → tin realtime / gửi tin sẽ tự cuộn xuống. */
  const stickToBottomRef = useRef(true);
  const roomMenuRef = useRef(null);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [presence, setPresence] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [stickerPopoverOpen, setStickerPopoverOpen] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [reactionBusyMid, setReactionBusyMid] = useState(null);
  const [recallBusyMid, setRecallBusyMid] = useState(null);
  const prevRoomIdRef = useRef(null);
  const prevRoomCanMarkRef = useRef(false);
  const prevRoomLastMessageIdRef = useRef(null);
  const lastPickedReactionRef = useRef({});
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  /** POST /rooms/{id}/read rồi báo sidebar refetch — tránh badge chưa đọc kẹt sau khi đã mở phòng. */
  const markReadAndSyncSidebar = useCallback(
    async (rid, lastMessageId, isMember) => {
      if (!rid || !isMember) return;
      try {
        await chatService.markRoomRead(rid, lastMessageId ?? null);
        bumpInboxRevision?.();
        notifyChatInboxRevised();
      } catch {
        /* API lỗi — giữ badge; không chặn UI */
      }
    },
    [bumpInboxRevision]
  );

  useEffect(() => {
    const prevRoomId = prevRoomIdRef.current;
    const changedRoom = prevRoomId != null && roomId != null && String(prevRoomId) !== String(roomId);
    if (changedRoom && prevRoomCanMarkRef.current) {
      void markReadAndSyncSidebar(prevRoomId, prevRoomLastMessageIdRef.current, true);
    }

    prevRoomIdRef.current = roomId ?? null;
    prevRoomCanMarkRef.current = Boolean(roomId) && !needsJoin && !loading;
    prevRoomLastMessageIdRef.current =
      getLatestPersistedMessageId(messages) ?? (room?.lastMessage ?? room?.LastMessage)?.id ?? (room?.lastMessage ?? room?.LastMessage)?.Id ?? null;
  }, [roomId, needsJoin, loading, messages, room, markReadAndSyncSidebar]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setNeedsJoin(false);
      setKeywordWarning('');
      try {
        let roomRes = null;
        let asMember = false;
        try {
          roomRes = await chatService.getRoom(roomId);
          asMember = true;
        } catch (err) {
          /** Chỉ 404 = không phải thành viên / không có quyền GET rooms/{id}. Lỗi khác (500, network) không được coi là "chưa tham gia". */
          const st = err?.response?.status;
          if (st === 404) {
            roomRes = await chatService.getPublicRoom(roomId).catch(() => null);
            asMember = false;
          } else {
            throw err;
          }
        }
        if (cancelled) return;
        if (!roomRes) {
          setError('Không tìm thấy phòng hoặc bạn chưa có quyền xem.');
          setRoom(null);
          setMessages([]);
          setHasMore(false);
          setNextCursor(null);
          return;
        }

        const msgRes = await chatService.getRoomMessages(roomId, { limit: 50 });
        if (cancelled) return;
        const parsed = parsePagedMessagesResponse(msgRes);

        /**
         * Đồng bộ "đã tham gia" với backend:
         * - GET messages chỉ trả tin khi đã là thành viên → có tin ⇒ chắc chắn là member.
         * - Phòng public: GET members có thể xem list → kiểm tra myId (phòng mới chưa có tin).
         */
        let member = asMember;
        if (!member && parsed.items.length > 0) {
          member = true;
          try {
            roomRes = await chatService.getRoom(roomId);
          } catch {
            /* giữ DTO public; vẫn coi là member để ẩn banner tham gia */
          }
        }
        if (!member && myId != null && parsed.items.length === 0) {
          try {
            const mems = await chatService.getRoomMembers(roomId, { limit: 200 });
            const mid = Number(myId);
            if (
              mems.some((m) => {
                const uid = m.userId ?? m.UserId;
                return uid != null && Number(uid) === mid;
              })
            ) {
              member = true;
              try {
                roomRes = await chatService.getRoom(roomId);
              } catch {
                /* noop */
              }
            }
          } catch {
            /* noop */
          }
        }

        setRoom(roomRes);
        setNeedsJoin(!member);
        setMessages(parsed.items);
        setHasMore(parsed.hasMore);
        setNextCursor(parsed.nextCursor);
        if (member) {
          const last = parsed.items.length > 0 ? parsed.items[parsed.items.length - 1] : null;
          const lid = last ? last.id ?? last.Id : null;
          /** Chờ read + bump xong trước khi tắt loading — tránh remount YumeChatLayout làm mất ChatShellContext và không refetch sidebar. */
          await markReadAndSyncSidebar(roomId, lid, member);
        }
        if (!cancelled) {
          stickToBottomRef.current = true;
          setShowJumpLatest(false);
          scrollFeedToEnd(feedRef.current, { smooth: false });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.response?.data?.message || e?.message || 'Không tải được phòng.';
          const detail = e?.response?.data?.detail;
          setError(detail ? `${msg} (${detail})` : msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [roomId, myId, markReadAndSyncSidebar]);

  useEffect(() => {
    stickToBottomRef.current = true;
    setShowJumpLatest(false);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || needsJoin || loading) {
      setPresence(null);
      setRoomMembers([]);
      return undefined;
    }
    let cancelled = false;
    async function loadPresenceMembers() {
      try {
        const [p, mems] = await Promise.all([
          chatService.getRoomPresence(roomId).catch(() => null),
          chatService.getRoomMembers(roomId, { limit: 200 }).catch(() => []),
        ]);
        if (cancelled) return;
        setPresence(p || null);
        setRoomMembers(Array.isArray(mems) ? mems : []);
      } catch {
        if (!cancelled) {
          setPresence(null);
          setRoomMembers([]);
        }
      }
    }
    void loadPresenceMembers();
    const t = window.setInterval(() => void loadPresenceMembers(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [roomId, needsJoin, loading]);

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || needsJoin || loading || !hasMore || !nextCursor || loadingOlderRef.current) return;
    const container = feedRef.current;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;
    try {
      const msgRes = await chatService.getRoomMessages(roomId, { cursor: nextCursor, limit: 50 });
      const parsed = parsePagedMessagesResponse(msgRes);
      setMessages((prev) => dedupeMessagesById([...parsed.items, ...prev]));
      setHasMore(parsed.hasMore);
      setNextCursor(parsed.nextCursor);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            const h = container.scrollHeight;
            container.scrollTop = h - prevScrollHeight + prevScrollTop;
            const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
            const nearBottom = dist < 120;
            stickToBottomRef.current = nearBottom;
            const showJump = !nearBottom && container.scrollHeight > container.clientHeight + 80;
            setShowJumpLatest(showJump);
          }
          loadingOlderRef.current = false;
          setLoadingOlder(false);
        });
      });
    } catch {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [roomId, needsJoin, loading, hasMore, nextCursor]);

  function onFeedScroll() {
    const el = feedRef.current;
    if (!el || loadingOlderRef.current) return;
    const nearBottomPx = 120;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = dist < nearBottomPx;
    stickToBottomRef.current = nearBottom;
    const hasScrollableHistory = el.scrollHeight > el.clientHeight + 80;
    const showJump = !nearBottom && hasScrollableHistory;
    setShowJumpLatest((prev) => (prev === showJump ? prev : showJump));
    if (el.scrollTop < 120) {
      void loadOlderMessages();
    }
  }

  function handleJumpToLatest() {
    stickToBottomRef.current = true;
    setShowJumpLatest(false);
    scrollFeedToEnd(feedRef.current, { smooth: true });
  }

  useEffect(() => {
    if (!roomId || needsJoin || loading) return undefined;

    let cancelled = false;
    let disconnect = () => Promise.resolve();

    (async () => {
      try {
        const stop = await startChatRoomConnection(roomId, {
          onReceiveMessage: (msg) => {
            if (cancelled || !msg) return;
            const normalized = normalizeMessageShape(msg);
            const newId = normalized.id ?? normalized.Id;
            setMessages((prev) => {
              if (newId == null) return prev;
              if (prev.some((m) => String(m.id ?? m.Id) === String(newId))) return prev;
              const next = dedupeMessagesById([...prev, normalized]);
              if (stickToBottomRef.current) {
                requestAnimationFrame(() => scrollFeedToEnd(feedRef.current, { smooth: true }));
              }
              return next;
            });
            if (newId != null) {
              void chatService
                .markRoomRead(roomId, newId)
                .then(() => {
                  bumpInboxRevision?.();
                  notifyChatInboxRevised();
                })
                .catch(() => {});
            }
          },
          onMessageUpdated: (msg) => {
            if (cancelled || !msg) return;
            const normalized = normalizeMessageShape(msg);
            const id = normalized.id ?? normalized.Id;
            if (id == null) return;
            setMessages((prev) =>
              dedupeMessagesById(
                prev.map((m) => (String(m.id ?? m.Id) === String(id) ? normalizeMessageShape({ ...m, ...normalized }) : m))
              )
            );
          },
          onMessageDeleted: (payload) => {
            if (cancelled) return;
            const mid = payload?.messageId ?? payload?.MessageId;
            if (mid == null) return;
            setMessages((prev) => prev.filter((m) => String(m.id ?? m.Id) !== String(mid)));
          },
        });
        disconnect = stop;
      } catch {
        /* SignalR tùy chọn — gửi/nhận qua REST vẫn hoạt động */
      }
    })();

    return () => {
      cancelled = true;
      void disconnect();
    };
  }, [roomId, needsJoin, loading, bumpInboxRevision]);

  useEffect(() => {
    if (!roomMenuOpen) return undefined;
    function onDocDown(e) {
      if (roomMenuRef.current && !roomMenuRef.current.contains(e.target)) setRoomMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [roomMenuOpen]);

  async function handleJoin() {
    if (!roomId) return;
    setJoining(true);
    setError('');
    try {
      await chatService.joinRoom(roomId);
      setNeedsJoin(false);
      const [roomRes, msgRes] = await Promise.all([
        chatService.getRoom(roomId),
        chatService.getRoomMessages(roomId, { limit: 50 }),
      ]);
      setRoom(roomRes);
      const parsed = parsePagedMessagesResponse(msgRes);
      setMessages(parsed.items);
      setHasMore(parsed.hasMore);
      setNextCursor(parsed.nextCursor);
      const last = parsed.items.length > 0 ? parsed.items[parsed.items.length - 1] : null;
      const lid = last ? last.id ?? last.Id : null;
      void markReadAndSyncSidebar(roomId, lid, true);
      stickToBottomRef.current = true;
      setShowJumpLatest(false);
      scrollFeedToEnd(feedRef.current, { smooth: false });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không thể tham gia phòng.');
    } finally {
      setJoining(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !pendingMedia) || !roomId || needsJoin) return;

    let sendType = 'text';
    let sendContent = text;
    if (pendingMedia?.kind === 'image') {
      sendType = 'image';
      sendContent = pendingMedia.dataUrl;
    } else if (pendingMedia?.kind === 'file') {
      sendType = 'file';
      sendContent = JSON.stringify(pendingMedia.meta);
    }

    const replyToId = replyingTo ? replyingTo.id ?? replyingTo.Id : undefined;
    const prevDraft = draft;
    const prevMedia = pendingMedia;
    const prevReply = replyingTo;

    setDraft('');
    setPendingMedia(null);
    setReplyingTo(null);
    setEmojiPopoverOpen(false);
    setStickerPopoverOpen(false);
    setSharePopoverOpen(false);
    setMentionOpen(false);
    setError('');
    setKeywordWarning('');

    const optimistic = {
      id: `tmp-${Date.now()}`,
      content: sendContent,
      type: sendType,
      userId: myId ?? undefined,
      senderId: myId ?? undefined,
      senderDisplayName: myDisplay,
      createdAt: new Date().toISOString(),
      replyToId,
      reactions: [],
      _opt: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    stickToBottomRef.current = true;
    scrollFeedToEnd(feedRef.current, { smooth: false });
    try {
      const { message: saved, sensitiveKeywordMatches } = await chatService.sendMessage(roomId, {
        content: sendContent,
        type: sendType,
        replyToId,
      });
      if (Array.isArray(sensitiveKeywordMatches) && sensitiveKeywordMatches.length > 0) {
        setKeywordWarning(`Nội dung có thể chứa từ khóa nhạy cảm: ${sensitiveKeywordMatches.join(', ')}`);
      }
      const savedNorm = saved ? normalizeMessageShape(saved) : saved;
      setMessages((prev) =>
        dedupeMessagesById(
          prev.map((m) => {
            const mid = m.id ?? m.Id;
            return mid === optimistic.id ? savedNorm : m;
          })
        )
      );
      const lid = savedNorm?.id ?? savedNorm?.Id;
      void markReadAndSyncSidebar(roomId, lid, true);
      stickToBottomRef.current = true;
      scrollFeedToEnd(feedRef.current, { smooth: true });
    } catch (e2) {
      setMessages((prev) => prev.filter((m) => (m.id ?? m.Id) !== optimistic.id));
      setDraft(prevDraft);
      setPendingMedia(prevMedia);
      setReplyingTo(prevReply);
      const msg = e2?.response?.data?.message || e2?.message || 'Gửi thất bại.';
      const detail = e2?.response?.data?.detail;
      setError(detail ? `${msg} (${detail})` : msg);
    }
  }

  async function handleToggleReaction(mid, emoji) {
    if (!roomId || needsJoin || mid == null) return;
    const k = String(mid);
    const prevPick = lastPickedReactionRef.current[k];
    setReactionBusyMid(mid);
    setError('');
    try {
      if (prevPick === emoji) {
        await chatService.removeReaction(roomId, mid, emoji);
        lastPickedReactionRef.current[k] = null;
        setMessages((prevList) =>
          prevList.map((msg) => {
            if (String(msg.id ?? msg.Id) !== k) return msg;
            const cur = [...(msg.reactions || [])];
            const idx = cur.findIndex((r) => (r.emoji ?? r.Emoji) === emoji);
            if (idx < 0) return msg;
            const row = cur[idx];
            const cnt = (row.count ?? row.Count ?? 1) - 1;
            if (cnt <= 0) cur.splice(idx, 1);
            else cur[idx] = { ...row, count: cnt, Count: cnt };
            return normalizeMessageShape({ ...msg, reactions: cur });
          })
        );
      } else {
        if (prevPick) {
          await chatService.removeReaction(roomId, mid, prevPick).catch(() => {});
        }
        const updated = await chatService.addReaction(roomId, mid, emoji);
        lastPickedReactionRef.current[k] = emoji;
        if (updated) {
          const norm = normalizeMessageShape(updated);
          setMessages((prevList) =>
            prevList.map((msg) => (String(msg.id ?? msg.Id) === k ? norm : msg))
          );
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không cập nhật reaction.');
    } finally {
      setReactionBusyMid(null);
    }
  }

  async function handlePinMessage(mid, shouldPin) {
    if (!roomId || needsJoin || mid == null) return;
    setError('');
    try {
      if (shouldPin) await chatService.pinMessage(roomId, mid);
      else await chatService.unpinMessage(roomId, mid);
      setMessages((prevList) =>
        prevList.map((msg) =>
          String(msg.id ?? msg.Id) === String(mid)
            ? normalizeMessageShape({ ...msg, isPinned: shouldPin, IsPinned: shouldPin })
            : msg
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không ghim/bỏ ghim được (cần quyền moderator phòng).');
    }
  }

  async function handleRecallMessage(mid) {
    if (!roomId || needsJoin || mid == null) return;
    const k = String(mid);
    if (k.startsWith('tmp-')) return;
    if (!window.confirm('Thu hồi tin nhắn này? Mọi người trong phòng sẽ không còn thấy tin.')) return;
    setRecallBusyMid(mid);
    setError('');
    try {
      await chatService.deleteMessage(roomId, mid);
      delete lastPickedReactionRef.current[k];
      setMessages((prevList) => prevList.filter((msg) => String(msg.id ?? msg.Id) !== k));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thu hồi được tin nhắn.');
    } finally {
      setRecallBusyMid(null);
    }
  }

  function sendStickerPayload(payload, msgType = 'sticker') {
    if (!roomId || needsJoin) return;
    const body = JSON.stringify(payload);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      content: body,
      type: msgType,
      userId: myId ?? undefined,
      senderDisplayName: myDisplay,
      createdAt: new Date().toISOString(),
      reactions: [],
      _opt: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    stickToBottomRef.current = true;
    scrollFeedToEnd(feedRef.current, { smooth: false });
    setStickerPopoverOpen(false);
    setSharePopoverOpen(false);
    void (async () => {
      try {
        const { message: saved } = await chatService.sendMessage(roomId, {
          content: body,
          type: msgType,
        });
        const norm = saved ? normalizeMessageShape(saved) : saved;
        setMessages((prev) =>
          dedupeMessagesById(prev.map((m) => ((m.id ?? m.Id) === optimistic.id ? norm : m)))
        );
        const lid = norm?.id ?? norm?.Id;
        if (lid != null) void markReadAndSyncSidebar(roomId, lid, true);
        scrollFeedToEnd(feedRef.current, { smooth: true });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => (m.id ?? m.Id) !== optimistic.id));
        setError(err?.response?.data?.message || err?.message || 'Không gửi được sticker/chia sẻ.');
      }
    })();
  }

  function onPickImageFile(ev) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    if (f.size > MAX_CHAT_IMAGE_BYTES) {
      setError(`Ảnh tối đa ~${Math.round(MAX_CHAT_IMAGE_BYTES / 1024)} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingMedia({ kind: 'image', dataUrl: reader.result, name: f.name });
    reader.readAsDataURL(f);
  }

  function onPickAttachFile(ev) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    if (f.size > MAX_CHAT_FILE_BYTES) {
      setError(`File tối đa ~${Math.round(MAX_CHAT_FILE_BYTES / 1024)} KB (bản demo).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const full = String(reader.result || '');
      const b64 = full.includes(',') ? full.split(',')[1] : full;
      setPendingMedia({
        kind: 'file',
        meta: { name: f.name, mime: f.type || 'application/octet-stream', size: f.size, data: b64 },
      });
    };
    reader.readAsDataURL(f);
  }

  const roomTypeNorm = (room?.type || room?.Type || '').toLowerCase();
  /** Backend: phòng 1–1 dùng type `private` (ChatService PrivateRoomType). */
  const isDirectRoom = roomTypeNorm === 'private';
  const peerUser = room?.peerUser ?? room?.PeerUser;
  const directPeerLine =
    isDirectRoom && peerUser
      ? peerUser.displayName ||
        peerUser.DisplayName ||
        peerUser.username ||
        peerUser.Username ||
        ''
      : '';

  const roomTitle =
    isDirectRoom && peerUser
      ? peerUser.displayName || peerUser.DisplayName || peerUser.username || peerUser.Username || room?.name
      : room?.name || 'Phòng chat';
  const onlineCount = presence != null ? (presence.onlineCount ?? presence.OnlineCount) : null;
  const memberCount = presence != null ? (presence.memberCount ?? presence.MemberCount) : null;
  const peerSocialOnline =
    isDirectRoom && onlineCount != null && memberCount != null
      ? Number(memberCount) >= 2 && Number(onlineCount) >= 2
      : null;

  const directPeerUserId = useMemo(() => {
    if (!room || String(room?.type || room?.Type || '').toLowerCase() !== 'private') return null;
    const p = room.peerUser ?? room.PeerUser;
    const n = Number(p?.id ?? p?.Id ?? 0);
    return n || null;
  }, [room]);

  const presenceOnlineSig = useMemo(() => {
    if (presence == null) return '';
    const oc = presence.onlineCount ?? presence.OnlineCount;
    const mc = presence.memberCount ?? presence.MemberCount;
    return `${oc}|${mc}`;
  }, [presence]);

  const myRoleNorm = String(room?.myRole ?? room?.MyRole ?? '').toLowerCase();
  const createdByNum = Number(room?.createdBy ?? room?.CreatedBy ?? NaN);
  const canPinMessages =
    ['moderator', 'admin', 'owner', 'siteadmin'].includes(myRoleNorm) ||
    (Number.isFinite(createdByNum) && myId != null && Number(myId) === createdByNum);

  const mentionCandidates = useMemo(() => {
    const q = (mentionQuery || '').toLowerCase();
    return roomMembers
      .filter((mem) => {
        const uid = mem.userId ?? mem.UserId;
        if (myId != null && idsMatch(uid, myId)) return false;
        const un = String(mem.username ?? mem.Username ?? '').toLowerCase();
        const dn = String(mem.displayName ?? mem.DisplayName ?? '').toLowerCase();
        if (!un && !dn) return false;
        if (!q) return true;
        return un.includes(q) || dn.includes(q);
      })
      .slice(0, 12);
  }, [roomMembers, mentionQuery, myId]);

  function pickMention(username) {
    const un = String(username || '').trim();
    if (!un) return;
    setDraft((prev) => {
      const i = prev.lastIndexOf('@');
      if (i < 0) return `${prev}@${un} `;
      let j = i + 1;
      while (j < prev.length && prev[j] !== ' ') j += 1;
      return `${prev.slice(0, i)}@${un} ${prev.slice(j)}`;
    });
    setMentionOpen(false);
    setMentionQuery('');
  }

  function onDraftChange(e) {
    const v = e.target.value;
    setDraft(v);
    const c = typeof e.target.selectionStart === 'number' ? e.target.selectionStart : v.length;
    const before = v.slice(0, c);
    const at = before.lastIndexOf('@');
    if (at >= 0) {
      const frag = before.slice(at + 1);
      if (!frag.includes(' ') && frag.length <= 48) {
        setMentionQuery(frag.toLowerCase());
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery('');
  }

  function openMentionPicker() {
    setEmojiPopoverOpen(false);
    setStickerPopoverOpen(false);
    setSharePopoverOpen(false);
    setDraft((d) => (d.endsWith('@') ? d : `${d}@`));
    setMentionQuery('');
    setMentionOpen(true);
  }

  useEffect(() => {
    if (!setRoomSummary || !room) return undefined;
    const letter =
      isDirectRoom && peerUser
        ? (
            peerUser.displayName ||
            peerUser.DisplayName ||
            peerUser.username ||
            peerUser.Username ||
            '?'
          ).slice(0, 1)
        : (room?.name || room?.Name || '?').toString().slice(0, 1);
    setRoomSummary({
      title: roomTitle,
      subtitle: isDirectRoom
        ? peerSocialOnline === true
          ? 'Đang hoạt động • Tin nhắn riêng'
          : peerSocialOnline === false
            ? 'Offline • Tin nhắn riêng'
            : 'Tin nhắn riêng'
        : roomTypeNorm === 'group'
          ? 'Nhóm chat'
          : roomTypeNorm || 'Phòng chat',
      letter,
    });
    return () => setRoomSummary(null);
  }, [room, roomTitle, isDirectRoom, peerUser, peerSocialOnline, roomTypeNorm, setRoomSummary]);

  useEffect(() => {
    if (!setDirectRoomPresence) return undefined;
    if (directPeerUserId == null) {
      setDirectRoomPresence(null);
      return undefined;
    }
    let online = null;
    if (peerSocialOnline === true) online = true;
    else if (peerSocialOnline === false) online = false;
    setDirectRoomPresence({ peerUserId: directPeerUserId, online });
    return () => setDirectRoomPresence(null);
  }, [directPeerUserId, peerSocialOnline, setDirectRoomPresence]);

  useEffect(() => {
    if (!presenceOnlineSig || !bumpFriendsRevision) return;
    bumpFriendsRevision();
  }, [presenceOnlineSig, bumpFriendsRevision]);

  async function handleLeaveRoom() {
    if (!roomId || needsJoin) return;
    const msg = isDirectRoom
      ? 'Rời cuộc trò chuyện? Bạn có thể mở lại sau.'
      : roomTypeNorm === 'group'
        ? 'Rời nhóm này?'
        : 'Rời phòng này? Bạn có thể tham gia lại nếu phòng mở.';
    if (!window.confirm(msg)) return;
    setError('');
    try {
      await chatService.leaveRoom(roomId);
      bumpInboxRevision?.();
      notifyChatInboxRevised();
      navigate(ROUTES.CHAT);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không rời được phòng.');
    }
  }

  async function handleDeleteGroupRoom() {
    if (!roomId || needsJoin || roomTypeNorm !== 'group') return;
    if (!window.confirm('Xóa nhóm cho mọi người? Hành động không hoàn tác.')) return;
    setError('');
    try {
      await chatService.deleteRoom(roomId);
      bumpInboxRevision?.();
      notifyChatInboxRevised();
      navigate(ROUTES.CHAT);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không xóa được nhóm.');
    }
  }

  const pinnedPreview = messages.find((m) => m.isPinned);

  return (
    <YumeChatLayout selectedRoomId={roomId}>
      {loading ? (
        <div className="moji-chat__room moji-chat__room--loading">
          <div className="moji-chat__empty" role="status" aria-live="polite">
            <div className="moji-chat__empty-icon" aria-hidden>
              <span className="moji-chat__empty-bubble">•••</span>
            </div>
            <h2 className="moji-chat__empty-title">Chào mừng đến YumeGo-ji!</h2>
            <p className="moji-chat__empty-desc">Chọn một cuộc hội thoại để bắt đầu chat!</p>
            <p className="moji-chat__empty-loading-hint">Đang mở cuộc trò chuyện…</p>
          </div>
        </div>
      ) : (
      <div className="moji-chat__room moji-chat__room--pro">
        <header className="moji-chat__room-head moji-chat__room-head--pro">
          <div className="moji-chat__room-head-row">
            <div className="moji-chat__room-head-left">
              {isDirectRoom && peerUser && (
                <div className="moji-chat__room-peer-avatar-wrap" aria-hidden>
                  <div className="moji-chat__room-peer-avatar">
                    {(peerUser.displayName || peerUser.DisplayName || peerUser.username || peerUser.Username || '?')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  {peerSocialOnline === true ? (
                    <span className="moji-chat__avatar-online-dot moji-chat__avatar-online-dot--room-head" title="Đang hoạt động" />
                  ) : null}
                </div>
              )}
              {!isDirectRoom && (
                <div className="moji-chat__room-peer-avatar moji-chat__room-peer-avatar--group" aria-hidden>
                  {(room?.name || room?.Name || '?').toString().slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="moji-chat__room-head-main">
                <h1 className="moji-chat__room-title">{roomTitle}</h1>
                <p className="moji-chat__room-sub">
                  {isDirectRoom
                    ? peerSocialOnline === true
                      ? 'Đang hoạt động • Tin nhắn riêng'
                      : peerSocialOnline === false
                        ? 'Offline • Tin nhắn riêng'
                        : 'Tin nhắn riêng'
                    : roomTypeNorm
                      ? `${roomTypeNorm === 'group' ? 'Nhóm chat' : roomTypeNorm} • Đang tham gia${
                          onlineCount != null && memberCount != null
                            ? ` • ${onlineCount}/${memberCount} online`
                            : ''
                        }`
                      : `Phòng chat${
                          onlineCount != null && memberCount != null ? ` • ${onlineCount}/${memberCount} online` : ''
                        }`}
                  {hasMore ? <span className="moji-chat__room-sub-hint"> · Cuộn lên xem tin cũ</span> : null}
                </p>
              </div>
            </div>
            {setRightPanelOpen && (
              <div className="moji-chat__room-head-actions">
                {!needsJoin && room ? (
                  <div className="moji-chat__room-menu-wrap" ref={roomMenuRef}>
                    <button
                      type="button"
                      className={`moji-chat__room-quick-btn ${roomMenuOpen ? 'moji-chat__room-quick-btn--on' : ''}`}
                      title="Tùy chọn phòng"
                      aria-expanded={roomMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => setRoomMenuOpen((o) => !o)}
                    >
                      ⋮
                    </button>
                    {roomMenuOpen ? (
                      <div className="moji-chat__room-menu-dropdown" role="menu">
                        <button type="button" role="menuitem" className="moji-chat__room-menu-item" onClick={() => { setRoomMenuOpen(false); void handleLeaveRoom(); }}>
                          {isDirectRoom ? 'Rời cuộc trò chuyện' : roomTypeNorm === 'group' ? 'Rời nhóm' : 'Rời phòng'}
                        </button>
                        {roomTypeNorm === 'group' ? (
                          <button
                            type="button"
                            role="menuitem"
                            className="moji-chat__room-menu-item moji-chat__room-menu-item--danger"
                            onClick={() => { setRoomMenuOpen(false); void handleDeleteGroupRoom(); }}
                          >
                            Xóa nhóm
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" className="moji-chat__room-quick-btn" title="Gọi điện (sắp có)" disabled>
                  📞
                </button>
                <button type="button" className="moji-chat__room-quick-btn" title="Gọi video (sắp có)" disabled>
                  📹
                </button>
                {!isDirectRoom && (
                  <button type="button" className="moji-chat__room-quick-btn" title="Thêm thành viên (sắp có)" disabled>
                    👥
                  </button>
                )}
                <button
                  type="button"
                  className={`moji-chat__room-quick-btn ${rightPanelOpen ? 'moji-chat__room-quick-btn--on' : ''}`}
                  title="Thông tin hội thoại"
                  aria-pressed={!!rightPanelOpen}
                  onClick={() => setRightPanelOpen((v) => !v)}
                >
                  ℹ️
                </button>
              </div>
            )}
          </div>
        </header>

        {needsJoin && (
          <div className="moji-chat__join-banner" role="status">
            <p>Bạn chưa tham gia phòng này. Tham gia để xem và gửi tin nhắn.</p>
            <button type="button" className="moji-chat__join-btn" disabled={joining} onClick={handleJoin}>
              {joining ? 'Đang tham gia…' : 'Tham gia phòng'}
            </button>
          </div>
        )}

        {error && (
          <div className="moji-chat__banner-error" role="alert">
            {error}
          </div>
        )}

        {keywordWarning && (
          <div className="moji-chat__banner-warn" role="status">
            {keywordWarning}
          </div>
        )}

        <div className="moji-chat__feed-outer moji-chat__feed-outer--pro">
        <div
          ref={feedRef}
          className="moji-chat__feed moji-chat__feed--zalo"
          onScroll={onFeedScroll}
        >
          {loadingOlder && (
            <p className="moji-chat__feed-loading-old" role="status">
              Đang tải tin cũ…
            </p>
          )}

          {pinnedPreview && !needsJoin ? (
            <div className="moji-chat__pinned-banner" role="status">
              <span className="moji-chat__pinned-banner-ico" aria-hidden>
                📌
              </span>
              <div className="moji-chat__pinned-banner-body">
                <span className="moji-chat__pinned-banner-label">Tin ghim</span>
                <span className="moji-chat__pinned-banner-who">{messageSenderLabel(pinnedPreview)}</span>
                <span className="moji-chat__pinned-banner-snippet">{pinnedBannerSnippet(pinnedPreview)}</span>
              </div>
            </div>
          ) : null}

          {messages.length === 0 && !needsJoin && (
            <p className="moji-chat__feed-empty">Chưa có tin nhắn. Hãy chào mọi người!</p>
          )}

          {/*
            Chat 1–1 (private): tin mình phải + màu nổi bật; tin đối phương trái, không tên (chỉ 2 người).
            Chat nhóm: tin người khác có avatar + tên; gom tin liên tiếp cùng người (chỉ hiện tên/avatar dòng đầu).
            Cuộn lên: load thêm tin cũ (cursor) — giống Moji_RealtimeChatApp ChatWindowBody.
          */}
          {messages.map((m, idx) => {
            const sid = messageSenderId(m, myId);
            const isOwn = myId != null && sid != null && idsMatch(sid, myId);
            const prev = idx > 0 ? messages[idx - 1] : null;
            const next = idx < messages.length - 1 ? messages[idx + 1] : null;
            const prevSid = prev ? messageSenderId(prev, myId) : null;
            const nextSid = next ? messageSenderId(next, myId) : null;
            const isNewSender = prevSid == null || prevSid !== sid;
            const peerLabel = messageSenderLabel(m);
            const peerInitial = peerAvatarLetter(m, isDirectRoom, peerUser);
            const rowKey = m.id ?? m.Id ?? `row-${idx}`;
            const t = formatTime(m.createdAt || m.CreatedAt);
            const curIso = m.createdAt || m.CreatedAt;
            const prevIso = prev ? prev.createdAt || prev.CreatedAt : null;
            const nextIso = next ? next.createdAt || next.CreatedAt : null;
            const showDateSep = shouldShowDateSeparator(prevIso, curIso);
            const showTimeCluster = shouldShowTimeCluster(prevIso, curIso);
            const nextBreaksClusterDate = next ? shouldShowDateSeparator(curIso, nextIso) : true;
            const nextBreaksClusterTime = next ? shouldShowTimeCluster(curIso, nextIso) : true;

            const clusterPrev =
              !!prev && prevSid === sid && !showDateSep && !showTimeCluster;
            const clusterNext =
              !!next && nextSid === sid && !nextBreaksClusterDate && !nextBreaksClusterTime;
            let bubbleGroup = 'single';
            if (clusterPrev && clusterNext) bubbleGroup = 'mid';
            else if (clusterPrev) bubbleGroup = 'last';
            else if (clusterNext) bubbleGroup = 'first';

            /** Nhóm: bắt buộc tên + avatar ở tin đầu của chuỗi cùng người gửi. */
            const showGroupHeader = !isDirectRoom && isNewSender;
            /** 1–1: avatar ở tin đầu chuỗi từ đối phương; nhóm: avatar + tên chỉ khi đổi người gửi. */
            const showPeerAvatar = !isOwn && (isDirectRoom ? isNewSender : showGroupHeader);
            /** Cùng người gửi, tin tiếp theo: giữ lề trái (cột trống = độ rộng avatar). */
            const showPeerSpacer = !isOwn && !showPeerAvatar && prevSid === sid;

            const bubbleGroupClass =
              bubbleGroup === 'single'
                ? ''
                : bubbleGroup === 'first'
                  ? ' moji-chat__bubble--grp-first'
                  : bubbleGroup === 'mid'
                    ? ' moji-chat__bubble--grp-mid'
                    : ' moji-chat__bubble--grp-last';

            const rowTightClass = clusterPrev ? ' moji-chat__row--tight' : '';
            const mid = m.id ?? m.Id;
            const replyParent = findMessageById(messages, m.replyToId ?? m.ReplyToId);

            if (isOwn) {
              return (
                <Fragment key={rowKey}>
                  {showDateSep && (
                    <div className="moji-chat__date-rule">
                      <span>{formatDateSeparator(curIso)}</span>
                    </div>
                  )}
                  {!showDateSep && showTimeCluster && (
                    <div className="moji-chat__time-cluster">{formatTimeShort(curIso)}</div>
                  )}
                  <article
                    className={`moji-chat__row moji-chat__row--own${rowTightClass}`}
                    aria-label="Tin nhắn của bạn"
                  >
                    <div className="moji-chat__msg-stack moji-chat__msg-stack--own">
                      <div className="moji-chat__msg-bubble-slot moji-chat__msg-bubble-slot--own">
                        <div className="moji-chat__msg-bubble-core">
                          <div className={`moji-chat__bubble moji-chat__bubble--own${bubbleGroupClass}`}>
                            <MessageReplyQuote parent={replyParent} isOwn />
                            {m.isPinned ? (
                              <span className="moji-chat__msg-pinned-badge" title="Tin đã ghim">
                                📌 Đã ghim
                              </span>
                            ) : null}
                            <MessageBody m={m} />
                          </div>
                          {!needsJoin ? (
                            <MessageReactionDock
                              disabled={needsJoin}
                              busy={reactionBusyMid === mid}
                              onPick={(emojiId) => void handleToggleReaction(mid, emojiId)}
                            />
                          ) : null}
                        </div>
                        {!needsJoin ? (
                          <div className="moji-chat__msg-quick-actions">
                            <button
                              type="button"
                              className="moji-chat__msg-quick-btn"
                              title="Trả lời"
                              aria-label="Trả lời tin nhắn"
                              onClick={() => setReplyingTo(m)}
                            >
                              <span className="moji-chat__msg-quick-btn-ico moji-chat__msg-quick-btn-ico--reply" aria-hidden>
                                ,,
                              </span>
                            </button>
                            {canPinMessages ? (
                              <button
                                type="button"
                                className="moji-chat__msg-quick-btn"
                                title={m.isPinned ? 'Bỏ ghim' : 'Ghim tin'}
                                aria-label={m.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                                onClick={() => void handlePinMessage(mid, !m.isPinned)}
                              >
                                <span className="moji-chat__msg-quick-btn-ico" aria-hidden>
                                  📌
                                </span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="moji-chat__msg-quick-btn moji-chat__msg-quick-btn--danger"
                              title="Thu hồi tin nhắn"
                              aria-label="Thu hồi tin nhắn"
                              disabled={recallBusyMid === mid || String(mid).startsWith('tmp-')}
                              onClick={() => void handleRecallMessage(mid)}
                            >
                              <span className="moji-chat__msg-quick-btn-ico" aria-hidden>
                                🗑
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {(m.reactions || []).length > 0 ? (
                        <div className="moji-chat__reactions-summary">
                          {(m.reactions || []).map((r, ri) => {
                            const em = r.emoji ?? r.Emoji;
                            const c = r.count ?? r.Count ?? 0;
                            return (
                              <span key={`${String(em)}-${ri}`} className="moji-chat__reaction-chip">
                                {reactionLabel(em)} <small>{c}</small>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="moji-chat__row-meta moji-chat__row-meta--own">
                        <span className="moji-chat__bubble-time">{t}</span>
                        {idx === messages.length - 1 && (
                          <span className="moji-chat__bubble-seen">Đã xem</span>
                        )}
                      </div>
                    </div>
                  </article>
                </Fragment>
              );
            }

            return (
              <Fragment key={rowKey}>
                {showDateSep && (
                  <div className="moji-chat__date-rule">
                    <span>{formatDateSeparator(curIso)}</span>
                  </div>
                )}
                {!showDateSep && showTimeCluster && (
                  <div className="moji-chat__time-cluster">{formatTimeShort(curIso)}</div>
                )}
                <article
                  className={`moji-chat__row moji-chat__row--peer${rowTightClass} ${showPeerSpacer ? 'moji-chat__row--peer-continue' : ''}`}
                  aria-label={isDirectRoom ? 'Tin nhắn' : `Tin từ ${peerLabel}`}
                >
                {showPeerAvatar && (
                  <div
                    className="moji-chat__msg-avatar moji-chat__msg-avatar--peer"
                    aria-hidden
                    title={peerLabel}
                  >
                    {peerInitial}
                  </div>
                )}
                {showPeerSpacer && <div className="moji-chat__msg-avatar-spacer" aria-hidden />}
                <div className="moji-chat__msg-stack moji-chat__msg-stack--peer">
                  {isDirectRoom && isNewSender && directPeerLine && (
                    <div className="moji-chat__msg-peer-name">{directPeerLine}</div>
                  )}
                  {showGroupHeader && <div className="moji-chat__msg-peer-name">{peerLabel}</div>}
                  <div className="moji-chat__msg-bubble-slot moji-chat__msg-bubble-slot--peer">
                    <div className="moji-chat__msg-bubble-core">
                      <div className={`moji-chat__bubble moji-chat__bubble--peer${bubbleGroupClass}`}>
                        <MessageReplyQuote parent={replyParent} isOwn={false} />
                        {m.isPinned ? (
                          <span className="moji-chat__msg-pinned-badge" title="Tin đã ghim">
                            📌 Đã ghim
                          </span>
                        ) : null}
                        <MessageBody m={m} />
                      </div>
                      {!needsJoin ? (
                        <MessageReactionDock
                          disabled={needsJoin}
                          busy={reactionBusyMid === mid}
                          onPick={(emojiId) => void handleToggleReaction(mid, emojiId)}
                        />
                      ) : null}
                    </div>
                    {!needsJoin ? (
                      <div className="moji-chat__msg-quick-actions">
                        <button
                          type="button"
                          className="moji-chat__msg-quick-btn"
                          title="Trả lời"
                          aria-label="Trả lời tin nhắn"
                          onClick={() => setReplyingTo(m)}
                        >
                          <span className="moji-chat__msg-quick-btn-ico moji-chat__msg-quick-btn-ico--reply" aria-hidden>
                            ,,
                          </span>
                        </button>
                        {canPinMessages ? (
                          <button
                            type="button"
                            className="moji-chat__msg-quick-btn"
                            title={m.isPinned ? 'Bỏ ghim' : 'Ghim tin'}
                            aria-label={m.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                            onClick={() => void handlePinMessage(mid, !m.isPinned)}
                          >
                            <span className="moji-chat__msg-quick-btn-ico" aria-hidden>
                              📌
                            </span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {(m.reactions || []).length > 0 ? (
                    <div className="moji-chat__reactions-summary">
                      {(m.reactions || []).map((r, ri) => {
                        const em = r.emoji ?? r.Emoji;
                        const c = r.count ?? r.Count ?? 0;
                        return (
                          <span key={`${String(em)}-${ri}`} className="moji-chat__reaction-chip">
                            {reactionLabel(em)} <small>{c}</small>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="moji-chat__row-meta moji-chat__row-meta--peer">
                    <span className="moji-chat__bubble-time">{t}</span>
                  </div>
                </div>
              </article>
              </Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {showJumpLatest ? (
          <button
            type="button"
            className="moji-chat__jump-latest"
            onClick={handleJumpToLatest}
            title="Cuộn xuống tin mới nhất"
          >
            Tin mới nhất ↓
          </button>
        ) : null}
        </div>

        <div className="moji-chat__composer-wrap moji-chat__composer-wrap--pro">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="moji-chat__hidden-input"
            aria-hidden
            tabIndex={-1}
            onChange={onPickImageFile}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="moji-chat__hidden-input"
            aria-hidden
            tabIndex={-1}
            onChange={onPickAttachFile}
          />
          <form className="moji-chat__composer moji-chat__composer--stacked" onSubmit={sendMessage}>
            {replyingTo ? (
              <div className="moji-chat__composer-reply" role="status">
                <div className="moji-chat__composer-reply-inner">
                  <span className="moji-chat__composer-reply-label">Trả lời</span>
                  <span className="moji-chat__composer-reply-who">{messageSenderLabel(replyingTo)}</span>
                  <span className="moji-chat__composer-reply-snippet">
                    {(replyingTo.content ?? replyingTo.Content ?? '').slice(0, 100) || '…'}
                  </span>
                </div>
                <button
                  type="button"
                  className="moji-chat__composer-reply-dismiss"
                  aria-label="Hủy trả lời"
                  onClick={() => setReplyingTo(null)}
                >
                  ✕
                </button>
              </div>
            ) : null}
            {pendingMedia ? (
              <div className="moji-chat__composer-media-preview" role="status">
                {pendingMedia.kind === 'image' ? (
                  <img src={pendingMedia.dataUrl} alt="" className="moji-chat__composer-media-thumb" />
                ) : (
                  <span className="moji-chat__composer-file-label">
                    📎 {pendingMedia.meta?.name || 'Tệp'}
                  </span>
                )}
                <button
                  type="button"
                  className="moji-chat__composer-media-dismiss"
                  aria-label="Bỏ ảnh hoặc file"
                  onClick={() => setPendingMedia(null)}
                >
                  ✕
                </button>
              </div>
            ) : null}
            <div className="moji-chat__composer-tools" aria-label="Công cụ soạn tin">
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Chèn emoji"
                disabled={needsJoin}
                onClick={() => {
                  setStickerPopoverOpen(false);
                  setSharePopoverOpen(false);
                  setEmojiPopoverOpen((v) => !v);
                }}
              >
                😊
              </button>
              <button type="button" className="moji-chat__composer-tool" title="GIF (sắp có)" disabled>
                GIF
              </button>
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Gửi ảnh"
                disabled={needsJoin}
                onClick={() => {
                  setEmojiPopoverOpen(false);
                  setStickerPopoverOpen(false);
                  setSharePopoverOpen(false);
                  imageInputRef.current?.click();
                }}
              >
                🖼
              </button>
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Đính kèm file"
                disabled={needsJoin}
                onClick={() => {
                  setEmojiPopoverOpen(false);
                  setStickerPopoverOpen(false);
                  setSharePopoverOpen(false);
                  fileInputRef.current?.click();
                }}
              >
                📎
              </button>
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Gắn @username"
                disabled={needsJoin}
                onClick={() => {
                  setEmojiPopoverOpen(false);
                  setStickerPopoverOpen(false);
                  setSharePopoverOpen(false);
                  openMentionPicker();
                }}
              >
                @
              </button>
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Sticker thành tích"
                disabled={needsJoin}
                onClick={() => {
                  setEmojiPopoverOpen(false);
                  setSharePopoverOpen(false);
                  setStickerPopoverOpen((v) => !v);
                }}
              >
                ⭐
              </button>
              <button
                type="button"
                className="moji-chat__composer-tool"
                title="Chia sẻ bài học / thành tích"
                disabled={needsJoin}
                onClick={() => {
                  setEmojiPopoverOpen(false);
                  setStickerPopoverOpen(false);
                  setSharePopoverOpen((v) => !v);
                }}
              >
                📤
              </button>
            </div>
            {emojiPopoverOpen ? (
              <div className="moji-chat__popover moji-chat__popover--emoji" role="group" aria-label="Emoji nhanh">
                {COMPOSER_QUICK_EMOJI.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    className="moji-chat__popover-emoji-btn"
                    onClick={() => {
                      setDraft((d) => `${d}${emo}`);
                      setEmojiPopoverOpen(false);
                    }}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            ) : null}
            {stickerPopoverOpen ? (
              <div className="moji-chat__popover moji-chat__popover--stickers" role="list" aria-label="Sticker thành tích">
                {ACHIEVEMENT_STICKERS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="moji-chat__sticker-pick"
                    onClick={() =>
                      sendStickerPayload(
                        { key: s.key, emoji: s.emoji, title: s.title, subtitle: s.subtitle },
                        'sticker'
                      )
                    }
                  >
                    <span className="moji-chat__sticker-pick-ico" aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="moji-chat__sticker-pick-txt">
                      <strong>{s.title}</strong>
                      <small>{s.subtitle}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {sharePopoverOpen ? (
              <div className="moji-chat__popover moji-chat__popover--share" role="group" aria-label="Chia sẻ nhanh">
                <button
                  type="button"
                  className="moji-chat__share-pick"
                  onClick={() =>
                    sendStickerPayload(
                      {
                        emoji: '📚',
                        title: 'Bài học: Hiragana cơ bản',
                        courseName: 'JLPT N5 — Bài 1',
                        lessonUrl: `${window.location.origin}/learn`,
                      },
                      'lesson_share'
                    )
                  }
                >
                  <span aria-hidden>📚</span> Chia sẻ bài học (mẫu)
                </button>
                <button
                  type="button"
                  className="moji-chat__share-pick"
                  onClick={() =>
                    sendStickerPayload(
                      {
                        emoji: '🏅',
                        title: 'Thành tích mới',
                        subtitle: 'Hoàn thành bài kiểm tra tuần',
                        points: 120,
                      },
                      'achievement_share'
                    )
                  }
                >
                  <span aria-hidden>🏅</span> Chia sẻ thành tích (mẫu)
                </button>
              </div>
            ) : null}
            <div className="moji-chat__composer-input-row">
              <div className="moji-chat__composer-input-wrap">
                <input
                  type="text"
                  className="moji-chat__input"
                  placeholder={needsJoin ? 'Tham gia phòng để nhắn tin…' : 'Nhập tin nhắn… (@để gắn thẻ)'}
                  value={draft}
                  onChange={onDraftChange}
                  disabled={needsJoin}
                  aria-label="Nội dung tin nhắn"
                  autoComplete="off"
                />
                {mentionOpen && !needsJoin && mentionCandidates.length > 0 ? (
                  <ul className="moji-chat__mention-list" role="listbox" aria-label="Gợi ý thành viên">
                    {mentionCandidates.map((mem) => {
                      const un = mem.username ?? mem.Username ?? '';
                      const dn = mem.displayName ?? mem.DisplayName ?? '';
                      return (
                        <li key={String(mem.userId ?? mem.UserId ?? un)}>
                          <button
                            type="button"
                            className="moji-chat__mention-item"
                            role="option"
                            onClick={() => pickMention(un)}
                          >
                            <span className="moji-chat__mention-un">@{un}</span>
                            {dn ? <span className="moji-chat__mention-dn">{dn}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <button type="submit" className="moji-chat__send" aria-label="Gửi" disabled={needsJoin}>
                ➤
              </button>
            </div>
          </form>
        </div>
      </div>
      )}
    </YumeChatLayout>
  );
}
