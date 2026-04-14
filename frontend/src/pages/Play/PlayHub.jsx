import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchExpLeaderboard,
  fetchGames,
  fetchGameInventory,
  fetchLeaderboard,
} from '../../services/gameService';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import {
  artBadgeCyanHolo,
  artBadgeNeonPink,
  artBossBattle,
  artCardFlashcardVocab,
  artCardHiragana,
  artCardKatakana,
  artCardMultipleChoice,
  artDailyChallenge,
  artKanjiMemoryStones,
  artKanjiPuzzle,
  artPowerup5050,
  artPowerupDouble,
  artPowerupHeart,
  artPowerupSkip,
  artPowerupTimeFreeze,
  artPvpSamurai,
  artSentenceBuilder,
  artVocabSpeed,
} from '../../assets/play';

const STATIC_FALLBACK = [
  {
    slug: 'hiragana-match',
    name: 'Hiragana Match',
    description: 'Chọn đúng romaji cho chữ Hiragana (mỗi câu 10 giây).',
    skillType: 'hiragana',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 1,
  },
  {
    slug: 'katakana-match',
    name: 'Katakana Match',
    description: 'Tương tự Hiragana — chọn romaji đúng cho Katakana (10 giây/câu).',
    skillType: 'katakana',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 2,
  },
  {
    slug: 'kanji-memory',
    name: 'Kanji Memory',
    description: 'Lật thẻ ghép Kanji (hoặc từ) với nghĩa tiếng Việt — memory game.',
    skillType: 'kanji',
    levelMin: 'N5',
    levelMax: 'N5',
    sortOrder: 3,
  },
  {
    slug: 'vocabulary-speed-quiz',
    name: 'Vocabulary Speed Quiz',
    description: 'Quiz từ vựng phản xạ nhanh (8 giây mỗi câu).',
    skillType: 'vocabulary',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 4,
  },
  {
    slug: 'sentence-builder',
    name: 'Sentence Builder',
    description: 'Sắp xếp các từ tiếng Nhật thành câu hoàn chỉnh.',
    skillType: 'grammar',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 5,
  },
  {
    slug: 'counter-quest',
    name: 'Counter Quest',
    description: 'Chọn cách đếm đúng với trợ từ đếm (〜人、〜枚、〜本…).',
    skillType: 'counters',
    levelMin: 'N5',
    levelMax: 'N4',
    sortOrder: 6,
  },
  {
    slug: 'flashcard-vocabulary',
    name: 'Flashcard Battle',
    description: 'Đấu tốc độ với Bot AI (bot trả lời đúng ~70% số vòng).',
    skillType: 'vocabulary',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 7,
  },
  {
    slug: 'boss-battle',
    name: 'Boss Battle',
    description: 'Đánh Boss bằng kiến thức — có thanh HP Boss và thanh “Bạn” (theo mạng).',
    skillType: 'mixed',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 8,
    isBossMode: true,
  },
  {
    slug: 'daily-challenge',
    name: 'Daily Challenge',
    description: 'Mix 15 câu hỏi từ nhiều chủ đề — thử thách mỗi ngày.',
    skillType: 'mixed',
    levelMin: 'N5',
    levelMax: 'N3',
    sortOrder: 9,
  },
];

/** Ghi đè tên/mô tả/thứ tự từ đặc tả 9 game khi API trả về bản cũ. */
/** Ẩn khỏi hub theo yêu cầu (không xóa khỏi DB). */
const HUB_HIDDEN_GAME_SLUGS = new Set(['fill-in-blank', 'fill-blank']);

const HUB_STATIC_META_BY_SLUG = Object.fromEntries(
  STATIC_FALLBACK.map((row) => [
    row.slug,
    {
      name: row.name,
      description: row.description,
      skillType: row.skillType,
      levelMin: row.levelMin,
      levelMax: row.levelMax,
      sortOrder: row.sortOrder,
      isBossMode: row.isBossMode,
    },
  ]),
);

const RANK_TIERS = [
  { label: 'Bronze', minExp: 0 },
  { label: 'Silver', minExp: 5000 },
  { label: 'Gold', minExp: 15000 },
  { label: 'Platinum', minExp: 30000 },
];

