import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion as motionFr, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import { YumeChatLayout } from '../../components/chat/YumeChatLayout';
import { chatService } from '../../services/chatService';
import { notifyChatInboxRevised } from '../../hooks/useChatUnreadTotal';
import { mergeJoinedForAcl } from '../../utils/chatRoomAcl';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../data/routes';
import { getJlptLevelCodeFromUser } from '../../utils/learnLevelCode';

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

/** Ảnh hero sảnh chat (mẫu Sakura Hub — người dùng cung cấp). */
const CHAT_LOBBY_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCiqI13wPsSaedqBDW5YO-DFhy06SHhgseBQ_poYDexBrjVwbWn_EHbiC0Y3C6LLQTByn0xD3-zHPelpT0vSrXmmWWu3ksk_jaVpDm10nN-OQtePrvgF5_vG8t_8qEzJnS9ADbO_70me5zv7RJ6VdR8xZfd8FqNlsPF-6o_o4ftknjXjaKP6cCFC45je-cXQpXsYTkfyC6uG-2sOS4a2U_M_oEwldbOjP8z6tRzT2WioSQdNCA28cQWkf7r4etAbKjMTnULh5rPS_A';

const Motion = motionFr;

const easeLobby = [0.22, 1, 0.36, 1];

/** Biến thể Framer cho sảnh chat — khi reduce motion: không trễ / không trượt. */
function chatLobbyMotionVariants(reduceMotion) {
  if (reduceMotion) {
    const instant = { hidden: {}, show: {} };
    return {
      hub: instant,
      inner: instant,
      hero: instant,
      heroCol: instant,
      featureGrid: instant,
      card: instant,
      fab: instant,
    };
  }
  return {
    hub: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { duration: 0.32, ease: easeLobby, staggerChildren: 0.2, delayChildren: 0.04 },
      },
    },
    inner: {
      hidden: { opacity: 0, y: 18 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.42, ease: easeLobby, staggerChildren: 0.16, delayChildren: 0.06 },
      },
    },
    hero: {
      hidden: { opacity: 0, y: 34 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.48, ease: easeLobby, staggerChildren: 0.12, delayChildren: 0.08 },
      },
    },
    heroCol: {
      hidden: { opacity: 0, y: 26 },
      show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeLobby } },
    },
    featureGrid: {
      hidden: { opacity: 0, y: 38 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.44, ease: easeLobby, staggerChildren: 0.11, delayChildren: 0.1 },
      },
    },
    card: {
      hidden: { opacity: 0, y: 40 },
      show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: easeLobby } },
    },
    fab: {
      hidden: { opacity: 0, scale: 0.88, y: 16 },
      show: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 26, delay: 0.42 },
      },
    },
  };
}

const lobbyCardHover = { y: -5, transition: { type: 'spring', stiffness: 420, damping: 24 } };

