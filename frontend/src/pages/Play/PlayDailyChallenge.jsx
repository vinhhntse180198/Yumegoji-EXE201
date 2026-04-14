import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { fetchDailyChallenge } from '../../services/gameService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export default function PlayDailyChallenge() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const d = await fetchDailyChallenge();
        if (!c) setData(d);
      } catch (e) {
        if (!c) {
          setData(null);
          setErr(e?.response?.data?.message || e?.message || 'Không tải được thử thách hôm nay.');
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const slug = pick(data, 'gameSlug', 'GameSlug');
  const title = pick(data, 'title', 'Title') || 'Daily Challenge';
  const done = pick(data, 'completedToday', 'CompletedToday');
  const bonusExp = pick(data, 'bonusExp', 'BonusExp');
  const bonusXu = pick(data, 'bonusXu', 'BonusXu');

  return (
    <div className="play-game play-daily">
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">Daily Challenge</h1>
      </header>

      {loading ? <p className="play-game__muted">Đang tải…</p> : null}
      {err ? <div className="play-game__err">{err}</div> : null}

      {!loading && !err && !data ? (
        <p className="play-game__muted">
          Chưa cấu hình daily challenge trên server (hoặc bảng <code>daily_challenges</code> trống).
        </p>
      ) : null}

      {data ? (
        <div className="play-daily__card">
          <h2 className="play-daily__title">{title}</h2>
          {slug ? (
            <p className="play-daily__slug">
              Game: <code>{slug}</code>
            </p>
          ) : null}
          <p className="play-daily__meta">
            {bonusExp != null ? <>Thưởng EXP: <strong>+{bonusExp}</strong> · </> : null}
            {bonusXu != null ? <>Xu: <strong>+{bonusXu}</strong></> : null}
          </p>
          <p className="play-daily__status">{done ? '✅ Hôm nay bạn đã hoàn thành.' : '⬜ Chưa hoàn thành hôm nay.'}</p>
          {slug ? (
            <Link className="play-btn play-btn--primary" to={`${ROUTES.PLAY}/${slug}`}>
              Vào chơi
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