const POWERUP_ROWS = [
  {
    slug: 'fifty-fifty',
    label: '50:50',
    desc: 'Loại bỏ 2 đáp án sai',
    img: artPowerup5050,
    hint: 'Dùng trong phiên game (API)',
  },
  {
    slug: 'time-freeze',
    label: 'Time Freeze',
    desc: 'Mỗi lần dùng: +5 giây cho đồng hồ câu hiện tại',
    img: artPowerupTimeFreeze,
    hint: null,
  },
  {
    slug: 'double-points',
    label: 'Double Points',
    desc: 'Nhân đôi điểm câu đúng kế tiếp',
    img: artPowerupDouble,
    hint: null,
  },
  {
    slug: 'skip',
    label: 'Skip',
    desc: 'Bỏ qua câu (không mất mạng)',
    img: artPowerupSkip,
    hint: null,
  },
  {
    slug: 'heart',
    label: 'Heart',
    desc: 'Hồi phục 1 mạng',
    img: artPowerupHeart,
    hint: null,
  },
];

const REWARD_CARDS = [
  { icon: '💎', title: 'EXP points', desc: 'Lên level tài khoản' },
  { icon: '🪙', title: 'Xu trong game', desc: 'Đổi vật phẩm, power-ups' },
  { icon: '🏅', title: 'Huy hiệu', desc: 'Trang trí profile' },
  { icon: '🎀', title: 'Danh hiệu', desc: 'Hiển thị bên cạnh tên' },
  { icon: '🎨', title: 'Sticker độc quyền', desc: 'Dùng trong chat' },
  { icon: '👑', title: 'Premium miễn phí', desc: 'Ngày dùng thử Premium' },
  { icon: '🖼️', title: 'Khung avatar', desc: 'Khung avatar đặc biệt' },
];

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function formatIntVi(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(x));
}

function normalizeGameRow(g) {
  const slug = pick(g, 'slug', 'Slug');
  if (!slug) return null;
  const sm = HUB_STATIC_META_BY_SLUG[slug];
  return {
    slug,
    name: sm?.name || pick(g, 'name', 'Name') || slug,
    description: sm?.description || pick(g, 'description', 'Description') || '',
    skillType: sm?.skillType || pick(g, 'skillType', 'SkillType') || '',
    levelMin: sm?.levelMin || pick(g, 'levelMin', 'LevelMin') || pick(g, 'level_min', 'level_min') || '',
    levelMax: sm?.levelMax || pick(g, 'levelMax', 'LevelMax') || pick(g, 'level_max', 'level_max') || '',
    maxHearts: pick(g, 'maxHearts', 'MaxHearts'),
    isPvp: !!(pick(g, 'isPvp', 'IsPvp') ?? pick(g, 'is_pvp')),
    isBossMode: !!(pick(g, 'isBossMode', 'IsBossMode') ?? pick(g, 'is_boss_mode') ?? sm?.isBossMode),
    sortOrder: Number(
      sm?.sortOrder ?? pick(g, 'sortOrder', 'SortOrder') ?? pick(g, 'sort_order') ?? 0,
    ),
    fromApi: !!g.fromApi,
  };
}

function levelBadge(g) {
  const a = String(g.levelMin || '').trim();
  const b = String(g.levelMax || '').trim();
  if (a && b && a !== b) return `${a}–${b}`;
  if (a) return a;
  if (b) return b;
  return 'N5';
}

function coverForGame(g) {
  if (g.isPvp) return artPvpSamurai;
  const map = {
    'hiragana-match': artCardHiragana,
    'katakana-match': artCardKatakana,
    'flashcard-vocabulary': artCardFlashcardVocab,
    'flashcard-battle': artCardFlashcardVocab,
    'multiple-choice': artCardMultipleChoice,
    'fill-in-blank': artBadgeCyanHolo,
    'listen-choose': artBadgeNeonPink,
    'kanji-memory': artKanjiMemoryStones,
    'vocabulary-speed-quiz': artVocabSpeed,
    'sentence-builder': artSentenceBuilder,
    'counter-quest': artKanjiPuzzle,
    'boss-battle': artBossBattle,
    'daily-challenge': artDailyChallenge,
  };
  return map[g.slug] || artBadgeCyanHolo;
}