export default function ChatPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const lobbyMv = useMemo(() => chatLobbyMotionVariants(!!reduceMotion), [reduceMotion]);
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [discoverRooms, setDiscoverRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyRoomId, setBusyRoomId] = useState(null);
  const [q, setQ] = useState('');
  /** 'hero' = sảnh chào (1 cột); 'app' = khung chat 3 cột trên /chat, chưa vào phòng cụ thể */
  const [chatSurface, setChatSurface] = useState('hero');
  /** Trong shell: có hiện bảng duyệt phòng ở cột giữa hay chỉ màn chờ chọn hội thoại */
  const [browseRoomsOpen, setBrowseRoomsOpen] = useState(false);
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

  /** Bắt đầu trò chuyện: vào luôi layout 3 cột, không mở màn duyệt phòng toàn trang */
  function enterChatShellInbox() {
    setChatSurface('app');
    setBrowseRoomsOpen(false);
  }

  function openBrowseRoomsInShell() {
    setBrowseRoomsOpen(true);
    void loadDiscover();
    requestAnimationFrame(() => discoverSearchRef.current?.focus());
  }

  /** Khám phá cộng đồng / FAB / thẻ: vẫn 3 cột nhưng mở danh sách phòng trong cột giữa */
  function openDiscoverFromLobby() {
    setChatSurface('app');
    setBrowseRoomsOpen(true);
    void loadDiscover();
    requestAnimationFrame(() => discoverSearchRef.current?.focus());
  }

  function backToHeroLobby() {
    setChatSurface('hero');
    setBrowseRoomsOpen(false);
    setQ('');
    setOpenMenuRoomId(null);
  }

  const jlptCode = getJlptLevelCodeFromUser(user);
  const jlptProgressPct = useMemo(() => {
    const m = { N5: 42, N4: 52, N3: 68, N2: 78, N1: 88 };
    return m[jlptCode] ?? 50;
  }, [jlptCode]);

  if (chatSurface === 'hero') {
    return (
      <YumeChatLayout variant="lobby" selectedRoomId={null}>
        <div className="chat-lobby-root">
          <div className="chat-lobby-hub__sakura" aria-hidden>
            <SakuraRainLayer petalCount={22} buoyant />
          </div>
          <Motion.div
            className="chat-lobby-hub"
            variants={lobbyMv.hub}
            initial={reduceMotion ? false : 'hidden'}
            animate="show"
          >
            <Motion.div className="chat-lobby-hub__inner" variants={lobbyMv.inner}>
              <Motion.header className="chat-lobby-hero" variants={lobbyMv.hero}>
                <Motion.div className="chat-lobby-hero__copy" variants={lobbyMv.heroCol}>
                  <p className="chat-lobby-hero__kicker">Chào mừng trở lại</p>
                  <h1 className="chat-lobby-hero__title">
                    Chào mừng bạn đến với <em>YumeGo-ji!</em>
                  </h1>
                  <p className="chat-lobby-hero__lead">
                    Luyện nghe — nói — đọc — viết trong không gian học hiện đại. Chọn phòng phù hợp trình độ hoặc vào học
                    có hướng dẫn.
                  </p>
                  <div className="chat-lobby-hero__actions">
                    <button type="button" className="chat-lobby-btn chat-lobby-btn--primary" onClick={enterChatShellInbox}>
                      Bắt đầu trò chuyện
                    </button>
                    <button type="button" className="chat-lobby-btn chat-lobby-btn--ghost" onClick={openDiscoverFromLobby}>
                      Khám phá cộng đồng
                    </button>
                  </div>
                </Motion.div>
                <Motion.div className="chat-lobby-hero__visual" variants={lobbyMv.heroCol}>
                  <img
                    src={CHAT_LOBBY_HERO_IMAGE}
                    alt="Cổng đền và hoa anh đào — minh họa không gian học"
                    className="chat-lobby-hero__photo"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="chat-lobby-hero__progress-card">
                    <div className="chat-lobby-hero__progress-label">Tiến độ gợi ý</div>
                    <div className="chat-lobby-hero__progress-level">{jlptCode}</div>
                    <div className="chat-lobby-hero__progress-bar" role="presentation">
                      <span className="chat-lobby-hero__progress-fill" style={{ width: `${jlptProgressPct}%` }} />
                    </div>
                    <p className="chat-lobby-hero__progress-hint">Tham gia phòng và hoàn thành bài trên Học tập để tăng tiến độ.</p>
                  </div>
                </Motion.div>
              </Motion.header>

              <Motion.section className="chat-lobby-features" aria-label="Lối vào nhanh" variants={lobbyMv.featureGrid}>
                <Motion.article className="chat-lobby-card" variants={lobbyMv.card} whileHover={lobbyCardHover}>
                  <span className="chat-lobby-card__ico" aria-hidden>
                    💬
                  </span>
                  <h2 className="chat-lobby-card__title">Học ngôn ngữ</h2>
                  <p className="chat-lobby-card__desc">Trao đổi tự nhiên cùng bạn học trong phòng theo cấp.</p>
                  <button type="button" className="chat-lobby-card__link" onClick={() => navigate(ROUTES.LEARN)}>
                    Tìm hiểu thêm →
                  </button>
                </Motion.article>
                <Motion.article className="chat-lobby-card" variants={lobbyMv.card} whileHover={lobbyCardHover}>
                  <span className="chat-lobby-card__ico" aria-hidden>
                    👥
                  </span>
                  <h2 className="chat-lobby-card__title">Phòng học ảo</h2>
                  <p className="chat-lobby-card__desc">Tham gia phòng công khai hoặc nhóm — thảo luận real-time.</p>
                  <button type="button" className="chat-lobby-card__link" onClick={openDiscoverFromLobby}>
                    Tham gia phòng →
                  </button>
                </Motion.article>
                <Motion.article className="chat-lobby-card" variants={lobbyMv.card} whileHover={lobbyCardHover}>
                  <span className="chat-lobby-card__ico chat-lobby-card__ico--ai" aria-hidden>
                    AI
                  </span>
                  <h2 className="chat-lobby-card__title">Tư vấn AI</h2>
                  <p className="chat-lobby-card__desc">Gợi ý mở đầu hội thoại và ôn tập nhanh khi có phòng AI.</p>
                  <button type="button" className="chat-lobby-card__link" onClick={openDiscoverFromLobby}>
                    Mở danh sách phòng →
                  </button>
                </Motion.article>
              </Motion.section>
            </Motion.div>

            <Motion.button
              type="button"
              className="chat-lobby-fab"
              title="Mở danh sách phòng chat"
              aria-label="Mở danh sách phòng chat"
              variants={lobbyMv.fab}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              onClick={openDiscoverFromLobby}
            >
              <span aria-hidden>💬</span>
            </Motion.button>
          </Motion.div>
        </div>
      </YumeChatLayout>
    );
  }

  return (
    <YumeChatLayout variant="full" selectedRoomId={null}>
      <div ref={discoverRef} className="chat-lobby-root chat-app-shell">
        <div className="chat-app-shell__toolbar">
          <button type="button" className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--ghost" onClick={backToHeroLobby}>
            Về sảnh chờ
          </button>
          {browseRoomsOpen ? (
            <button
              type="button"
              className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--ghost"
              onClick={() => setBrowseRoomsOpen(false)}
            >
              Đóng danh sách phòng
            </button>
          ) : (
            <button type="button" className="moji-chat__discover-hero-btn moji-chat__discover-hero-btn--primary" onClick={openBrowseRoomsInShell}>
              Duyệt phòng công khai
            </button>
          )}
        </div>

        <div className="chat-app-shell__body">
          {browseRoomsOpen ? (
            <>
        <div className="chat-lobby-discover moji-chat__discover-search-row">
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
          ) : (
            <div className="moji-chat__empty chat-app-shell-empty" role="status">
              <div className="moji-chat__empty-bubble" aria-hidden>
                ···
              </div>
              <h2 className="moji-chat__empty-title">Chưa chọn hội thoại</h2>
              <p className="moji-chat__empty-desc">
                Bạn đang ở khung chat — chọn một phòng hoặc bạn bè ở cột trái để mở tin nhắn, hoặc bấm &quot;Duyệt phòng công
                khai&quot; để tham gia phòng mới. Bạn chưa bị đưa vào phòng nào cho đến khi bấm vào đó.
              </p>
            </div>
          )}
        </div>
      </div>
    </YumeChatLayout>
  );
}
