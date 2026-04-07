import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SpeakJaButton from '../../components/learn/SpeakJaButton';
import { ROUTES } from '../../constants/routes';
import { N5_LESSONS } from '../../data/n5BeginnerCourse';
import { completeKanjiMemoryRewards } from '../../services/gameService';
import {
  extractKanjiMemoryPairsFromN5Lessons,
  pickRandomPairs,
} from '../../utils/kanjiMemoryFromLessons';

const DEFAULT_PAIR_TARGET = 8;
const MIN_PAIRS = 4;
const YUME_PLAY_EXP_REFRESH = 'yume-play-exp-refresh';

function pickReward(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCardsFromPairs(pairs) {
  const raw = [];
  pairs.forEach((p, idx) => {
    const pairId = idx;
    raw.push({
      id: `k-${pairId}`,
      pairId,
      kind: 'kanji',
      text: p.kanji,
      flipped: false,
      matched: false,
    });
    raw.push({
      id: `m-${pairId}`,
      pairId,
      kind: 'meaning',
      text: p.meaning,
      flipped: false,
      matched: false,
    });
  });
  return shuffle(raw);
}

export default function KanjiMemoryGame() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonParam = searchParams.get('lesson') || '';

  const [phase, setPhase] = useState('setup');
  const [pairTarget, setPairTarget] = useState(DEFAULT_PAIR_TARGET);
  const [selectedLesson, setSelectedLesson] = useState(lessonParam);
  const [cards, setCards] = useState([]);
  const [pairsMeta, setPairsMeta] = useState([]);
  const [turns, setTurns] = useState(0);
  const [apiReward, setApiReward] = useState(null);
  const [apiRewardErr, setApiRewardErr] = useState('');
  const [apiRewardLoading, setApiRewardLoading] = useState(false);
  const lockRef = useRef(false);
  const flipBackTimerRef = useRef(null);
  const turnsRef = useRef(0);
  const rewardClaimRef = useRef(false);

  useEffect(() => {
    setSelectedLesson(lessonParam);
  }, [lessonParam]);

  const poolAll = useMemo(() => extractKanjiMemoryPairsFromN5Lessons(null), []);
  const poolLesson = useMemo(
    () => (selectedLesson ? extractKanjiMemoryPairsFromN5Lessons(selectedLesson) : []),
    [selectedLesson],
  );

  const activePool = selectedLesson ? poolLesson : poolAll;
  const maxPairsAvailable = activePool.length;

  const lessonOptions = useMemo(() => {
    return N5_LESSONS.map((l) => {
      const count = extractKanjiMemoryPairsFromN5Lessons(l.slug).length;
      return {
        slug: l.slug,
        label: `${l.navTitle || l.slug} (${l.sectionLabel || l.section})`,
        count,
      };
    }).filter((o) => o.count >= MIN_PAIRS);
  }, []);

  const startGame = useCallback(() => {
    if (flipBackTimerRef.current) {
      clearTimeout(flipBackTimerRef.current);
      flipBackTimerRef.current = null;
    }
    const cap = Math.min(DEFAULT_PAIR_TARGET, maxPairsAvailable);
    const want = Math.min(pairTarget, cap);
    const n = Math.max(MIN_PAIRS, want);
    const picked = pickRandomPairs(activePool, n);
    setPairsMeta(picked);
    setCards(buildCardsFromPairs(picked));
    turnsRef.current = 0;
    setTurns(0);
    lockRef.current = false;
    setPhase('playing');
    if (selectedLesson) setSearchParams({ lesson: selectedLesson }, { replace: true });
    else setSearchParams({}, { replace: true });
  }, [activePool, maxPairsAvailable, pairTarget, selectedLesson, setSearchParams]);

  const totalPairs = pairsMeta.length;

  const matchedPairsCount = useMemo(() => {
    const matched = cards.filter((c) => c.matched);
    if (matched.length < 2) return 0;
    const byPair = new Map();
    matched.forEach((c) => {
      byPair.set(c.pairId, (byPair.get(c.pairId) || 0) + 1);
    });
    let n = 0;
    byPair.forEach((cnt) => {
      if (cnt >= 2) n += 1;
    });
    return n;
  }, [cards]);

  useEffect(() => {
    return () => {
      if (flipBackTimerRef.current) clearTimeout(flipBackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (totalPairs > 0 && matchedPairsCount >= totalPairs) setPhase('won');
  }, [matchedPairsCount, phase, totalPairs]);

  useEffect(() => {
    if (phase !== 'won') {
      if (phase === 'setup' || phase === 'playing') {
        rewardClaimRef.current = false;
        setApiReward(null);
        setApiRewardErr('');
        setApiRewardLoading(false);
      }
      return;
    }
    if (totalPairs < MIN_PAIRS) return;
    if (rewardClaimRef.current) return;
    rewardClaimRef.current = true;
    setApiRewardLoading(true);
    setApiRewardErr('');
    (async () => {
      try {
        const data = await completeKanjiMemoryRewards({
          totalPairs,
          matchedPairs: totalPairs,
        });
        setApiReward(data);
        window.dispatchEvent(new Event(YUME_PLAY_EXP_REFRESH));
      } catch (e) {
        rewardClaimRef.current = false;
        const msg =
          e?.response?.data?.message ??
          e?.response?.data?.Message ??
          (typeof e?.message === 'string' ? e.message : '');
        setApiRewardErr(
          msg || 'Không ghi nhận phần thưởng — kiểm tra đăng nhập hoặc API.',
        );
      } finally {
        setApiRewardLoading(false);
      }
    })();
  }, [phase, totalPairs]);

  const openUnmatched = useMemo(() => cards.filter((c) => c.flipped && !c.matched), [cards]);
  const openCount = openUnmatched.length;

  const onCardClick = useCallback(
    (cardId) => {
      if (phase !== 'playing' || lockRef.current) return;

      setCards((prev) => {
        const card = prev.find((c) => c.id === cardId);
        if (!card || card.matched || card.flipped) return prev;
        const open = prev.filter((c) => c.flipped && !c.matched);
        if (open.length >= 2) return prev;

        const next = prev.map((c) => (c.id === cardId ? { ...c, flipped: true } : c));
        const open2 = next.filter((c) => c.flipped && !c.matched);

        if (open2.length === 1) return next;

        if (open2.length === 2) {
          const [c1, c2] = open2;
          const isMatch = c1.pairId === c2.pairId && c1.kind !== c2.kind;
          lockRef.current = true;
          turnsRef.current += 1;
          setTurns(turnsRef.current);

          if (isMatch) {
            lockRef.current = false;
            return next.map((c) => (c.pairId === c1.pairId ? { ...c, matched: true, flipped: true } : c));
          }

          if (flipBackTimerRef.current) clearTimeout(flipBackTimerRef.current);
          flipBackTimerRef.current = setTimeout(() => {
            setCards((p) => p.map((c) => (c.flipped && !c.matched ? { ...c, flipped: false } : c)));
            lockRef.current = false;
          }, 700);
          return next;
        }

        return next;
      });
    },
    [phase],
  );

  const selectPairValue = Math.min(
    pairTarget,
    Math.max(MIN_PAIRS, maxPairsAvailable || MIN_PAIRS),
    DEFAULT_PAIR_TARGET,
  );

  if (phase === 'setup') {
    return (
      <div className="kanji-memory kanji-memory--setup">
        <header className="kanji-memory__head">
          <Link className="kanji-memory__back" to={ROUTES.PLAY}>
            ← Quay lại
          </Link>
          <h1 className="kanji-memory__title">KANJI MEMORY</h1>
        </header>
        <p className="kanji-memory__intro">
          Lật thẻ và ghép <strong>Kanji / từ</strong> với <strong>nghĩa tiếng Việt</strong> lấy từ nội dung khóa{' '}
          <strong>N5</strong> (bài học trong app).
        </p>
        <div className="kanji-memory__form">
          <label className="kanji-memory__field">
            <span>Nguồn từ vựng</span>
            <select value={selectedLesson} onChange={(e) => setSelectedLesson(e.target.value)}>
              <option value="">Toàn bộ bài N5 (gom tất cả)</option>
              {lessonOptions.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label} — {o.count} cặp
                </option>
              ))}
            </select>
          </label>
          <label className="kanji-memory__field">
            <span>
              Số cặp (tối đa {Math.min(DEFAULT_PAIR_TARGET, Math.max(maxPairsAvailable, MIN_PAIRS))})
            </span>
            <select
              value={selectPairValue}
              onChange={(e) => setPairTarget(Number(e.target.value))}
              disabled={maxPairsAvailable < MIN_PAIRS}
            >
              {Array.from(
                { length: Math.max(0, Math.min(maxPairsAvailable, DEFAULT_PAIR_TARGET) - MIN_PAIRS + 1) },
                (_, i) => MIN_PAIRS + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} cặp ({n * 2} thẻ)
                </option>
              ))}
            </select>
          </label>
          {maxPairsAvailable < MIN_PAIRS ? (
            <p className="kanji-memory__err">
              Chưa đủ cặp Kanji trong bài đã chọn (cần ít nhất {MIN_PAIRS}). Thử &quot;Toàn bộ bài N5&quot;.
            </p>
          ) : (
            <button type="button" className="kanji-memory__start" onClick={startGame}>
              Bắt đầu
            </button>
          )}
        </div>
        <p className="kanji-memory__pool">
          Đang có <strong>{poolAll.length}</strong> cặp unique trong toàn khóa; bài chọn:{' '}
          <strong>{maxPairsAvailable}</strong> cặp.
        </p>
      </div>
    );
  }

  if (phase === 'won') {
    return (
      <div className="kanji-memory kanji-memory--won">
        <header className="kanji-memory__head">
          <Link className="kanji-memory__back" to={ROUTES.PLAY}>
            ← Quay lại
          </Link>
          <h1 className="kanji-memory__title">KANJI MEMORY</h1>
        </header>
        <div className="kanji-memory__won-card">
          <h2>Hoàn thành!</h2>
          <p>
            Đã ghép đúng <strong>{totalPairs}</strong> cặp sau <strong>{turns}</strong> lượt mở thẻ.
          </p>
          <p className="kanji-memory__won-stars" aria-hidden>
            {totalPairs > 0 ? '⭐'.repeat(Math.min(8, totalPairs)) : '—'}
          </p>
          {apiRewardLoading ? (
            <p className="kanji-memory__won-reward kanji-memory__won-reward--pending">
              Đang ghi nhận điểm và phần thưởng lên server…
            </p>
          ) : null}
          {apiReward && !apiRewardLoading ? (
            <div className="kanji-memory__won-reward">
              <p>
                <strong>Điểm phiên:</strong>{' '}
                {pickReward(apiReward, 'finalScore', 'FinalScore') ?? '—'}/100
              </p>
              <p>
                <strong>EXP:</strong> +{pickReward(apiReward, 'expEarned', 'ExpEarned') ?? 0} ·{' '}
                <strong>Xu:</strong> +{pickReward(apiReward, 'xuEarned', 'XuEarned') ?? 0}
              </p>
            </div>
          ) : null}
          {apiRewardErr ? (
            <p className="kanji-memory__won-reward kanji-memory__won-reward--err">{apiRewardErr}</p>
          ) : null}
          <div className="kanji-memory__won-actions">
            <button type="button" className="kanji-memory__start" onClick={startGame}>
              Chơi lại
            </button>
            <Link className="kanji-memory__secondary" to={ROUTES.LEARN}>
              Về phần học
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cols = 4;

  return (
    <div className="kanji-memory">
      <header className="kanji-memory__head">
        <Link className="kanji-memory__back" to={ROUTES.PLAY}>
          ← Quay lại
        </Link>
        <h1 className="kanji-memory__title">KANJI MEMORY</h1>
        <div className="kanji-memory__hud" aria-live="polite">
          <span className="kanji-memory__stat">
            <span aria-hidden>⭐</span> {matchedPairsCount}
          </span>
          <span className="kanji-memory__stat">
            <span aria-hidden>🎴</span> {turns} lượt
          </span>
          <span className="kanji-memory__stat kanji-memory__stat--ok">
            <span aria-hidden>✓</span> {matchedPairsCount}/{totalPairs}
          </span>
        </div>
      </header>

      <p className="kanji-memory__hint">Lật thẻ và ghép Kanji với nghĩa tương ứng!</p>

      <div
        className="kanji-memory__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cards.map((c) => {
          const showFace = c.flipped || c.matched;
          const isKanjiFace = c.kind === 'kanji';
          const isPicked = c.flipped && !c.matched;
          const disabled = c.matched || (openCount >= 2 && !c.flipped);
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={`kanji-memory__card ${showFace ? 'kanji-memory__card--open' : ''} ${c.matched ? 'kanji-memory__card--matched' : ''} ${isPicked ? 'kanji-memory__card--picked' : ''} ${disabled ? 'kanji-memory__card--disabled' : ''}`}
              onClick={() => {
                if (!disabled) onCardClick(c.id);
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardClick(c.id);
                }
              }}
            >
              <span className="kanji-memory__card-inner">
                {showFace ? (
                  <>
                    <span
                      className={`kanji-memory__face ${isKanjiFace ? 'kanji-memory__face--jp' : 'kanji-memory__face--vi'}`}
                      lang={isKanjiFace ? 'ja' : 'vi'}
                    >
                      {c.text}
                    </span>
                    {isKanjiFace ? (
                      <span className="kanji-memory__speak">
                        <SpeakJaButton text={c.text} label={`Nghe: ${c.text}`} />
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="kanji-memory__q" aria-hidden>
                    ?
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="kanji-memory__foot">
        <button
          type="button"
          className="kanji-memory__linkish"
          onClick={() => {
            if (flipBackTimerRef.current) clearTimeout(flipBackTimerRef.current);
            setPhase('setup');
            setCards([]);
          }}
        >
          Đổi bài / số cặp
        </button>
      </footer>
    </div>
  );
}
