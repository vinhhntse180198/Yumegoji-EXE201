import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { fetchMyAchievements } from '../../services/gameService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export default function PlayAchievements() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await fetchMyAchievements();
        if (!c) setList(data);
      } catch (e) {
        if (!c) {
          setList([]);
          setErr(e?.response?.data?.message || e?.message || 'Không tải được thành tích.');
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const stats = useMemo(() => {
    const earned = list.filter((a) => pick(a, 'earned', 'Earned')).length;
    return { earned, total: list.length };
  }, [list]);

  return (
    <div className="play-game play-achievements">
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">Thành tích EXP</h1>
      </header>

      {!loading && list.length > 0 ? (
        <p className="play-ach__summary">
          Đã mở khóa <strong>{stats.earned}</strong> / {stats.total} — phần thưởng (EXP/Xu) cộng khi đạt lần đầu qua
          game có API.
        </p>
      ) : null}

      {err ? <div className="play-game__err">{err}</div> : null}
      {loading ? <p className="play-game__muted">Đang tải…</p> : null}

      <ul className="play-ach__list">
        {list.map((a) => {
          const earned = pick(a, 'earned', 'Earned');
          const earnedAt = pick(a, 'earnedAt', 'EarnedAt');
          const rexp = pick(a, 'rewardExp', 'RewardExp') ?? 0;
          const rxu = pick(a, 'rewardXu', 'RewardXu') ?? 0;
          return (
            <li
              key={pick(a, 'id', 'Id')}
              className={`play-ach__item ${earned ? 'play-ach__item--earned' : ''}`}
            >
              <span className="play-ach__badge" aria-hidden>
                {earned ? '🏅' : '○'}
              </span>
              <div className="play-ach__body">
                <div className="play-ach__name">{pick(a, 'name', 'Name')}</div>
                <div className="play-ach__desc">{pick(a, 'description', 'Description')}</div>
                <div className="play-ach__rewards">
                  {rexp > 0 ? <span className="play-ach__pill">+{rexp} EXP</span> : null}
                  {rxu > 0 ? <span className="play-ach__pill play-ach__pill--xu">+{rxu} Xu</span> : null}
                </div>
                {earned && earnedAt ? (
                  <div className="play-ach__meta">Đạt: {new Date(earnedAt).toLocaleString()}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="play-ach__foot">
        <Link to={`${ROUTES.PLAY}/leaderboard`}>Bảng xếp hạng</Link>
      </p>
    </div>
  );
}