function themeClass(g) {
  if (g.isPvp) return 'play-dash__gcard--pvp';
  if (g.isBossMode) return 'play-dash__gcard--boss';
  const slug = g.slug;
  if (slug === 'hiragana-match') return 'play-dash__gcard--pink';
  if (slug === 'katakana-match') return 'play-dash__gcard--green';
  if (slug === 'kanji-memory' || slug === 'counter-quest') return 'play-dash__gcard--gold';
  if (slug === 'vocabulary-speed-quiz' || slug === 'listen-choose' || slug === 'flashcard-battle')
    return 'play-dash__gcard--blue';
  if (slug === 'sentence-builder') return 'play-dash__gcard--purple';
  return 'play-dash__gcard--neutral';
}

function expBarFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  let idx = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (e >= RANK_TIERS[i].minExp) {
      idx = i;
      break;
    }
  }
  const cur = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1];
  if (!next) {
    return { pct: 100, line: `${formatIntVi(e)} XP`, sub: cur.label };
  }
  const span = next.minExp - cur.minExp;
  const pct = Math.min(100, Math.round(((e - cur.minExp) / span) * 100));
  return {
    pct,
    line: `${formatIntVi(e)} / ${formatIntVi(next.minExp)}`,
    sub: `${cur.label} → ${next.label}`,
  };
}

function displayLevelFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  return Math.min(99, 1 + Math.floor(e / 250));
}

