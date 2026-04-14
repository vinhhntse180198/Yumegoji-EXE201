import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { createPvpRoom, joinPvpRoom } from '../../services/gameService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export default function PlayPvpLobby() {
  const [gameSlug, setGameSlug] = useState('flashcard-battle');
  const [roomCode, setRoomCode] = useState('');
  const [created, setCreated] = useState(null);
  const [joined, setJoined] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setErr('');
    setBusy(true);
    setCreated(null);
    try {
      const r = await createPvpRoom({ gameSlug: gameSlug.trim() });
      setCreated(r);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không tạo được phòng.');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    setErr('');
    setBusy(true);
    setJoined(null);
    try {
      const code = roomCode.trim().toUpperCase();
      const r = await joinPvpRoom({ roomCode: code });
      setJoined(r);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không vào được phòng.');
    } finally {
      setBusy(false);
    }
  };

  const codeOut = pick(created, 'roomCode', 'RoomCode');
  const codeJoin = pick(joined, 'roomCode', 'RoomCode');

  return (
    <div className="play-game play-pvp">
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">PvP — Flashcard Battle</h1>
      </header>

      <p className="play-pvp__lead">
        Tạo phòng hoặc nhập mã phòng. Luồng đồng bộ real-time cần SignalR/socket (roadmap); hiện API chỉ quản lý phòng &amp;
        session.
      </p>

      {err ? <div className="play-game__err">{err}</div> : null}

      <section className="play-pvp__panel">
        <h2>Tạo phòng</h2>
        <label className="play-pvp__field">
          <span>Slug game</span>
          <input value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} placeholder="flashcard-battle" />
        </label>
        <button type="button" className="play-btn play-btn--primary" disabled={busy} onClick={onCreate}>
          Tạo mã phòng
        </button>
        {codeOut ? (
          <p className="play-pvp__code">
            Mã phòng: <strong>{codeOut}</strong> — gửi cho bạn bè để họ vào.
          </p>
        ) : null}
      </section>

      <section className="play-pvp__panel">
        <h2>Vào phòng</h2>
        <label className="play-pvp__field">
          <span>Mã phòng</span>
          <input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="VD: ABC12" />
        </label>
        <button type="button" className="play-btn play-btn--ghost" disabled={busy} onClick={onJoin}>
          Tham gia
        </button>
        {codeJoin ? (
          <p className="play-pvp__ok">
            Đã tham gia phòng <strong>{codeJoin}</strong>. Trạng thái:{' '}
            {pick(joined, 'status', 'Status') || '—'}
          </p>
        ) : null}
      </section>
    </div>
  );
}
