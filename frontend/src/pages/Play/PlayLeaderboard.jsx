import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { fetchLeaderboard } from '../../services/gameService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export default function PlayLeaderboard() {
  const [period, setPeriod] = useState('weekly');
  const [sortBy, setSortBy] = useState('score');
  const [gameSlug, setGameSlug] = useState('');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [levelId, setLevelId] = useState('');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const lid = levelId.trim();
    const n = lid === '' ? null : Number(lid);
    return {
      period,
      sortBy,
      gameSlug: gameSlug.trim() || null,
      friendsOnly,
      levelId: Number.isFinite(n) && n > 0 ? n : null,
    };
  }, [period, sortBy, gameSlug, friendsOnly, levelId]);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const list = await fetchLeaderboard(query);
        if (!c) setRows(list);
      } catch (e) {
        if (!c) {
          setRows([]);
          setErr(
            e?.response?.status === 401
              ? 'Cần đăng nhập để xem bảng bạn bè.'
              : e?.response?.data?.message ||
                e?.message ||
                'Không tải được bảng xếp hạng.',
          );
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [query]);

  return (
    <div className="play-game play-leaderboard">
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">Bảng xếp hạng</h1>
      </header>

      <p className="play-lb__intro">
        Điểm cập nhật khi bạn <strong>kết thúc phiên game qua API</strong> (không áp dụng chế độ luyện chỉ trên máy).
      </p>

      <div className="play-lb__filters">
        <label className="play-lb__field">
          <span>Kỳ</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="weekly">Tuần</option>
            <option value="monthly">Tháng</option>
          </select>
        </label>
        <label className="play-lb__field">
          <span>Sắp xếp</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Điểm cao</option>
            <option value="accuracy">Độ chính xác</option>
            <option value="speed">Tốc độ (ms TB ↓)</option>
          </select>
        </label>
        <label className="play-lb__field">
          <span>Game (slug, tuỳ chọn)</span>
          <input
            type="text"
            placeholder="hiragana-match"
            value={gameSlug}
            onChange={(e) => setGameSlug(e.target.value)}
          />
        </label>
        <label className="play-lb__field">
          <span>Cấp độ (id DB, tuỳ chọn)</span>
          <input
            type="number"
            min={1}
            placeholder="vd. id N5"
            value={levelId}
            onChange={(e) => setLevelId(e.target.value)}
          />
        </label>
        <label className="play-lb__check">
          <input
            type="checkbox"
            checked={friendsOnly}
            onChange={(e) => setFriendsOnly(e.target.checked)}
          />
          Chỉ bạn bè
        </label>
      </div>

      {err ? <div className="play-game__err">{err}</div> : null}
      {loading ? <p className="play-game__muted">Đang tải…</p> : null}

      {!loading && rows.length === 0 && !err ? (
        <p className="play-game__muted">Chưa có dữ liệu. Chơi game qua API và kết thúc phiên để cập nhật điểm.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="play-lb__table-wrap">
          <table className="play-lb__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Người chơi</th>
                <th>JLPT</th>
                <th>Điểm</th>
                <th>Chính xác TB</th>
                <th>Trận</th>
                <th>Combo max</th>
                <th>TB ms</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={pick(r, 'userId', 'UserId')}>
                  <td>{pick(r, 'rank', 'Rank')}</td>
                  <td>{pick(r, 'displayName', 'DisplayName')}</td>
                  <td>{pick(r, 'levelCode', 'LevelCode') ?? '—'}</td>
                  <td>{pick(r, 'score', 'Score')}</td>
                  <td>{Number(pick(r, 'accuracyAvg', 'AccuracyAvg') ?? 0).toFixed(1)}%</td>
                  <td>{pick(r, 'gamesPlayed', 'GamesPlayed')}</td>
                  <td>{pick(r, 'bestCombo', 'BestCombo')}</td>
                  <td>{pick(r, 'avgDurationMs', 'AvgDurationMs') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="play-lb__foot">
        <Link to={`${ROUTES.PLAY}/achievements`}>Thành tích</Link>
      </p>
    </div>
  );
}