export default function PlayHub() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [lbRows, setLbRows] = useState([]);
  const [expTopRows, setExpTopRows] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchGames();
        const raw = Array.isArray(list) && list.length > 0 ? list : STATIC_FALLBACK;
        const mapped = raw
          .map((row) => normalizeGameRow({ ...row, fromApi: Array.isArray(list) && list.length > 0 }))
          .filter(Boolean)
          .filter((g) => g.slug && !HUB_HIDDEN_GAME_SLUGS.has(g.slug));
        if (!cancelled) {
          setGames(mapped);
          setLoadError(Array.isArray(list) && list.length === 0 ? 'API trả về danh sách rỗng — hiển thị bản dự phòng.' : '');
        }
      } catch {
        if (!cancelled) {
          setGames(
            STATIC_FALLBACK.map((row) => normalizeGameRow({ ...row, fromApi: false }))
              .filter(Boolean)
              .filter((g) => g.slug && !HUB_HIDDEN_GAME_SLUGS.has(g.slug)),
          );
          setLoadError('Không tải được danh sách game từ server — đang dùng bản dự phòng.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadInventory = useCallback(async () => {
    try {
      const inv = await fetchGameInventory();
      setInventory(inv);
    } catch {
      setInventory(null);
    }
  }, []);

  useEffect(() => {
    reloadInventory();
  }, [reloadInventory]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadInventory();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadInventory);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadInventory);
    };
  }, [reloadInventory]);

  const reloadLeaderboard = useCallback(async () => {
    try {
      const rows = await fetchLeaderboard({ period: 'weekly', sortBy: 'score' });
      setLbRows(Array.isArray(rows) ? rows.slice(0, 5) : []);
    } catch {
      setLbRows([]);
    }
  }, []);

  useEffect(() => {
    reloadLeaderboard();
  }, [reloadLeaderboard]);

  const reloadExpTop = useCallback(async () => {
    try {
      const rows = await fetchExpLeaderboard(10);
      setExpTopRows(Array.isArray(rows) ? rows : []);
    } catch {
      setExpTopRows([]);
    }
  }, []);

  useEffect(() => {
    reloadExpTop();
  }, [reloadExpTop]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadLeaderboard();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadLeaderboard);
    const t = window.setInterval(reloadLeaderboard, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadLeaderboard);
      window.clearInterval(t);
    };
  }, [reloadLeaderboard]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') reloadExpTop();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', reloadExpTop);
    const t = window.setInterval(reloadExpTop, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', reloadExpTop);
      window.clearInterval(t);
    };
  }, [reloadExpTop]);

  const reloadSummary = useCallback(async () => {
    try {
      const s = await fetchMyProgressSummary();
      setSummary(s);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  useEffect(() => {
    const onRefresh = () => {
      void reloadSummary();
      void reloadInventory();
    };
    window.addEventListener('yume-play-exp-refresh', onRefresh);
    return () => window.removeEventListener('yume-play-exp-refresh', onRefresh);
  }, [reloadSummary, reloadInventory]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void reloadSummary();
        void reloadInventory();
      }
    };
    const onFocus = () => {
      void reloadSummary();
      void reloadInventory();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadSummary, reloadInventory]);

  const ordered = useMemo(
    () => [...games].sort((a, b) => (a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.slug.localeCompare(b.slug))),
    [games],
  );

  const displayName = useMemo(() => {
    return user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'NihongoMaster';
  }, [user]);

  const exp = pick(summary, 'exp', 'Exp') ?? pick(user, 'exp', 'Exp') ?? 0;
  const streakDays = pick(summary, 'streakDays', 'StreakDays') ?? 0;
  const xu = pick(summary, 'xu', 'Xu') ?? pick(user, 'xu', 'Xu', 'coins', 'Coins') ?? 0;
  const expUi = expBarFromExp(exp);
  const pseudoLevel = displayLevelFromExp(exp);

  const invQty = (slug) => {
    const items = inventory?.items ?? inventory?.Items ?? [];
    const row = items.find((i) => (i.slug ?? i.Slug) === slug);
    return row ? (row.quantityOwned ?? row.QuantityOwned ?? 0) : 0;
  };

  const myLbRank =
    lbRows.findIndex((r) => {
      const id = pick(r, 'userId', 'UserId');
      const uid = user?.id ?? user?.userId;
      return id != null && uid != null && String(id) === String(uid);
    }) + 1;

  return (
    <div className="play-dash">
      <header className="play-dash__nav">
        <div className="play-dash__brand">
          <span className="play-dash__brand-icon" aria-hidden>
            ⚔️
          </span>
          <span className="play-dash__brand-text">NIHONGOQUEST</span>
        </div>
        <div className="play-dash__nav-stats">
          <span className="play-dash__pill play-dash__pill--coin">
            <span aria-hidden>🪙</span> {formatIntVi(xu)}
          </span>
          <span className="play-dash__pill play-dash__pill--streak">
            <span aria-hidden>🔥</span> {formatIntVi(streakDays)}
          </span>
          <span className="play-dash__pill play-dash__pill--level">
            <span className="play-dash__lvl-ring">{pseudoLevel}</span>
          </span>
        </div>
      </header>

      <section className="play-dash__hero">
        <div className="play-dash__hero-inner">
          <h1 className="play-dash__hero-title">
            Xin chào, <strong>{displayName}</strong>!
          </h1>
          <p className="play-dash__hero-lead">
            Hôm nay bạn đã sẵn sàng chinh phục tiếng Nhật chưa? Daily Challenge đang chờ bạn!
          </p>
          <div className="play-dash__hero-actions">
            <Link className="play-dash__btn play-dash__btn--daily" to={`${ROUTES.PLAY}/daily`}>
              ⚔️ Daily Challenge
            </Link>
            <Link className="play-dash__btn play-dash__btn--quick" to={`${ROUTES.PLAY}/hiragana-match`}>
              🎮 Quick Match
            </Link>
          </div>
        </div>
      </section>

      <div className="play-dash__columns">
        <div className="play-dash__main">
          {loadError ? <div className="play-dash__warn">{loadError}</div> : null}
          {loading ? <p className="play-dash__muted">Đang tải danh sách game…</p> : null}

          <div className="play-dash__section-head">
            <h2 className="play-dash__h2">
              <span className="play-dash__h2-icon" aria-hidden>
                🎮
              </span>
              Trò chơi
            </h2>
            <span className="play-dash__count">{ordered.length} games</span>
          </div>

          <ul className="play-dash__game-grid">
            {ordered.map((g) => (
              <li key={g.slug} className={`play-dash__gcard ${themeClass(g)}`}>
                <div className="play-dash__gcard-badges">
                  <span className="play-dash__gcard-badge">{levelBadge(g)}</span>
                  {g.isPvp ? <span className="play-dash__tag">PvP</span> : null}
                  {g.isBossMode ? <span className="play-dash__tag play-dash__tag--boss">Boss</span> : null}
                </div>
                <div className="play-dash__gcard-art-wrap">
                  <img className="play-dash__gcard-art" src={coverForGame(g)} alt="" />
                </div>
                <h3 className="play-dash__gcard-title">{g.name}</h3>
                <p className="play-dash__gcard-cat">{g.skillType || 'Luyện tập'}</p>
                <p className="play-dash__gcard-desc">{g.description || '—'}</p>
                <Link
                  className="play-dash__playnow"
                  to={g.isPvp ? `${ROUTES.PLAY}/pvp` : `${ROUTES.PLAY}/${g.slug}`}
                >
                  PLAY NOW
                </Link>
              </li>
            ))}
          </ul>

          <section className="play-dash__panel" aria-labelledby="dash-powerups">
            <div className="play-dash__section-head play-dash__section-head--tight">
              <h2 id="dash-powerups" className="play-dash__h2 play-dash__h2--inline">
                <span aria-hidden>⚡</span> Vật phẩm (Power-ups)
              </h2>
              <Link className="play-dash__link-more" to={`${ROUTES.PLAY}/shop`}>
                Cửa hàng xu →
              </Link>
            </div>
            <p className="play-dash__hint">
              Số lượng từ túi đồ API — dùng trong lúc chơi (phiên game đang mở). Mua thêm bằng xu tại cửa hàng.
            </p>
            <ul className="play-dash__power-grid">
              {POWERUP_ROWS.map((p) => (
                <li key={p.slug} className="play-dash__power-card">
                  <span className="play-dash__power-qty">{formatIntVi(invQty(p.slug))}</span>
                  <img className="play-dash__power-img" src={p.img} alt="" />
                  <div className="play-dash__power-body">
                    <div className="play-dash__power-name">{p.label}</div>
                    <div className="play-dash__power-desc">{p.desc}</div>
                    {p.hint ? <div className="play-dash__power-foot">{p.hint}</div> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="play-dash__panel play-dash__panel--compact">
            <h2 className="play-dash__h2">
              <span aria-hidden>📦</span> Cách nhận vật phẩm
            </h2>
            <ul className="play-dash__dotlist">
              <li>Đăng nhập hàng ngày</li>
              <li>Hoàn thành daily challenge</li>
              <li>Chiến thắng trong PvP</li>
              <li>Mua bằng xu (kiếm từ game)</li>
              <li>Premium: nhận thêm mỗi ngày</li>
            </ul>
          </section>

          <section className="play-dash__panel play-dash__score" aria-labelledby="dash-score">
            <h2 id="dash-score" className="play-dash__h2">
              <span aria-hidden>📊</span> Cơ chế điểm số
            </h2>
            <div className="play-dash__score-cols">
              <ul className="play-dash__checklist">
                <li>✅ Trả lời đúng: +100 điểm cơ bản</li>
                <li>🔥 Combo: ×1.2 → ×1.5 → ×2.0</li>
              </ul>
              <ul className="play-dash__checklist">
                <li>⚡ Trả lời nhanh: + điểm thưởng</li>
                <li>❌ Sai: mất 1 mạng, reset combo</li>
              </ul>
            </div>
          </section>

          <section className="play-dash__panel" aria-labelledby="dash-exp-top">
            <div className="play-dash__section-head play-dash__section-head--tight">
              <h2 id="dash-exp-top" className="play-dash__h2">
                🏆 Top điểm
              </h2>
              <span className="play-dash__count">{expTopRows.length}/10</span>
            </div>
            <p className="play-dash__hint">Xếp hạng theo điểm tích lũy trên tài khoản.</p>
            {expTopRows.length === 0 ? (
              <p className="play-dash__muted">Chưa có dữ liệu bảng xếp hạng EXP.</p>
            ) : (
              <ol className="play-dash__exp-top-list">
                {expTopRows.map((r, i) => {
                  const uid = pick(r, 'userId', 'UserId');
                  const name = pick(r, 'displayName', 'DisplayName') || '—';
                  const ex = Number(pick(r, 'exp', 'Exp') ?? 0);
                  const me = user?.id != null && uid != null && String(uid) === String(user.id);
                  const label = pick(r, 'rank', 'Rank') ?? i + 1;
                  return (
                    <li key={String(uid ?? i)} className={`play-dash__exp-top-row ${me ? 'play-dash__exp-top-row--me' : ''}`}>
                      <span className="play-dash__exp-top-rank">#{label}</span>
                      <span className="play-dash__exp-top-name">
                        {name}
                        {me ? <span className="play-dash__exp-top-me"> (bạn)</span> : null}
                      </span>
                      <span className="play-dash__exp-top-score">{formatIntVi(ex)} XP</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="play-dash__panel" aria-labelledby="dash-rew">
            <h2 id="dash-rew" className="play-dash__h2">
              <span aria-hidden>💎</span> Phần thưởng
            </h2>
            <ul className="play-dash__rew-grid">
              {REWARD_CARDS.map((r) => (
                <li key={r.title} className="play-dash__rew-card">
                  <span className="play-dash__rew-ico" aria-hidden>
                    {r.icon}
                  </span>
                  <div className="play-dash__rew-title">{r.title}</div>
                  <div className="play-dash__rew-desc">{r.desc}</div>
                </li>
              ))}
            </ul>
          </section>

          <nav className="play-dash__links" aria-label="Liên kết nhanh">
            <Link to={`${ROUTES.PLAY}/shop`}>Cửa hàng vật phẩm</Link>
            <Link to={`${ROUTES.PLAY}/guide`}>Đặc tả 6.2–6.5</Link>
            <Link to={`${ROUTES.PLAY}/leaderboard`}>Bảng xếp hạng</Link>
            <Link to={ROUTES.DASHBOARD}>← Về Dashboard học tập</Link>
          </nav>
        </div>

        <aside className="play-dash__aside">
          <div className="play-dash__profile">
            <div className="play-dash__profile-ring">
              <span className="play-dash__profile-lv">{pseudoLevel}</span>
              <span className="play-dash__profile-lvlabel">LV</span>
            </div>
            <div className="play-dash__profile-text">
              <div className="play-dash__profile-name">{displayName}</div>
              <div className="play-dash__profile-sub">Kanji Hunter • Speed Demon</div>
            </div>
          </div>
          <div className="play-dash__expblock">
            <div className="play-dash__exprow">
              <span>EXP</span>
              <span>
                {expUi.line} <small className="play-dash__expsub">{expUi.sub}</small>
              </span>
            </div>
            <div className="play-dash__exptrack" role="progressbar" aria-valuenow={expUi.pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="play-dash__expfill" style={{ width: `${expUi.pct}%` }} />
            </div>
          </div>
          <div className="play-dash__ministats">
            <div>
              <div className="play-dash__ms-val">{formatIntVi(xu)}</div>
              <div className="play-dash__ms-lbl">Xu</div>
            </div>
            <div>
              <div className="play-dash__ms-val">{formatIntVi(streakDays)}</div>
              <div className="play-dash__ms-lbl">Streak</div>
            </div>
            <div>
              <div className="play-dash__ms-val">{myLbRank > 0 ? `#${myLbRank}` : '—'}</div>
              <div className="play-dash__ms-lbl">BXH tuần</div>
            </div>
          </div>

          <div className="play-dash__lb">
            <div className="play-dash__lb-head">
              <h3 className="play-dash__lb-title">🏆 Bảng xếp hạng tuần</h3>
              <Link to={`${ROUTES.PLAY}/leaderboard`} className="play-dash__lb-all">
                Xem tất cả →
              </Link>
            </div>
            <p className="play-dash__muted play-dash__shop-link">
              <Link to={`${ROUTES.PLAY}/shop`}>🛒 Cửa hàng xu</Link>
            </p>
            {lbRows.length === 0 ? (
              <p className="play-dash__muted">
                BXH tuần chưa có dữ liệu (cần điểm từ quiz có phiên API). Kanji Memory và mua xu vẫn cập nhật EXP/xu;
                thử F5 hoặc chơi Hiragana/Katakana/Vocab quiz để lên bảng.
              </p>
            ) : (
              <ol className="play-dash__lb-list">
                {lbRows.map((r, i) => {
                  const name = pick(r, 'displayName', 'DisplayName') || '—';
                  const score = pick(r, 'score', 'Score');
                  const uid = pick(r, 'userId', 'UserId');
                  const jlpt = pick(r, 'levelCode', 'LevelCode');
                  const me = user?.id != null && uid != null && String(uid) === String(user.id);
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                  return (
                    <li key={String(uid ?? i)} className={`play-dash__lb-row ${me ? 'play-dash__lb-row--me' : ''}`}>
                      <span className="play-dash__lb-medal">{medal}</span>
                      <span className="play-dash__lb-name">
                        {name}
                        {jlpt ? <span className="play-dash__lb-jlpt"> · {jlpt}</span> : null}
                      </span>
                      <span className="play-dash__lb-score">{formatIntVi(score)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <footer className="play-dash__footer">NIHONGOQUEST © 2026 · Backend .NET · Frontend React</footer>
    </div>
  );
}
