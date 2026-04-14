import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MojiChatLayout } from '../../components/chat/MojiChatLayout';
import { chatService } from '../../services/chatService';
import { notifyChatInboxRevised } from '../../hooks/useChatUnreadTotal';
import { mergeJoinedForAcl } from '../../utils/chatRoomAcl';
import { useAuth } from '../../hooks/useAuth';

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function mergeRoomsById(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const r of safeArray(list)) {
      const id = r?.id ?? r?.Id;
      if (id != null) map.set(id, r);
    }
  }
  return [...map.values()];
}

function typeMeta(typeRaw) {
  const t = String(typeRaw || '').toLowerCase();
  if (t === 'public') return { key: 'public', label: 'Công khai' };
  if (t === 'level') return { key: 'level', label: 'Theo cấp' };
  if (t === 'group') return { key: 'group', label: 'Nhóm' };
  if (t === 'private') return { key: 'private', label: 'Riêng' };
  return { key: t || 'other', label: String(typeRaw || 'Phòng') };
}

/** Minh họa phẳng (phòng khách) — tương tự mẫu Modern Chat Hub */
function ChatHubHeroIllustration() {
  return (
    <svg
      className="moji-chat__discover-hero-svg"
      viewBox="0 0 420 280"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="chub-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect width="420" height="280" rx="18" fill="#fff4e6" />
      <rect x="24" y="36" width="120" height="88" rx="10" fill="#fff" stroke="#fde68a" strokeWidth="2" />
      <rect x="32" y="44" width="104" height="72" rx="6" fill="url(#chub-sky)" />
      <rect x="160" y="48" width="236" height="8" rx="4" fill="#fed7aa" opacity="0.55" />
      <ellipse cx="210" cy="248" rx="170" ry="22" fill="#f5e0d0" opacity="0.65" />
      <rect x="72" y="168" width="200" height="56" rx="14" fill="#d4a574" />
      <rect x="64" y="188" width="216" height="36" rx="12" fill="#c49a6c" />
      <circle cx="130" cy="132" r="22" fill="#fecdd3" />
      <ellipse cx="130" cy="178" rx="28" ry="36" fill="#fda4af" />
      <circle cx="210" cy="118" r="24" fill="#fde68a" />
      <ellipse cx="210" cy="172" rx="30" ry="40" fill="#fcd34d" />
      <circle cx="292" cy="128" r="22" fill="#bbf7d0" />
      <ellipse cx="292" cy="176" rx="28" ry="38" fill="#86efac" />
      <rect x="320" y="156" width="36" height="52" rx="6" fill="#a78bfa" opacity="0.35" />
      <rect x="332" y="132" width="12" height="28" rx="3" fill="#fde047" opacity="0.9" />
      <circle cx="338" cy="124" r="16" fill="#fef08a" />
      <rect x="40" y="198" width="14" height="40" rx="3" fill="#86efac" />
      <ellipse cx="47" cy="192" rx="20" ry="10" fill="#4ade80" />
    </svg>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [discoverRooms, setDiscoverRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyRoomId, setBusyRoomId] = useState(null);
  const [q, setQ] = useState('');
  const [showLounge, setShowLounge] = useState(true);
  const [openMenuRoomId, setOpenMenuRoomId] = useState(null);
  const discoverRef = useRef(null);
  const discoverSearchRef = useRef(null);

  const myById = useMemo(() => {
    const m = new Map();
    for (const r of myRooms) {
      const id = r?.id ?? r?.Id;
      if (id != null) m.set(Number(id), r);
    }
    return m;
  }, [myRooms]);

  const loadDiscover = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, mine, pub, levelAll] = await Promise.all([
        chatService.getRoomCatalog().catch(() => []),
        chatService.getMyRooms({ limit: 100 }).catch(() => []),
        // Backend tự suy ra level từ userId → chỉ trả về Phòng chung + phòng đúng trình độ.
        chatService.getPublicRooms({ type: 'public', limit: 40 }).catch(() => []),
        chatService.getPublicRooms({ type: 'level', limit: 40 }).catch(() => []),
      ]);
      setCatalog(safeArray(cat));
      setMyRooms(safeArray(mine));

      // Chỉ ghép Phòng chung + phòng theo level tương ứng; không hiển thị group “ảo”.
      const levelMerged = mergeRoomsById([levelAll]);
      const merged = mergeRoomsById([pub, levelMerged]);

      // Lọc lại phía frontend: chỉ lấy Phòng chung + phòng đúng level của user (nếu biết).
      const myLevelId = user?.levelId ?? user?.LevelId ?? null;
      let filtered = merged;
      if (myLevelId != null) {
        const lvl = Number(myLevelId);
        filtered = merged.filter((r) => {
          const typeRaw = String(r.type ?? r.Type ?? '').toLowerCase();
          const slug = (r.slug ?? r.Slug ?? '').toLowerCase();
          const levelIdVal = r.levelId ?? r.LevelId;
          const levelNum = levelIdVal != null ? Number(levelIdVal) : null;

          // Phòng chung: type = public, slug = 'common' hoặc không gắn level.
          if (typeRaw === 'public' && (slug === 'common' || levelNum == null)) return true;

          // Phòng level: chỉ lấy level trùng với user.
          if (typeRaw === 'level' && levelNum != null && levelNum === lvl) return true;

          return false;
        });
      }

      setDiscoverRooms(filtered);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không tải được danh sách phòng.');
      setDiscoverRooms([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDiscover();
  }, [loadDiscover]);

  useEffect(() => {
    if (openMenuRoomId == null) return undefined;
    function onDocDown(e) {
      const root = discoverRef.current;
      if (root && !root.contains(e.target)) setOpenMenuRoomId(null);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [openMenuRoomId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return discoverRooms;
    return discoverRooms.filter((r) => {
      const name = (r.name || r.Name || '').toLowerCase();
      const desc = (r.description || r.Description || '').toLowerCase();
      const slug = (r.slug || r.Slug || '').toLowerCase();
      return name.includes(s) || desc.includes(s) || slug.includes(s);
    });
  }, [discoverRooms, q]);

  async function handleJoin(roomId) {
    if (roomId == null) return;
    setBusyRoomId(roomId);
    setError('');
    try {
      await chatService.joinRoom(roomId);
      notifyChatInboxRevised();
      navigate(`/chat/room/${roomId}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không thể tham gia phòng.');
    } finally {
      setBusyRoomId(null);
    }
  }

  async function handleLeave(roomId, joined) {
    if (roomId == null) return;
    const isPrivate = String(joined?.type ?? joined?.Type ?? '').toLowerCase() === 'private';
    const msg = isPrivate
      ? 'Rời cuộc trò chuyện này? Bạn có thể mở lại sau.'
      : 'Rời phòng / nhóm? Với phòng công khai bạn có thể tham gia lại bất cứ lúc nào.';
    if (!window.confirm(msg)) return;
    setBusyRoomId(roomId);
    setError('');
    setOpenMenuRoomId(null);
    try {
      await chatService.leaveRoom(roomId);
      setMyRooms((prev) => prev.filter((r) => Number(r?.id ?? r?.Id) !== Number(roomId)));
      notifyChatInboxRevised();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Không rời được phòng.');
    } finally {
      setBusyRoomId(null);
    }
  }

  async function handleDeleteGroup(roomId) {
    if (roomId == null) return;
    if (!window.confirm('Xóa nhóm cho tất cả thành viên? Hành động này không hoàn tác.')) return;
    setBusyRoomId(roomId);
    setError('');
    setOpenMenuRoomId(null);
    try {
      await chatService.deleteRoom(roomId);
      const idN = Number(roomId);
      setMyRooms((prev) => prev.filter((r) => Number(r?.id ?? r?.Id) !== idN));
      setDiscoverRooms((prev) => prev.filter((r) => Number(r?.id ?? r?.Id) !== idN));
      notifyChatInboxRevised();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Không xóa được nhóm.';
      setError(msg);
    } finally {
      setBusyRoomId(null);
    }
  }

  function openRoom(roomId) {
    navigate(`/chat/room/${roomId}`);
  }

  return (
    <MojiChatLayout selectedRoomId={null}>
      <div ref={discoverRef} className="moji-chat__discover moji-chat__discover--lounge">
        {showLounge ? (
          <header className="moji-chat__discover-lounge">
            <div className="moji-chat__discover-hero-panel">
              <div className="moji-chat__discover-hero-art">
                <ChatHubHeroIllustration />
              </div>
              <div className="moji-chat__discover-hero-body">
                <h1 className="moji-chat__discover-hero-title">Chào mừng bạn đến với YumeGo-ji!</h1>
                <p className="moji-chat__discover-hero-desc">
                  Chúng mình chào mừng bạn đến với YumeGo-ji!
                </p>
                <div className="moji-chat__discover-hero-actions">
                  <button
                    type="button"
                    className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--primary"
                    onClick={() => {
                      setShowLounge(false);
                      requestAnimationFrame(() => discoverSearchRef.current?.focus());
                    }}
                  >
                    Bắt đầu trò chuyện mới
                  </button>
                  <button
                    type="button"
                    className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--ghost"
                    onClick={() => {
                      setShowLounge(false);
                      void loadDiscover();
                    }}
                  >
                    Khám phá cộng đồng
                  </button>
                </div>
              </div>
            </div>
            <div className="moji-chat__discover-feature-grid">
              <article className="moji-chat__discover-feature">
                <span className="moji-chat__discover-feature-ico" aria-hidden>
                  💬
                </span>
                <h3>Học ngôn ngữ</h3>
                <p>Trao đổi tự nhiên cùng bạn học.</p>
              </article>
              <article className="moji-chat__discover-feature">
                <span className="moji-chat__discover-feature-ico" aria-hidden>
                  👥
                </span>
                <h3>Phòng học ảo</h3>
                <p>Tham gia nhóm tập trung, thảo luận.</p>
              </article>
              <article className="moji-chat__discover-feature">
                <span className="moji-chat__discover-feature-ico moji-chat__discover-feature-ico--ai" aria-hidden>
                  AI
                </span>
                <h3>Tư vấn AI</h3>
                <p>Nhận gợi ý mở đầu hội thoại.</p>
              </article>
            </div>
          </header>
        ) : null}

        {!showLounge ? (
        <>
        <div className="moji-chat__discover-search-row">
          <label className="moji-chat__discover-search moji-chat__discover-search--pro">
            <span className="visually-hidden">Tìm phòng</span>
            <input
              ref={discoverSearchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên, mô tả…"
              aria-label="Tìm phòng"
            />
          </label>
          <button
            type="button"
            className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--ghost"
            onClick={() => setShowLounge(true)}
          >
            Về sảnh chờ
          </button>
        </div>

        {error && (
          <div className="moji-chat__banner-error" role="alert">
            {error}
          </div>
        )}

        {catalog.length > 0 && (
          <section className="moji-chat__discover-section">
            <h2 className="moji-chat__discover-section-title">Gợi ý theo đặc tả</h2>
            <ul className="moji-chat__catalog-chips">
              {catalog.map((c) => (
                <li key={c.key || c.Key || c.suggestedSlug}>
                  <span className="moji-chat__catalog-chip">
                    {(c.name || c.Name) ?? c.key}
                    {c.levelId != null || c.LevelId != null ? (
                      <span className="moji-chat__catalog-meta"> · Level {c.levelId ?? c.LevelId}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="moji-chat__discover-section" aria-busy={loading && filtered.length > 0}>
          <div className="moji-chat__discover-section-row">
            <h2 className="moji-chat__discover-section-title">Phòng có thể tham gia</h2>
            <button type="button" className="moji-chat__discover-refresh" onClick={loadDiscover} disabled={loading}>
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>

          {loading && filtered.length === 0 ? (
            <ul className="moji-chat__discover-skeleton-list" aria-hidden>
              {[1, 2, 3].map((k) => (
                <li key={k} className="moji-chat__discover-skeleton-card">
                  <span className="moji-chat__discover-skeleton-av" />
                  <span className="moji-chat__discover-skeleton-body">
                    <span className="moji-chat__discover-skeleton-line moji-chat__discover-skeleton-line--title" />
                    <span className="moji-chat__discover-skeleton-line moji-chat__discover-skeleton-line--desc" />
                  </span>
                </li>
              ))}
            </ul>
          ) : !loading && filtered.length === 0 ? (
            <p className="moji-chat__muted">
              Chưa có phòng khớp. Kiểm tra backend đã seed phòng hoặc thử từ khóa khác.
            </p>
          ) : (
            <ul className="moji-chat__discover-list moji-chat__discover-list--pro">
              {filtered.map((r) => {
                const id = r.id ?? r.Id;
                const idNum = Number(id);
                const name = r.name || r.Name || `Phòng #${id}`;
                const desc = r.description || r.Description || '';
                const typeRaw = r.type || r.Type || '';
                const tm = typeMeta(typeRaw);
                const joined = myById.get(idNum);
                const isJoined = !!joined;
                const mergedForAcl = mergeJoinedForAcl(r, joined);
                const unread = Number(joined?.unreadCount ?? joined?.UnreadCount ?? r.unreadCount ?? r.UnreadCount ?? 0) || 0;
                const busy = busyRoomId != null && Number(busyRoomId) === idNum;
                const menuOpen = openMenuRoomId != null && Number(openMenuRoomId) === idNum;

                const initial = String(name).trim().slice(0, 1).toUpperCase() || '?';

                return (
                  <li key={id}>
                    <article className="moji-chat__discover-card moji-chat__discover-card--pro">
                      <div className="moji-chat__discover-card-avatar" aria-hidden>
                        {initial}
                      </div>
                      <div className="moji-chat__discover-card-body">
                        <div className="moji-chat__discover-card-title-row">
                          <h3 className="moji-chat__discover-card-name">{name}</h3>
                          <span className={`moji-chat__discover-type moji-chat__discover-type--${tm.key}`}>{tm.label}</span>
                          {isJoined ? (
                            <span className="moji-chat__discover-joined-pill">Đã tham gia</span>
                          ) : null}
                          {unread > 0 ? (
                            <span className="moji-chat__discover-unread-badge" title={`${unread} tin chưa đọc`}>
                              {unread > 99 ? '99+' : unread}
                            </span>
                          ) : null}
                        </div>
                        {desc ? <p className="moji-chat__discover-card-desc">{desc}</p> : null}
                      </div>
                      <div className="moji-chat__discover-card-actions moji-chat__discover-card-actions--pro">
                        {isJoined ? (
                          <button
                            type="button"
                            className="moji-chat__discover-btn moji-chat__discover-btn--primary"
                            disabled={busy}
                            onClick={() => openRoom(id)}
                          >
                            Vào chat
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="moji-chat__discover-btn moji-chat__discover-btn--primary"
                            disabled={busy}
                            onClick={() => handleJoin(id)}
                          >
                            {busy ? '…' : 'Tham gia'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="moji-chat__discover-btn moji-chat__discover-btn--ghost"
                          disabled={busy}
                          onClick={() => openRoom(id)}
                        >
                          Xem trước
                        </button>
                        {isJoined ? (
                          <div className="moji-chat__discover-card-menu">
                            <button
                              type="button"
                              className={`moji-chat__discover-menu-trigger ${menuOpen ? 'moji-chat__discover-menu-trigger--open' : ''}`}
                              aria-expanded={menuOpen}
                              aria-haspopup="menu"
                              aria-label={`Tùy chọn ${name}`}
                              disabled={busy}
                              onClick={() => setOpenMenuRoomId(menuOpen ? null : idNum)}
                            >
                              ⋮
                            </button>
                            {menuOpen ? (
                              <div className="moji-chat__discover-menu-dropdown" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="moji-chat__discover-menu-item"
                                  onClick={() => void handleLeave(id, mergedForAcl ?? joined)}
                                >
                                  {String((mergedForAcl ?? joined)?.type ?? (mergedForAcl ?? joined)?.Type ?? '')
                                    .toLowerCase() === 'private'
                                    ? 'Rời cuộc trò chuyện'
                                    : tm.key === 'group'
                                      ? 'Rời nhóm'
                                      : 'Rời phòng'}
                                </button>
                                {tm.key === 'group' ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="moji-chat__discover-menu-item moji-chat__discover-menu-item--danger"
                                    onClick={() => void handleDeleteGroup(id)}
                                  >
                                    Xóa nhóm
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        </>
        ) : null}
      </div>
    </MojiChatLayout>
  );
}
