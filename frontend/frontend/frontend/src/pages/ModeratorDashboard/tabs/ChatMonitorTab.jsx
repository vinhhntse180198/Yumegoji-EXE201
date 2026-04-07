import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../../../features/chat/services/chatService';
import { modChatRooms, modSensitiveKeywordsDefault } from '../mockModerator';

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  return `${Math.floor(hr / 24)} ngày trước`;
}

function mergeRoomsById(arrays) {
  const map = new Map();
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      const id = r?.id ?? r?.Id;
      if (id == null) continue;
      if (!map.has(id)) map.set(id, r);
    }
  }
  return Array.from(map.values()).sort((a, b) => String(a.name ?? a.Name ?? '').localeCompare(String(b.name ?? b.Name ?? ''), 'vi'));
}

function roomDisplayName(r) {
  return r.name ?? r.Name ?? '—';
}

function roomNumericId(r) {
  const id = r.id ?? r.Id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : NaN;
}

function rowMessagesCount(r) {
  const n = r.messageCount ?? r.MessageCount ?? r.messages;
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Gọi API members (có presence) + messages cho vài phòng công khai — moderator không cần join phòng.
 */
async function buildModerationFeedFromRooms(rooms, keywordsLower) {
  const real = rooms.filter((r) => !r._fallback && Number.isFinite(roomNumericId(r)));
  const sortedByMsg = [...real].sort((a, b) => rowMessagesCount(b) - rowMessagesCount(a));
  const forMsgs = sortedByMsg.slice(0, 5);
  const forOnline = real.slice(0, 12);

  const onlineByUser = new Map();
  await Promise.all(
    forOnline.map(async (room) => {
      const rid = roomNumericId(room);
      try {
        const members = await chatService.getRoomMembers(rid, { limit: 200, includeOnline: true });
        const rn = roomDisplayName(room);
        for (const m of members) {
          const online = m.isOnline === true || m.IsOnline === true;
          if (!online) continue;
          const uid = m.userId ?? m.UserId;
          if (onlineByUser.has(uid)) continue;
          const un = m.username ?? m.Username ?? m.displayName ?? m.DisplayName ?? `#${uid}`;
          const seen = m.presenceLastSeenAt ?? m.PresenceLastSeenAt;
          onlineByUser.set(uid, {
            id: `ou-${uid}`,
            userId: uid,
            username: un,
            room: rn,
            since: formatRelativeTime(seen),
          });
        }
      } catch {
        /* bỏ qua phòng lỗi */
      }
    }),
  );

  const collected = [];
  await Promise.all(
    forMsgs.map(async (room) => {
      const rid = roomNumericId(room);
      try {
        const page = await chatService.getRoomMessages(rid, { limit: 20 });
        const items = page?.items ?? page?.Items ?? [];
        const rn = roomDisplayName(room);
        for (const msg of items) {
          collected.push({ msg, roomName: rn });
        }
      } catch {
        /* */
      }
    }),
  );

  collected.sort(
    (a, b) =>
      new Date(b.msg.createdAt ?? b.msg.CreatedAt ?? 0).getTime() -
      new Date(a.msg.createdAt ?? a.msg.CreatedAt ?? 0).getTime(),
  );

  const kws = (keywordsLower || []).map((k) => String(k).toLowerCase()).filter(Boolean);
  const messages = collected.slice(0, 36).map(({ msg, roomName }) => {
    const text = String(msg.content ?? msg.Content ?? '');
    const lower = text.toLowerCase();
    const flagged = kws.some((k) => k && lower.includes(k));
    const mid = msg.id ?? msg.Id;
    const user =
      msg.senderUsername ??
      msg.SenderUsername ??
      msg.senderDisplayName ??
      msg.SenderDisplayName ??
      '?';
    return {
      id: `lm-${mid}-${roomName}`,
      room: roomName,
      user,
      text,
      at: formatRelativeTime(msg.createdAt ?? msg.CreatedAt),
      flagged,
    };
  });

  return { online: Array.from(onlineByUser.values()), messages };
}

const DATA_IMAGE_RE = /^data:image\/[^;]+;base64,/i;

/** Hiển thị nội dung tin: ảnh base64 → <img>; văn bản dài → khung có max-height + cuộn nội bộ. */
function ModerationMessageBody({ text }) {
  const raw = String(text ?? '');
  const trimmed = raw.trim();
  if (trimmed && DATA_IMAGE_RE.test(trimmed)) {
    return (
      <span className="mod-dash__live-body mod-dash__live-body--media">
        <span className="mod-dash__live-media-label">Ảnh</span>
        <img
          src={trimmed}
          alt="Ảnh gửi trong chat"
          className="mod-dash__live-inline-img"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }
  return <span className="mod-dash__live-body">{raw}</span>;
}

const LS_KW = 'yumegoji_mod_sensitive_keywords';

export function ChatMonitorTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [keywords, setKeywords] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KW);
      return raw ? JSON.parse(raw) : [...modSensitiveKeywordsDefault];
    } catch {
      return [...modSensitiveKeywordsDefault];
    }
  });
  const [kwInput, setKwInput] = useState('');

  const keywordList = useMemo(() => keywords.filter(Boolean), [keywords]);
  const keywordsRef = useRef(keywordList);
  keywordsRef.current = keywordList;

  const liveFeedDisplayed = useMemo(() => {
    const kws = keywordList.map((k) => String(k).toLowerCase()).filter(Boolean);
    return liveFeed.map((m) => ({
      ...m,
      flagged: kws.some((k) => m.text.toLowerCase().includes(k)),
    }));
  }, [liveFeed, keywordList]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUsedFallback(false);
    setFeedError(null);
    try {
      const [pub, lvl, grp] = await Promise.all([
        chatService.getPublicRooms({ type: 'public', limit: 80 }),
        chatService.getPublicRooms({ type: 'level', limit: 80 }),
        chatService.getPublicRooms({ type: 'group', limit: 80 }),
      ]);
      const merged = mergeRoomsById([pub, lvl, grp]);
      setRows(merged);
      setFeedLoading(true);
      try {
        const kLower = keywordsRef.current.map((k) => String(k).toLowerCase());
        const snap = await buildModerationFeedFromRooms(merged, kLower);
        setOnlineUsers(snap.online);
        setLiveFeed(snap.messages);
      } catch (fe) {
        setFeedError(fe?.message || 'Không tải được online / tin nhắn gần đây.');
        setOnlineUsers([]);
        setLiveFeed([]);
      } finally {
        setFeedLoading(false);
      }
    } catch (e) {
      setError(e?.message || 'Không tải phòng chat');
      setRows(modChatRooms.map((m) => ({ ...m, _fallback: true })));
      setUsedFallback(true);
      setOnlineUsers([]);
      setLiveFeed([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Làm mới luồng online + tin (giữ checklist từ khóa hiện tại). */
  const refreshFeed = useCallback(async () => {
    if (rows.length === 0 || rows.some((r) => r._fallback)) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const kLower = keywordsRef.current.map((k) => String(k).toLowerCase());
      const snap = await buildModerationFeedFromRooms(rows, kLower);
      setOnlineUsers(snap.online);
      setLiveFeed(snap.messages);
    } catch (fe) {
      setFeedError(fe?.message || 'Không tải được online / tin nhắn.');
    } finally {
      setFeedLoading(false);
    }
  }, [rows]);

  function rowName(r) {
    return r.name ?? r.Name ?? '—';
  }
  function rowMessages(r) {
    const n = r.messageCount ?? r.MessageCount ?? r.messages;
    const num = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(num) ? num : 0;
  }
  function rowOnline(r) {
    const n = r.onlineMemberCount ?? r.OnlineMemberCount ?? r.online;
    const num = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(num) ? num : 0;
  }
  function rowLastActivity(r) {
    if (r._fallback) return r.lastActivity;
    const lm = r.lastMessage ?? r.LastMessage;
    return formatRelativeTime(lm?.createdAt ?? lm?.CreatedAt);
  }
  function rowActive(r) {
    if (r._fallback) return r.active;
    return (r.isActive ?? r.IsActive) !== false;
  }

  function addKeyword() {
    const t = kwInput.trim().toLowerCase();
    if (!t || keywordList.includes(t)) return;
    const next = [...keywordList, t];
    setKeywords(next);
    localStorage.setItem(LS_KW, JSON.stringify(next));
    setKwInput('');
  }

  function removeKeyword(k) {
    const next = keywordList.filter((x) => x !== k);
    setKeywords(next);
    localStorage.setItem(LS_KW, JSON.stringify(next));
  }

  return (
    <div className="mod-dash__panel-stack">
      <div className="mod-dash__panel">
        <div className="mod-dash__panel-head mod-dash__panel-head--row">
          <div>
            <h2 className="mod-dash__panel-title">Phòng chat đang hoạt động</h2>
            <p className="mod-dash__panel-desc">
              Danh sách phòng công khai / theo cấp / nhóm — số tin và online từ API. Ghim tin:{' '}
              <code className="mod-dash__code">POST /api/Chat/rooms/&#123;id&#125;/messages/&#123;msg&#125;/pin</code> (moderator).
            </p>
          </div>
          <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={load} disabled={loading}>
            ⟳ Làm mới
          </button>
        </div>
        {error ? (
          <p className="mod-dash__inline-hint mod-dash__inline-hint--warn" role="status">
            {error}
            {usedFallback ? ' — dữ liệu mẫu.' : null}
          </p>
        ) : null}
        {loading ? <p className="mod-dash__muted mod-dash__inline-hint">Đang tải…</p> : null}
        <div className="mod-dash__table-wrap">
          <table className="mod-dash__table">
            <thead>
              <tr>
                <th>Phòng</th>
                <th>Online</th>
                <th>Tin nhắn</th>
                <th>Hoạt động</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((room) => {
                const key = room.id ?? room.Id ?? room.name;
                return (
                  <tr key={key}>
                    <td>
                      <strong>{rowName(room)}</strong>
                    </td>
                    <td>
                      <span className="mod-dash__online">
                        <span className="mod-dash__online-ico" aria-hidden>
                          👥
                        </span>
                        {rowOnline(room)}
                      </span>
                    </td>
                    <td>{rowMessages(room)} tin</td>
                    <td className="mod-dash__muted">{rowLastActivity(room)}</td>
                    <td>
                      {rowActive(room) ? (
                        <span className="mod-dash__status-ok">
                          <span className="mod-dash__pulse-dot" aria-hidden />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="mod-dash__muted">Tạm dừng</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mod-dash__panel">
        <div className="mod-dash__panel-head mod-dash__panel-head--row">
          <div>
            <h3 className="mod-dash__subsection-title">Người dùng online</h3>
            <p className="mod-dash__subsection-desc">
              Dữ liệu từ <code className="mod-dash__code">GET /api/Chat/rooms/&#123;id&#125;/members?includeOnline=true</code> (moderator) —
              đồng bộ bảng presence (heartbeat ~45s).
            </p>
          </div>
          <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={refreshFeed} disabled={loading || feedLoading || usedFallback}>
            ⟳ Cập nhật luồng
          </button>
        </div>
        {feedError ? (
          <p className="mod-dash__inline-hint mod-dash__inline-hint--warn" role="status">
            {feedError}
          </p>
        ) : null}
        {feedLoading && !loading ? <p className="mod-dash__muted mod-dash__inline-hint">Đang tải online / tin…</p> : null}
        {!feedLoading && onlineUsers.length === 0 && !usedFallback ? (
          <p className="mod-dash__muted">Không có thành viên đang online trong các phòng đang quét (hoặc chưa có heartbeat).</p>
        ) : null}
        <div className="mod-dash__pill-grid">
          {onlineUsers.map((u) => (
            <div key={u.id} className="mod-dash__user-chip">
              <strong>@{u.username}</strong>
              <span className="mod-dash__muted">
                {' '}
                · {u.room} · {u.since}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mod-dash__panel">
        <h3 className="mod-dash__subsection-title">Luồng tin nhắn gần đây</h3>
        <p className="mod-dash__subsection-desc">
          Lấy từ <code className="mod-dash__code">GET /api/Chat/rooms/&#123;id&#125;/messages</code> (moderator đọc được phòng public/level/group dù chưa join).
          Tô màu theo từ khóa cục bộ bên dưới; realtime đầy đủ: SignalR hub <code className="mod-dash__code">/hubs/chat</code>.
        </p>
        {liveFeed.length === 0 && !feedLoading && !loading && !usedFallback ? (
          <p className="mod-dash__muted">Chưa có tin trong các phòng vừa quét hoặc chưa có tin gần đây.</p>
        ) : null}
        {liveFeedDisplayed.length > 0 ? (
          <div className="mod-dash__live-feed-scroll" role="region" aria-label="Lịch sử tin nhắn — cuộn trong khung">
            <ul className="mod-dash__live-feed">
              {liveFeedDisplayed.map((m) => (
                <li key={m.id} className={`mod-dash__live-item ${m.flagged ? 'mod-dash__live-item--flag' : ''}`}>
                  <span className="mod-dash__live-meta">
                    {m.room} · {m.at}
                  </span>
                  <strong>@{m.user}</strong>
                  <span className="mod-dash__live-colon">: </span>
                  <ModerationMessageBody text={m.text} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mod-dash__panel">
        <h3 className="mod-dash__subsection-title">Từ khóa nhạy cảm (cấu hình cục bộ)</h3>
        <p className="mod-dash__subsection-desc">
          Backend đã có kiểm tra từ khóa khi gửi tin; danh sách dưới đây lưu trên trình duyệt để mod thống nhất checklist (API cấu hình chung có thể bổ sung sau).
        </p>
        <div className="mod-dash__kw-row">
          <input
            className="mod-dash__input"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            placeholder="Thêm từ khóa…"
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          />
          <button type="button" className="mod-dash__btn mod-dash__btn--primary" onClick={addKeyword}>
            Thêm
          </button>
        </div>
        <div className="mod-dash__pill-grid">
          {keywordList.map((k) => (
            <button key={k} type="button" className="mod-dash__kw-pill" onClick={() => removeKeyword(k)} title="Click để xóa">
              {k} ✕
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
