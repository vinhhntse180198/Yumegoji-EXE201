import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SpeakJaButton from '../../components/learn/SpeakJaButton';
import { PlayGameSetupPro } from '../../components/play/PlayGameSetupPro';
import { playSetupChildVariants, playSetupParentVariants } from '../../components/play/playSetupMotion';
import { ROUTES } from '../../data/routes';
import { buildLocalKanaQuestions } from '../../data/gojuonRomaji';
import {
  artPowerup5050,
  artPowerupDouble,
  artPowerupHeart,
  artPowerupSkip,
  artPowerupTimeFreeze,
} from '../../assets/play';
import {
  endGameSession,
  fetchGameInventory,
  fetchGames,
  startGameSession,
  submitGameAnswer,
  postInventoryPowerUp,
} from '../../services/gameService';

const Motion = motion;

function splitSetupTitleAccent(setupTitle) {
  const parts = String(setupTitle || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { lead: '', accent: 'Game' };
  if (parts.length === 1) return { lead: '', accent: parts[0] };
  const accent = parts[parts.length - 1];
  const lead = parts.slice(0, -1).join(' ');
  return { lead, accent };
}

function getQuestionFieldLabel(apiGameSlug, isFlash) {
  if (apiGameSlug === 'vocabulary-speed-quiz') {
    return 'Số câu trong phiên (từ vựng ưu tiên từ các bài học bạn đã có tiến độ)';
  }
  if (apiGameSlug === 'sentence-builder') {
    return 'Số câu trong phiên (kéo thả từ — khoảng 75 giây mỗi câu)';
  }
  if (apiGameSlug === 'daily-challenge') {
    return 'Số câu trong phiên (tối thiểu 5 — trắc nghiệm đọc Kanji/từ vựng)';
  }
  if (apiGameSlug === 'counter-quest') {
    return 'Số câu trong phiên (ưu tiên quiz trợ từ trong bài học; thiếu thì dùng bộ đề server)';
  }
  if (apiGameSlug === 'boss-battle') {
    return 'Số câu trong phiên (ưu tiên từ vựng/kanji bài học; thiếu thì dùng bộ đề server)';
  }
  if (isFlash) {
    return 'Số câu trong phiên (ưu tiên từ vựng bài học; thiếu thì dùng bộ đề server)';
  }
  return `Số lượng câu hỏi (tối đa ${MAX_KANA_QUESTIONS})`;
}

function getSetupShortIntro(apiGameSlug, kanaGame, isFlash) {
  if (kanaGame) {
    return 'Kiểm tra khả năng phản xạ và ghi nhớ bảng chữ cái Hiragana/Katakana qua thử thách ghép đôi romaji đầy kịch tính.';
  }
  if (apiGameSlug === 'vocabulary-speed-quiz') {
    return 'Trắc nghiệm từ vựng tốc độ cao — câu hỏi ưu tiên từ các bài học bạn đã mở trong lộ trình.';
  }
  if (apiGameSlug === 'sentence-builder') {
    return 'Kéo thả các mảnh từ để ghép thành câu đúng — mỗi câu có ngân hàng từ và ô chỗ trống rõ ràng.';
  }
  if (apiGameSlug === 'daily-challenge') {
    return 'Bộ đề Daily trên server — trắc nghiệm Kanji và từ vựng, phù hợp ôn nhanh mỗi ngày.';
  }
  if (apiGameSlug === 'counter-quest') {
    return 'Trợ từ đếm trong tiếng Nhật — ưu tiên câu quiz gắn với bài học bạn đang học.';
  }
  if (apiGameSlug === 'boss-battle') {
    return 'Đối đầu boss HP — câu hỏi lấy từ từ vựng & kanji các bài học đã xuất bản.';
  }
  if (isFlash) {
    return 'Flashcard Battle — câu hỏi từ vựng bài học, đấu với bot mô phỏng.';
  }
  return 'Sẵn sàng cho thử thách — đọc kỹ gợi ý dưới đây trước khi bắt đầu phiên.';
}

function getSetupFeatureRows(apiGameSlug, kanaGame, isFlash) {
  if (kanaGame) {
    return [
      {
        icon: '⏱',
        title: '10 giây mỗi câu',
        desc: 'Phải chọn romaji đúng trước khi đồng hồ về 0 — luyện phản xạ đọc bảng chữ.',
      },
      {
        icon: '★',
        title: 'Tính điểm linh hoạt',
        desc: 'Chơi qua API: theo cấu hình server; luyện offline: tối đa 100 điểm theo tỉ lệ đúng / tổng câu.',
      },
    ];
  }
  if (apiGameSlug === 'vocabulary-speed-quiz') {
    return [
      { icon: '⏱', title: '8 giây mỗi câu', desc: 'Đồng hồ client cố định 8s; điểm tốc độ theo thời gian trả lời.' },
      { icon: '📚', title: 'Từ vựng bài học', desc: 'Ưu tiên từ các bài bạn đã có tiến độ; thiếu thì bổ sung từ khoá học.' },
    ];
  }
  if (apiGameSlug === 'sentence-builder') {
    return [
      { icon: '🧩', title: 'Kéo thả từ', desc: 'Mỗi câu ~75 giây — sắp xếp chip thành câu đúng thứ tự.' },
      { icon: '✓', title: 'Theo bài học', desc: 'Câu hỏi gắn với nội dung đã xuất bản trên lộ trình.' },
    ];
  }
  if (apiGameSlug === 'daily-challenge') {
    return [
      { icon: '📅', title: 'Daily Challenge', desc: 'Tối thiểu 5 câu; bộ đề random từ kho server mỗi phiên.' },
      { icon: '漢', title: 'Kanji & từ vựng', desc: 'Trắc nghiệm đọc hiểu ngắn, phù hợp ôn nhanh.' },
    ];
  }
  if (apiGameSlug === 'counter-quest') {
    return [
      { icon: '🔢', title: 'Trợ từ đếm', desc: 'Quiz 4 đáp án — ưu tiên câu trong bài học của bạn.' },
      { icon: '⚡', title: 'EXP & Xu', desc: 'Ghi nhận qua API khi hoàn thành phiên hợp lệ.' },
    ];
  }
  if (apiGameSlug === 'boss-battle') {
    return [
      { icon: '👹', title: 'Boss HP', desc: 'HP chia theo số câu; trả lời đúng để gây sát thương.' },
      { icon: '📖', title: 'Từ vựng & Kanji', desc: 'Ưu tiên bài học gần đây; thiếu dữ liệu thì dùng đề dự phòng server.' },
    ];
  }
  if (isFlash) {
    return [
      { icon: '🃏', title: 'Flashcard Battle', desc: 'Bot mô phỏng đối thủ — câu hỏi từ từ vựng bài học.' },
      { icon: '⚡', title: 'Tốc độ', desc: 'Giữ combo và độ chính xác để vượt điểm bot.' },
    ];
  }
  return [
    { icon: '🎮', title: 'Mẹo', desc: 'Đọc phần chi tiết phía dưới rồi nhấn Bắt đầu khi đã sẵn sàng.' },
  ];
}

function prettyTitleFromSlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return 'Game';
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isKanaGameSlug(slug) {
  return slug === 'hiragana-match' || slug === 'katakana-match';
}

function isFlashcardBattleSlug(slug) {
  const s = String(slug || '').replace(/_/g, '-').toLowerCase();
  return s === 'flashcard-vocabulary' || s === 'flashcard-battle';
}

const BLOCKED_PLAY_SLUGS = new Set(['fill-in-blank', 'fill-blank']);
const QUESTION_COUNT_CHOICES = [5, 10, 15, 20, 25, 30, 35, 40, 46];
const VOCAB_SPEED_Q_CHOICES = [5, 8, 10, 12, 15, 20];
const SENTENCE_BUILDER_Q_CHOICES = [5, 8, 10, 12, 15];
const DAILY_CHALLENGE_Q_CHOICES = [5, 8, 10, 12, 15];
const COUNTER_QUEST_Q_CHOICES = [5, 8, 10, 12, 15];
const FLASHCARD_BATTLE_Q_CHOICES = [5, 8, 10, 12, 15];
const BOSS_BATTLE_Q_CHOICES = [5, 8, 10, 12, 15];
const MAX_KANA_QUESTIONS = 46;
/** Đồng bộ với PlayExpBar — làm mới EXP sau khi kết thúc phiên API */
const YUME_PLAY_EXP_REFRESH = 'yume-play-exp-refresh';

/** Chiến trường quiz Kana (phương án A): luân phiên theo chỉ số câu */
const KANA_BATTLEFIELD_KEYS = ['sakura', 'bamboo', 'temple', 'snow'];

function kanaBattlefieldAt(index) {
  const n = Math.floor(Number(index)) || 0;
  return KANA_BATTLEFIELD_KEYS[((n % 4) + 4) % 4];
}

function syncKanaBattleAnim(kana, correct, powerUpUsed, setAnim) {
  if (!kana) return;
  if (powerUpUsed === 'skip') setAnim('idle');
  else if (correct) setAnim('player');
  else setAnim('enemy');
}

function optionCellLabel(o) {
  if (o == null) return '';
  if (typeof o === 'string' || typeof o === 'number') return String(o);
  const v =
    o.text ??
    o.Text ??
    o.label ??
    o.Label ??
    o.value ??
    o.Value ??
    o.romaji ??
    o.Romaji ??
    o.answer ??
    o.Answer;
  if (v != null && String(v).trim() !== '') return String(v);
  const keys = Object.keys(o);
  if (keys.length === 1) return String(o[keys[0]] ?? '');
  return '';
}

function parseOptions(raw) {
  if (raw == null) return [];
  let j = raw;
  if (typeof j === 'string') {
    const t = j.trim();
    if (!t) return [];
    try {
      j = JSON.parse(t);
      if (typeof j === 'string') {
        try {
          j = JSON.parse(j);
        } catch {
          return [{ text: j }];
        }
      }
    } catch {
      return [];
    }
  }
  if (j && typeof j === 'object' && !Array.isArray(j)) {
    if (Array.isArray(j.options)) j = j.options;
    else if (Array.isArray(j.Options)) j = j.Options;
    else return [];
  }
  if (!Array.isArray(j)) return [];
  return j.map((o) => ({ text: optionCellLabel(o).trim() }));
}

function optionsLookValid(q) {
  return (
    q.options.length >= 2 &&
    q.options.every((o) => String(o.text ?? '').trim().length > 0)
  );
}

/** API bắt buộc có id câu hỏi số nguyên > 0 — thiếu sẽ gây 500 khi submit. */
function questionApiReady(q) {
  const id = Number(q?.id);
  return Number.isFinite(id) && id >= 1 && optionsLookValid(q);
}

function normalizeApiQuestions(list) {
  return (list || []).map((q) => {
    const rawId = q.id ?? q.Id;
    const idNum = Number(rawId);
    const id = Number.isFinite(idNum) && idNum >= 1 ? Math.floor(idNum) : null;
    const questionText = q.questionText ?? q.QuestionText ?? '';
    const raw =
      q.optionsJson ??
      q.OptionsJson ??
      q.optionsJSON ??
      q.options ??
      q.Options;
    const options = parseOptions(raw);
    return { id, questionText, options, correctIndex: null };
  });
}

/** Hira/Kata 10s, Vocab Speed 8s; Sentence Builder cần thời gian kéo thả chip. */
function clientTimePerQuestionSeconds(slug, serverSeconds) {
  const s = String(slug || '').replace(/_/g, '-').toLowerCase();
  if (s === 'hiragana-match' || s === 'katakana-match') return 10;
  if (s === 'vocabulary-speed-quiz') return 8;
  if (s === 'sentence-builder') {
    const t = Number(serverSeconds);
    if (Number.isFinite(t) && t >= 30) return Math.min(120, Math.floor(t));
    return 75;
  }
  const t = Number(serverSeconds);
  if (Number.isFinite(t) && t >= 3 && t <= 120) return Math.floor(t);
  return 12;
}

function getArcadeTheme(slug) {
  const s = String(slug || '').toLowerCase();
  if (s === 'boss-battle') return 'boss';
  if (s === 'vocabulary-speed-quiz') return 'speed';
  if (s === 'sentence-builder') return 'sentence';
  if (s === 'counter-quest') return 'counter';
  if (s === 'flashcard-vocabulary' || s === 'flashcard-battle') return 'vsbot';
  if (s === 'daily-challenge') return 'daily';
  return null;
}

function splitQuestionDisplay(text) {
  const t = String(text || '').trim();
  if (!t) return { main: '', sub: '' };
  if (t.includes('\n')) {
    const lines = t.split('\n').map((x) => x.trim()).filter(Boolean);
    return { main: lines[0] || '', sub: lines.slice(1).join('\n') };
  }
  if (t.includes('|')) {
    const [a, b] = t.split('|');
    return { main: a.trim(), sub: (b || '').trim() };
  }
  return { main: t, sub: '' };
}

function isSentenceChipQuestion(q) {
  if (!q?.options?.length) return false;
  return q.options.some((o) => String(o.text).includes('/'));
}

function sentenceCanonicalText(q) {
  if (!isSentenceChipQuestion(q)) return '';
  const o0 = q.options[0];
  if (o0 && String(o0.text).includes('/')) return String(o0.text);
  const hit = q.options.find((o) => String(o.text).includes('/'));
  return hit ? String(hit.text) : '';
}

function normSentenceKey(s) {
  return String(s)
    .replace(/\s*\/\s*/g, '|')
    .replace(/\s+/g, '')
    .replace(/。/g, '');
}

function pickSentenceChosenIndex(slotsText, options) {
  const u = normSentenceKey(slotsText.join(' / '));
  const exact = options.findIndex((o) => normSentenceKey(o.text) === u);
  if (exact >= 0) return exact;
  return options.length > 1 ? 1 : 0;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Id ổn định cho React key — tránh trùng sq-17-0-0 khi Strict Mode / batching. */
function makeSentenceChipId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sq-${crypto.randomUUID()}`;
  }
  return `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Lấy chữ từ body lỗi API (GameApiError camelCase / PascalCase). */
function apiErrorMessage(e) {
  const d = e?.response?.data;
  if (d && typeof d === 'object') {
    const m = d.message ?? d.Message;
    if (m) return String(m);
    const c = d.code ?? d.Code;
    if (c) return String(c);
  }
  if (typeof e?.message === 'string') return e.message;
  return '';
}

function arcadeDisplayTitle(slug, metaName) {
  const s = String(slug || '').toLowerCase();
  const map = {
    'boss-battle': '⚔️ BOSS BATTLE',
    'vocabulary-speed-quiz': 'VOCABULARY SPEED QUIZ',
    'sentence-builder': 'SENTENCE BUILDER',
    'counter-quest': 'COUNTER QUEST',
    'flashcard-vocabulary': '⚔️ FLASHCARD BATTLE',
    'flashcard-battle': '⚔️ FLASHCARD BATTLE',
    'daily-challenge': '📅 DAILY CHALLENGE',
  };
  if (map[s]) return map[s];
  const name = metaName && String(metaName).trim();
  if (name) return name;
  return prettyTitleFromSlug(slug);
}

export default function KanaMatchGame() {
  const { gameSlug } = useParams();
  const [phase, setPhase] = useState('setup');
  const [error, setError] = useState('');
  const [apiMode, setApiMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [maxHearts, setMaxHearts] = useState(3);
  const [heartsRemaining, setHeartsRemaining] = useState(3);
  const [timePerQ, setTimePerQ] = useState(12);
  const [secondsLeft, setSecondsLeft] = useState(12);
  const [totalScore, setTotalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [pickedIndex, setPickedIndex] = useState(null);
  const [summary, setSummary] = useState(null);
  const [localCorrect, setLocalCorrect] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const busyRef = useRef(false);
  const questionStartRef = useRef(0);
  const timerRef = useRef(null);
  const pendingDoubleRef = useRef(false);
  const [doubleArmed, setDoubleArmed] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [gameMeta, setGameMeta] = useState(null);
  const [apiCorrectCount, setApiCorrectCount] = useState(0);
  const apiCorrectRef = useRef(0);
  const reduceMotion = useReducedMotion();

  const apiGameSlug = useMemo(
    () => String(gameSlug || '').replace(/_/g, '-').toLowerCase(),
    [gameSlug],
  );

  const slugOk = Boolean(String(gameSlug || '').trim());
  const kanaGame = isKanaGameSlug(apiGameSlug);
  const arcadeTheme = useMemo(
    () => (kanaGame ? null : getArcadeTheme(apiGameSlug)),
    [kanaGame, apiGameSlug],
  );
  const useArcadeShell = Boolean(arcadeTheme);

  const [bossHp, setBossHp] = useState(400);
  const [botScore, setBotScore] = useState(200);
  const [sentenceLayout, setSentenceLayout] = useState({ bank: [], slots: [] });
  const sentenceBank = sentenceLayout.bank;
  const sentenceSlots = sentenceLayout.slots;
  const [showSentenceHint, setShowSentenceHint] = useState(false);
  const sentenceExpectedRef = useRef(0);
  const sentenceChipGenRef = useRef(0);
  /** idle | player | enemy — chỉ dùng khi kanaGame + đang chơi */
  const [kanaBattleAnim, setKanaBattleAnim] = useState('idle');

  const qCurrent = questions[index] ?? null;
  const sentenceCanonKey = useMemo(() => {
    if (arcadeTheme !== 'sentence' || !qCurrent) return '';
    return sentenceCanonicalText(qCurrent);
  }, [arcadeTheme, qCurrent]);

  const startLocal = useCallback(
    (count) => {
      const n = Math.min(MAX_KANA_QUESTIONS, Math.max(1, Math.floor(Number(count)) || 10));
      const script = apiGameSlug === 'katakana-match' ? 'katakana' : 'hiragana';
      const qs = buildLocalKanaQuestions(script, n);
      setApiMode(false);
      setSessionId(null);
      setQuestions(qs);
      setIndex(0);
      setMaxHearts(3);
      setHeartsRemaining(3);
      setTimePerQ(10);
      setSecondsLeft(10);
      setTotalScore(0);
      setCombo(0);
      setFeedback(null);
      setPickedIndex(null);
      setSummary(null);
      setLocalCorrect(0);
      setApiCorrectCount(0);
      apiCorrectRef.current = 0;
      setDoubleArmed(false);
      pendingDoubleRef.current = false;
      setPhase('playing');
      questionStartRef.current = Date.now();
    },
    [apiGameSlug],
  );

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const list = await fetchGames();
        if (c) return;
        const norm = (s) => String(s ?? '').replace(/_/g, '-').toLowerCase();
        const row = (list || []).find((g) => norm(g.slug ?? g.Slug) === apiGameSlug);
        setGameMeta(row ?? null);
      } catch {
        if (!c) setGameMeta(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [apiGameSlug]);

  useEffect(() => {
    if (apiGameSlug === 'vocabulary-speed-quiz') {
      setQuestionCount((c) => (VOCAB_SPEED_Q_CHOICES.includes(c) ? c : 10));
    } else if (apiGameSlug === 'sentence-builder') {
      setQuestionCount((c) => (SENTENCE_BUILDER_Q_CHOICES.includes(c) ? c : 10));
    } else if (apiGameSlug === 'daily-challenge') {
      setQuestionCount((c) => (DAILY_CHALLENGE_Q_CHOICES.includes(c) ? c : 10));
    } else if (apiGameSlug === 'counter-quest') {
      setQuestionCount((c) => (COUNTER_QUEST_Q_CHOICES.includes(c) ? c : 10));
    } else if (isFlashcardBattleSlug(apiGameSlug)) {
      setQuestionCount((c) => (FLASHCARD_BATTLE_Q_CHOICES.includes(c) ? c : 10));
    } else if (apiGameSlug === 'boss-battle') {
      setQuestionCount((c) => (BOSS_BATTLE_Q_CHOICES.includes(c) ? c : 10));
    } else if (isKanaGameSlug(apiGameSlug)) {
      setQuestionCount((c) => (QUESTION_COUNT_CHOICES.includes(c) ? c : 10));
    }
  }, [apiGameSlug]);

  useEffect(() => {
    if (phase === 'summary' && summary?.mode === 'api') {
      window.dispatchEvent(new Event(YUME_PLAY_EXP_REFRESH));
    }
  }, [phase, summary]);

  const beginGame = useCallback(async () => {
    if (!slugOk) {
      setError('Game không hợp lệ.');
      setPhase('error');
      return;
    }
    setPhase('loading');
    setError('');
    busyRef.current = false;
    try {
      const startPayload = { gameSlug: apiGameSlug, setId: null, mode: 'solo' };
      if (apiGameSlug === 'vocabulary-speed-quiz') {
        startPayload.questionCount = questionCount;
        startPayload.useLessonVocabulary = true;
      } else if (apiGameSlug === 'sentence-builder') {
        startPayload.questionCount = questionCount;
      } else if (apiGameSlug === 'daily-challenge') {
        startPayload.questionCount = questionCount;
      } else if (apiGameSlug === 'counter-quest') {
        startPayload.questionCount = questionCount;
        startPayload.useLessonVocabulary = true;
      } else if (isFlashcardBattleSlug(apiGameSlug)) {
        startPayload.questionCount = questionCount;
        startPayload.useLessonVocabulary = true;
      } else if (apiGameSlug === 'boss-battle') {
        startPayload.questionCount = questionCount;
        startPayload.useLessonVocabulary = true;
      }
      const data = await startGameSession(startPayload);
      const sid = data.sessionId ?? data.SessionId;
      const mh = data.maxHearts ?? data.MaxHearts ?? 3;
      const tpqRaw = data.timePerQuestionSeconds ?? data.TimePerQuestionSeconds ?? 12;
      const tpq = clientTimePerQuestionSeconds(apiGameSlug, tpqRaw);
      const qs = normalizeApiQuestions(data.questions ?? data.Questions);
      const badOptions = qs.length === 0 || !qs.every(questionApiReady);
      if (!sid || badOptions) {
        if (sid && badOptions) {
          try {
            await endGameSession(sid);
          } catch {
            /* bỏ qua */
          }
        }
        throw new Error('empty');
      }
      setApiMode(true);
      setSessionId(sid);
      setQuestions(qs);
      setIndex(0);
      setMaxHearts(mh);
      setHeartsRemaining(mh);
      setTimePerQ(tpq);
      setSecondsLeft(tpq);
      setTotalScore(0);
      setCombo(0);
      setFeedback(null);
      setPickedIndex(null);
      setSummary(null);
      setLocalCorrect(0);
      setApiCorrectCount(0);
      apiCorrectRef.current = 0;
      setDoubleArmed(false);
      pendingDoubleRef.current = false;
      setPhase('playing');
      questionStartRef.current = Date.now();
      if (getArcadeTheme(apiGameSlug) === 'boss') setBossHp(400);
      if (getArcadeTheme(apiGameSlug) === 'vsbot') setBotScore(200);
      try {
        setInventory(await fetchGameInventory());
      } catch {
        /* ignore */
      }
    } catch (e) {
      const res = e?.response;
      const payload = res?.data;
      const apiMsg = payload?.message ?? payload?.Message ?? '';
      if (apiMsg) {
        setError(apiMsg);
      } else if (!res) {
        setError(
          'Không kết nối được máy chủ game. Kiểm tra backend đang chạy; nếu dùng VITE_API_URL thì cổng phải trùng API (vd. 5056).',
        );
      } else if (!apiMsg) {
        setError('Không tạo được phiên (thiếu bộ câu hỏi hoặc slug chưa seed).');
      }
      if (kanaGame) {
        startLocal(questionCount);
      } else {
        setPhase('error');
      }
    }
  }, [apiGameSlug, slugOk, kanaGame, startLocal, questionCount]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    setSecondsLeft(timePerQ);
    setPickedIndex(null);
    setFeedback(null);
    if (kanaGame) setKanaBattleAnim('idle');
    questionStartRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          /* Không set busy trước handlePick — handlePick(null) cần busy=false để nhận hết giờ */
          handlePickRef.current?.(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, index, timePerQ, kanaGame]);

  useEffect(() => {
    if (phase !== 'playing' || !apiMode || sessionId == null) return undefined;
    let c = false;
    (async () => {
      try {
        const inv = await fetchGameInventory();
        if (!c) setInventory(inv);
      } catch {
        /* bỏ qua */
      }
    })();
    return () => {
      c = true;
    };
  }, [phase, apiMode, sessionId]);

  /* Mỗi câu mới: gỡ ×2 đang bật (tránh kẹt viền hồng sang câu sau). */
  useEffect(() => {
    pendingDoubleRef.current = false;
    setDoubleArmed(false);
  }, [index]);

  useEffect(() => {
    if (phase !== 'playing' || arcadeTheme !== 'sentence' || !sentenceCanonKey) return;
    const tokens = sentenceCanonKey.split(/\s*\/\s*/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) return;
    sentenceChipGenRef.current += 1;
    const gen = sentenceChipGenRef.current;
    const items = tokens.map((text, i) => ({
      id: `sc-${gen}-i${i}-${makeSentenceChipId()}`,
      text,
    }));
    sentenceExpectedRef.current = tokens.length;
    setSentenceLayout({ bank: shuffleArr(items), slots: [] });
  }, [phase, arcadeTheme, index, qCurrent?.id, sentenceCanonKey, sessionId]);

  useEffect(() => {
    setShowSentenceHint(false);
  }, [index]);

  const handlePickRef = useRef(null);

  const refreshInventory = useCallback(async () => {
    try {
      setInventory(await fetchGameInventory());
    } catch {
      /* ignore */
    }
  }, []);

  const handlePick = useCallback(
    async (chosenIndex, explicitPowerUp = null) => {
      if (phase !== 'playing') {
        busyRef.current = false;
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      /* Skip / hết giờ (không chọn đáp án): không áp ×2; gỡ trạng thái đã bật. */
      if (explicitPowerUp === 'skip' || (chosenIndex === null && explicitPowerUp == null)) {
        pendingDoubleRef.current = false;
        setDoubleArmed(false);
      }

      if (chosenIndex !== null) {
        setPickedIndex(chosenIndex);
      }

      const q = questions[index];
      if (!q) {
        busyRef.current = false;
        return;
      }
      const responseMs = Date.now() - questionStartRef.current;

      let powerUpUsed = explicitPowerUp ?? null;
      if (!powerUpUsed && chosenIndex !== null && pendingDoubleRef.current) {
        powerUpUsed = 'double-points';
      }

      if (apiMode && sessionId != null) {
        try {
          const res = await submitGameAnswer({
            sessionId,
            questionId: q.id,
            questionOrder: index + 1,
            chosenIndex,
            responseMs,
            powerUpUsed,
          });
          if (powerUpUsed === 'double-points') {
            pendingDoubleRef.current = false;
            setDoubleArmed(false);
          }
          const correct = res.isCorrect ?? res.IsCorrect;
          const hearts = res.heartsRemaining ?? res.HeartsRemaining ?? 0;
          const score = res.totalScoreSoFar ?? res.TotalScoreSoFar ?? 0;
          const cb = res.comboCount ?? res.ComboCount ?? 0;
          const corrIdx = res.correctAnswerIndex ?? res.CorrectAnswerIndex;
          setHeartsRemaining(hearts);
          setTotalScore(score);
          setCombo(cb);
          if (correct) {
            apiCorrectRef.current += 1;
            setApiCorrectCount(apiCorrectRef.current);
          }
          try {
            await refreshInventory();
          } catch {
            /* ignore */
          }
          setFeedback({
            correct,
            explanation: res.explanation ?? res.Explanation,
            correctIndex: corrIdx,
          });

          syncKanaBattleAnim(kanaGame, correct, powerUpUsed, setKanaBattleAnim);

          if (arcadeTheme === 'boss' && correct) {
            setBossHp((h) =>
              Math.max(0, h - Math.max(45, Math.ceil(400 / Math.max(1, questions.length)))),
            );
          }
          if (arcadeTheme === 'vsbot') {
            const botRoundCorrect = Math.random() < 0.7;
            setBotScore((b) =>
              b + (botRoundCorrect ? 15 + Math.floor(Math.random() * 9) : 4 + Math.floor(Math.random() * 6)),
            );
          }

          const last = index + 1 >= questions.length;
          const lostAllHearts = hearts <= 0;
          if (lostAllHearts || last) {
            if (timerRef.current) clearInterval(timerRef.current);
            try {
              const end = await endGameSession(sessionId);
              try {
                await refreshInventory();
              } catch {
                /* ignore */
              }
              setSummary({ mode: 'api', payload: end, lostAllHearts });
            } catch {
              try {
                await refreshInventory();
              } catch {
                /* ignore */
              }
              setSummary({
                mode: 'api',
                lostAllHearts,
                payload: {
                  finalScore: score,
                  correctCount: apiCorrectRef.current,
                  totalQuestions: questions.length,
                },
              });
            }
            setPhase('summary');
            busyRef.current = false;
            return;
          }
          setTimeout(() => {
            setFeedback(null);
            setPickedIndex(null);
            setIndex((i) => i + 1);
            busyRef.current = false;
          }, 850);
          return;
        } catch (e) {
          setError(
            e?.response?.data?.message ||
              (typeof e?.message === 'string' ? e.message : '') ||
              'Lỗi gửi đáp án — chuyển sang luyện offline.',
          );
          busyRef.current = false;
          if (kanaGame) startLocal(questionCount);
          return;
        }
      }

      /* local — điểm tối đa 100 theo tỷ lệ câu đúng / tổng câu */
      if (powerUpUsed === 'double-points') {
        pendingDoubleRef.current = false;
        setDoubleArmed(false);
      }
      const correct = chosenIndex != null && chosenIndex === q.correctIndex;
      setFeedback({
        correct,
        explanation: correct ? 'Đúng!' : `Đáp án: ${q.options[q.correctIndex]?.text}`,
        correctIndex: q.correctIndex,
      });

      syncKanaBattleAnim(kanaGame, correct, powerUpUsed, setKanaBattleAnim);

      let nextHearts = heartsRemaining;
      let nextCorrect = localCorrect;
      if (correct) {
        nextCorrect += 1;
      } else {
        nextHearts = Math.max(0, heartsRemaining - 1);
      }
      setLocalCorrect(nextCorrect);
      setHeartsRemaining(nextHearts);

      const last = index + 1 >= questions.length;
      const totalQ = questions.length;
      const finalLocalScore =
        totalQ > 0 ? Math.min(100, Math.round((nextCorrect / totalQ) * 100)) : 0;
      const localHeartsOut = nextHearts <= 0;

      if (nextHearts <= 0 || last) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSummary({
          mode: 'local',
          lostAllHearts: localHeartsOut,
          finalScore: finalLocalScore,
          correctCount: nextCorrect,
          totalQuestions: totalQ,
          heartsRemaining: nextHearts,
        });
        setPhase('summary');
        busyRef.current = false;
        return;
      }
      setTimeout(() => {
        setFeedback(null);
        setPickedIndex(null);
        setIndex((i) => i + 1);
        busyRef.current = false;
      }, 850);
    },
    [
      apiMode,
      sessionId,
      questions,
      index,
      phase,
      heartsRemaining,
      localCorrect,
      startLocal,
      questionCount,
      kanaGame,
      arcadeTheme,
      refreshInventory,
    ],
  );

  handlePickRef.current = (ci) => handlePick(ci);

  const addSentenceChip = useCallback(
    (itemId) => {
      if (phase !== 'playing' || feedback || busyRef.current) return;
      if (arcadeTheme !== 'sentence') return;
      setSentenceLayout((prev) => {
        const i = prev.bank.findIndex((x) => x.id === itemId);
        if (i < 0) return prev;
        const pickedItem = prev.bank[i];
        if (prev.slots.some((x) => x.id === pickedItem.id)) return prev;
        const nextBank = [...prev.bank.slice(0, i), ...prev.bank.slice(i + 1)];
        const nextSlots = [...prev.slots, pickedItem];
        if (nextSlots.length >= sentenceExpectedRef.current) {
          const opts = questions[index]?.options ?? [];
          const idx = pickSentenceChosenIndex(
            nextSlots.map((x) => x.text),
            opts,
          );
          queueMicrotask(() => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            handlePickRef.current?.(idx);
          });
        }
        return { bank: nextBank, slots: nextSlots };
      });
    },
    [phase, feedback, arcadeTheme, questions, index],
  );

  const removeSentenceChip = useCallback(
    (itemId) => {
      if (phase !== 'playing' || feedback || busyRef.current) return;
      setSentenceLayout((prev) => {
        const i = prev.slots.findIndex((x) => x.id === itemId);
        if (i < 0) return prev;
        const item = prev.slots[i];
        const nextSlots = [...prev.slots.slice(0, i), ...prev.slots.slice(i + 1)];
        const nextBank = prev.bank.some((x) => x.id === item.id) ? prev.bank : [...prev.bank, item];
        return { bank: nextBank, slots: nextSlots };
      });
    },
    [phase, feedback],
  );

  /** Cộng dồn nếu DB trả nhiều dòng cùng slug (seed trùng). */
  const invQty = (slug) => {
    const items = inventory?.items ?? inventory?.Items ?? [];
    let sum = 0;
    for (const i of items) {
      if ((i.slug ?? i.Slug) === slug) {
        sum += Math.max(0, Math.floor(Number(i.quantityOwned ?? i.QuantityOwned ?? 0) || 0));
      }
    }
    return sum;
  };

  /** 50:50 chưa nối gợi ý server — luôn hiện 0, nút tắt (tránh nhầm với số trong túi). */
  const FIFTY_FIFTY_USABLE = false;
  const invQtyFiftyFifty = () => (FIFTY_FIFTY_USABLE ? invQty('fifty-fifty') : 0);

  const onUseHeart = async () => {
    if (!apiMode || sessionId == null || busyRef.current) return;
    try {
      await postInventoryPowerUp({ sessionId, powerUpSlug: 'heart' });
    } catch (e) {
      setError(apiErrorMessage(e) || 'Không dùng được Heart.');
      return;
    }
    setError('');
    setHeartsRemaining((h) => Math.min(maxHearts, h + 1));
    try {
      await refreshInventory();
    } catch {
      /* đã dùng vật phẩm trên server — lỗi tải lại túi không nên báo như lỗi Heart */
    }
  };

  const onTimeFreeze = async () => {
    if (!apiMode || sessionId == null || busyRef.current) return;
    try {
      await postInventoryPowerUp({ sessionId, powerUpSlug: 'time-freeze' });
    } catch (e) {
      setError(apiErrorMessage(e) || 'Không dùng được Time Freeze.');
      return;
    }
    setError('');
    setSecondsLeft((s) => Math.min(s + 5, 999));
    try {
      await refreshInventory();
    } catch {
      /* tương tự heart — tránh báo lỗi sai khi chỉ GET inventory hỏng */
    }
  };

  const onArmDouble = () => {
    if (invQty('double-points') <= 0) return;
    if (pendingDoubleRef.current) {
      pendingDoubleRef.current = false;
      setDoubleArmed(false);
      return;
    }
    pendingDoubleRef.current = true;
    setDoubleArmed(true);
  };

  const onSkipQuestion = () => handlePick(null, 'skip');

  if (BLOCKED_PLAY_SLUGS.has(apiGameSlug)) {
    return <Navigate to={ROUTES.PLAY} replace />;
  }

  if (!slugOk) {
    return (
      <div className="play-game">
        <p>Game không tồn tại.</p>
        <Link to={ROUTES.PLAY}>← Danh sách</Link>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="play-game">
        <p>{error}</p>
        <Link to={ROUTES.PLAY}>← Danh sách</Link>
      </div>
    );
  }

  if (phase === 'setup') {
    const setupTitle = arcadeDisplayTitle(apiGameSlug, gameMeta?.name ?? gameMeta?.Name);
    const setupShell = useArcadeShell
      ? `play-game play-game--setup play-game--arcade play-arcade--${arcadeTheme}`
      : 'play-game play-game--setup';
    const hasQSelect =
      kanaGame ||
      apiGameSlug === 'vocabulary-speed-quiz' ||
      apiGameSlug === 'sentence-builder' ||
      apiGameSlug === 'daily-challenge' ||
      apiGameSlug === 'counter-quest' ||
      apiGameSlug === 'boss-battle' ||
      isFlashcardBattleSlug(apiGameSlug);
    const isFlash = isFlashcardBattleSlug(apiGameSlug);
    const { lead, accent } = splitSetupTitleAccent(setupTitle);
    const parentV = playSetupParentVariants(!!reduceMotion);
    const childV = playSetupChildVariants(!!reduceMotion);
    const features = getSetupFeatureRows(apiGameSlug, kanaGame, isFlash);
    const intro = getSetupShortIntro(apiGameSlug, kanaGame, isFlash);
    const qFieldLabel = getQuestionFieldLabel(apiGameSlug, isFlash);

    return (
      <PlayGameSetupPro>
        <Motion.div
          className={`${setupShell} play-setup-pro__content`}
          variants={parentV}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
        >
          <Motion.header variants={childV} className="play-setup-pro__head">
            <Link className="play-setup-pro__back" to={ROUTES.PLAY}>
              ← Trò chơi
            </Link>
            <h1 className="play-setup-pro__title">
              {lead ? <span className="play-setup-pro__title-part">{lead} </span> : null}
              <span className="play-setup-pro__title-accent">{accent}</span>
            </h1>
          </Motion.header>

          {hasQSelect ? (
            <Motion.div variants={childV} className="play-setup-pro__grid">
              <section className="play-setup-pro__info-card">
                <p className="play-setup-pro__lead">{intro}</p>
                <ul className="play-setup-pro__features">
                  {features.map((f) => (
                    <li key={f.title} className="play-setup-pro__feature">
                      <span className="play-setup-pro__feature-ico" aria-hidden>
                        {f.icon}
                      </span>
                      <div>
                        <div className="play-setup-pro__feature-title">{f.title}</div>
                        <div className="play-setup-pro__feature-desc">{f.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="play-setup-pro__config-card">
                <div className="play-setup-pro__config-title">
                  <span className="play-setup-pro__config-gear" aria-hidden>
                    ⚙
                  </span>
                  Cấu hình lượt chơi
                </div>
                <div className="play-game__setup-field play-setup-pro__field">
                  <label htmlFor="play-kana-qcount">{qFieldLabel}</label>
                  <select
                    id="play-kana-qcount"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  >
                    {(apiGameSlug === 'vocabulary-speed-quiz'
                      ? VOCAB_SPEED_Q_CHOICES
                      : apiGameSlug === 'sentence-builder'
                        ? SENTENCE_BUILDER_Q_CHOICES
                        : apiGameSlug === 'daily-challenge'
                          ? DAILY_CHALLENGE_Q_CHOICES
                          : apiGameSlug === 'counter-quest'
                            ? COUNTER_QUEST_Q_CHOICES
                            : apiGameSlug === 'boss-battle'
                              ? BOSS_BATTLE_Q_CHOICES
                              : isFlash
                                ? FLASHCARD_BATTLE_Q_CHOICES
                                : QUESTION_COUNT_CHOICES
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n} câu
                      </option>
                    ))}
                  </select>
                </div>
                {kanaGame ? (
                  <div className="play-setup-pro__modes" role="group" aria-label="Chọn bảng chữ">
                    <Link
                      to={`${ROUTES.PLAY}/hiragana-match`}
                      className={`play-setup-pro__mode${apiGameSlug === 'hiragana-match' ? ' play-setup-pro__mode--active' : ''}`}
                    >
                      Hiragana
                    </Link>
                    <Link
                      to={`${ROUTES.PLAY}/katakana-match`}
                      className={`play-setup-pro__mode${apiGameSlug === 'katakana-match' ? ' play-setup-pro__mode--active' : ''}`}
                    >
                      Katakana
                    </Link>
                  </div>
                ) : null}
              </section>
            </Motion.div>
          ) : (
            <Motion.p variants={childV} className="play-game__setup-hint play-setup-pro__hint-block">
              Game này chỉ chơi qua API — số câu và bộ đề do server. Nếu lỗi, kiểm tra đã seed{' '}
              <code>game_question_sets</code> / <code>game_questions</code> cho slug <code>{apiGameSlug}</code> (URL có
              thể dùng <code>_</code>, API tự đổi sang <code>-</code>).
            </Motion.p>
          )}

          <Motion.div variants={childV} className="play-setup-pro__rules">
            <p className="play-game__setup-hint play-setup-pro__hint-tight">
              {kanaGame ? (
                <>
                  <strong>10 giây</strong> mỗi câu (Hiragana/Katakana). Khi chơi qua API, đồng hồ hiển thị cũng dùng 10s
                  theo đặc tả; điểm tốc độ phía server vẫn tính theo cấu hình DB. Khi luyện offline: điểm tối đa{' '}
                  <strong>100</strong> theo tỷ lệ đúng/tổng câu.
                </>
              ) : (
                <>
                  Lần đầu vào game, server có thể <strong>cấp túi đồ mở đầu</strong> nếu bạn chưa có vật phẩm — sau đó
                  dùng thanh power-up khi chơi API.{' '}
                  {apiGameSlug === 'sentence-builder' ? (
                    <>
                      <strong>Sentence Builder</strong>: số câu mỗi phiên do bạn chọn ở trên; mỗi câu sắp xếp các mảnh từ
                      thành đúng thứ tự.
                    </>
                  ) : apiGameSlug === 'daily-challenge' ? (
                    <>
                      <strong>Daily Challenge</strong>: số câu mỗi phiên do bạn chọn ở trên (tối thiểu 5); câu hỏi lấy
                      ngẫu nhiên trong bộ đề daily trên server.
                    </>
                  ) : apiGameSlug === 'counter-quest' ? (
                    <>
                      <strong>Counter Quest</strong>: server ưu tiên câu trắc nghiệm <strong>quiz trong bài học</strong>{' '}
                      (4 đáp án ngắn, gợi ý trợ từ đếm). Thêm hoặc sửa nội dung qua trang quản trị bài học; nếu chưa đủ
                      câu phù hợp thì dùng bộ đề có sẵn trên SQL.
                    </>
                  ) : isFlash ? (
                    <>
                      <strong>Flashcard Battle</strong>: câu hỏi lấy từ <strong>từ vựng các bài học</strong> (giống
                      Vocabulary Speed); bot vẫn mô phỏng tỷ lệ đúng như trước. Cập nhật từ vựng trong bài học hoặc chạy
                      patch SQL để có thêm câu dự phòng.
                    </>
                  ) : apiGameSlug === 'boss-battle' ? (
                    <>
                      <strong>Boss Battle</strong>: câu hỏi lấy từ <strong>từ vựng &amp; kanji bài học</strong> (ưu tiên
                      bài bạn đã mở gần đây); HP boss chia theo số câu. Thiếu dữ liệu bài học thì dùng bộ đề server (patch
                      SQL).
                    </>
                  ) : (
                    <>
                      <strong>Vocabulary Speed Quiz</strong>: đồng hồ client <strong>8 giây</strong>/câu; câu hỏi lấy từ{' '}
                      <strong>từ vựng bài học</strong> (bài đã có trong tiến độ của bạn), thiếu thì bổ sung từ khoá học
                      đã xuất bản.
                    </>
                  )}
                </>
              )}
            </p>
          </Motion.div>

          <Motion.div variants={childV}>
            <Motion.button
              type="button"
              className="play-setup-pro__start play-btn play-btn--primary"
              onClick={() => beginGame()}
              whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              Bắt đầu <span aria-hidden>▶</span>
            </Motion.button>
          </Motion.div>

          <Motion.section variants={childV} className="play-setup-pro__banner" aria-label="Cảm hứng học tập">
            <div className="play-setup-pro__banner-media" />
            <p className="play-setup-pro__banner-cap">Cảm hứng học tập từ thiên nhiên</p>
          </Motion.section>
        </Motion.div>
      </PlayGameSetupPro>
    );
  }

  if (phase === 'loading') {
    const loadShell = useArcadeShell
      ? `play-game play-game--center play-game--arcade play-arcade--${arcadeTheme}`
      : 'play-game play-game--center';
    return (
      <div className={loadShell}>
        <p className={useArcadeShell ? 'play-arcade__muted' : undefined}>Đang chuẩn bị phiên chơi…</p>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    const p = summary.payload || summary;
    const ranOutOfHearts = summary.lostAllHearts === true;
    const rawScore =
      summary.finalScore ?? p.finalScore ?? p.FinalScore ?? totalScore;
    const score = Math.min(100, Number(rawScore) || 0);
    const correct =
      p.correctCount ??
      p.CorrectCount ??
      summary.correctCount ??
      apiCorrectCount ??
      localCorrect;
    const totalQ = p.totalQuestions ?? p.TotalQuestions ?? summary.totalQuestions ?? questions.length;
    const acc = p.accuracyPercent ?? p.AccuracyPercent;
    const exp = p.expEarned ?? p.ExpEarned;
    const xu = p.xuEarned ?? p.XuEarned;
    const sumShell = useArcadeShell
      ? `play-game play-summary play-game--arcade play-arcade--${arcadeTheme} play-summary--arcade`
      : 'play-game play-summary';
    return (
      <div className={sumShell}>
        <h1 className="play-summary__title">Kết thúc</h1>
        <p className="play-summary__score">
          Điểm: {score}/100
        </p>
        {ranOutOfHearts ? (
          <p className="play-summary__line play-summary__line--hearts">
            Bạn đã hết mạng — phiên kết thúc sớm. <strong>Điểm, EXP và Xu</strong> vẫn theo số câu đúng và điểm đã ghi
            nhận. Chọn &quot;Chơi lại&quot; để về màn chọn số câu.
          </p>
        ) : null}
        {summary.mode === 'api' ? (
          <p className="play-summary__hint">
            Điểm phiên theo thang <strong>0–100</strong> (≈ 100 chia số câu; ×2 cho một câu đúng khi dùng vật phẩm).
            Phần thưởng cuối phiên: <strong>10 EXP</strong> và <strong>1 xu</strong> mỗi câu đúng (tối đa theo cấu hình
            game).
          </p>
        ) : null}
        {correct != null && totalQ != null ? (
          <p className="play-summary__line">
            Đúng {correct}/{totalQ}
            {acc != null ? ` (${Number(acc).toFixed(0)}%)` : ''}
          </p>
        ) : null}
        {exp != null ? <p className="play-summary__line">EXP: +{exp}</p> : null}
        {xu != null ? <p className="play-summary__line">Xu: +{xu}</p> : null}
        {summary.mode === 'local' ? (
          <p className="play-summary__hint">Chế độ luyện trên máy (API không khả dụng hoặc chưa seed DB).</p>
        ) : (
          <p className="play-summary__hint play-summary__links">
            <Link to={`${ROUTES.PLAY}/achievements`}>Thành tích</Link>
            <span aria-hidden> · </span>
            <Link to={`${ROUTES.PLAY}/leaderboard`}>Bảng xếp hạng</Link>
          </p>
        )}
        <div className="play-summary__actions">
          <button
            type="button"
            className="play-btn play-btn--primary"
            onClick={() => {
              setSummary(null);
              setPhase('setup');
            }}
          >
            Chơi lại
          </button>
          <Link className="play-btn play-btn--ghost" to={ROUTES.PLAY}>
            Danh sách game
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const kanaBattlefield = kanaGame ? kanaBattlefieldAt(index) : '';
  const title = useArcadeShell
    ? arcadeDisplayTitle(apiGameSlug, gameMeta?.name ?? gameMeta?.Name)
    : gameMeta?.name ?? gameMeta?.Name ?? prettyTitleFromSlug(gameSlug);
  const promptLabel = kanaGame ? 'Chọn romaji đúng với ký tự:' : 'Chọn đáp án đúng:';
  const totalQPlaying = questions.length;
  const displayScore = apiMode
    ? Math.min(100, totalScore)
    : totalQPlaying > 0
      ? Math.min(100, Math.round((localCorrect / totalQPlaying) * 100))
      : 0;

  const { main: qMain, sub: qSub } = splitQuestionDisplay(q?.questionText ?? '');
  const showSentenceUI = Boolean(
    useArcadeShell && arcadeTheme === 'sentence' && q && isSentenceChipQuestion(q) && sentenceCanonKey,
  );
  const progressPct =
    totalQPlaying > 0 ? Math.min(100, ((index + 1) / totalQPlaying) * 100) : 0;
  const playerHpPct = maxHearts > 0 ? Math.round((heartsRemaining / maxHearts) * 100) : 100;

  const arcadeMidPrompt =
    arcadeTheme === 'speed'
      ? 'Từ này có nghĩa là gì?'
      : arcadeTheme === 'counter'
        ? 'Cách đếm đúng là gì?'
        : arcadeTheme === 'vsbot'
          ? 'Nhanh tay trả lời trước Bot!'
          : arcadeTheme === 'daily'
            ? 'Chọn đáp án đúng:'
            : arcadeTheme === 'sentence' && !showSentenceUI
              ? promptLabel
              : arcadeTheme === 'boss' || arcadeTheme === 'sentence'
                ? null
                : promptLabel;

  const powerShell = useArcadeShell ? 'play-arcade__power play-arcade__power--icons' : 'play-power play-power--icons';
  const powerUpBar =
    apiMode && !feedback ? (
      <div className={powerShell} aria-label="Vật phẩm">
        <span className={useArcadeShell ? 'play-arcade__power-label' : 'play-power__label'}>Vật phẩm</span>
        <div className={useArcadeShell ? 'play-arcade__power-icons' : 'play-power__icons'}>
          <button
            key="pu-fifty-fifty"
            type="button"
            className={
              useArcadeShell
                ? 'play-arcade__power-icon play-arcade__power-icon--off'
                : 'play-power__icon play-power__icon--off'
            }
            disabled
            title="50:50 — đang phát triển (gợi ý từ server). Mua tại cửa hàng khi đã mở tính năng."
          >
            <img src={artPowerup5050} alt="" className="play-power__pu-img" />
            <span className="play-power__pu-qty" aria-hidden>
              {invQtyFiftyFifty()}
            </span>
            <span className="visually-hidden">50:50</span>
          </button>
          <button
            key="pu-time-freeze"
            type="button"
            className={useArcadeShell ? 'play-arcade__power-icon' : 'play-power__icon'}
            disabled={invQty('time-freeze') <= 0}
            title="Time Freeze: +5 giây cho câu hiện tại"
            onClick={onTimeFreeze}
          >
            <img src={artPowerupTimeFreeze} alt="" className="play-power__pu-img" />
            <span className="play-power__pu-qty" aria-hidden>
              {invQty('time-freeze')}
            </span>
            <span className="visually-hidden">Time Freeze</span>
          </button>
          <button
            key="pu-double-points"
            type="button"
            className={
              useArcadeShell
                ? `play-arcade__power-icon${doubleArmed ? ' play-arcade__power-icon--armed' : ''}`
                : `play-power__icon${doubleArmed ? ' play-power__icon--armed' : ''}`
            }
            disabled={invQty('double-points') <= 0}
            title="×2 điểm: bật nút (viền hồng), rồi chọn đáp án đúng — chỉ trừ túi khi trả lời đúng. Bấm lại để tắt."
            onClick={onArmDouble}
            aria-pressed={doubleArmed}
          >
            <img src={artPowerupDouble} alt="" className="play-power__pu-img" />
            <span className="play-power__pu-qty" aria-hidden>
              {invQty('double-points')}
            </span>
            <span className="visually-hidden">Double points</span>
          </button>
          <button
            key="pu-skip"
            type="button"
            className={useArcadeShell ? 'play-arcade__power-icon' : 'play-power__icon'}
            disabled={invQty('skip') <= 0}
            title="Skip: bỏ qua câu, không trừ mạng"
            onClick={onSkipQuestion}
          >
            <img src={artPowerupSkip} alt="" className="play-power__pu-img" />
            <span className="play-power__pu-qty" aria-hidden>
              {invQty('skip')}
            </span>
            <span className="visually-hidden">Skip</span>
          </button>
          <button
            key="pu-heart"
            type="button"
            className={useArcadeShell ? 'play-arcade__power-icon' : 'play-power__icon'}
            disabled={invQty('heart') <= 0}
            title="Heart: hồi 1 mạng"
            onClick={onUseHeart}
          >
            <img src={artPowerupHeart} alt="" className="play-power__pu-img" />
            <span className="play-power__pu-qty" aria-hidden>
              {invQty('heart')}
            </span>
            <span className="visually-hidden">Heart</span>
          </button>
        </div>
      </div>
    ) : null;

  if (useArcadeShell) {
    return (
      <div className={`play-game play-game--arcade play-arcade--${arcadeTheme}`}>
        <header className="play-arcade__header">
          <div className="play-arcade__header-row">
            <div className="play-arcade__header-left">
              <Link className="play-arcade__back" to={ROUTES.PLAY}>
                ← Quay lại
              </Link>
              {arcadeTheme === 'daily' ? (
                <span className="play-arcade__pill play-arcade__pill--daily">📅 DAILY</span>
              ) : null}
              <h1 className="play-arcade__title">{title}</h1>
            </div>
            <div className="play-arcade__header-right">
              {arcadeTheme === 'vsbot' ? (
                <>
                  <span className="play-arcade__vs">
                    <strong>{displayScore}</strong> Bạn <span className="play-arcade__vs-mid">VS</span> Bot 🤖{' '}
                    <strong>{botScore}</strong>
                  </span>
                  <span className="play-arcade__q-count">
                    {index + 1}/{totalQPlaying || 1}
                  </span>
                </>
              ) : (
                <>
                  <span className="play-arcade__star-score" aria-label="điểm">
                    <span aria-hidden>⭐</span> {displayScore}
                    {arcadeTheme !== 'vsbot' ? (
                      <span className="play-arcade__score-suffix">/100</span>
                    ) : null}
                  </span>
                  {arcadeTheme !== 'boss' ? (
                    <span className="play-arcade__hearts" aria-label="mạng">
                      {Array.from({ length: maxHearts }).map((_, i) => (
                        <span
                          key={`h-${i}`}
                          className={
                            i < heartsRemaining ? 'play-arcade__heart play-arcade__heart--on' : 'play-arcade__heart'
                          }
                          aria-hidden
                        >
                          ♥
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="play-arcade__q-count">
                    {index + 1}/{totalQPlaying || 1}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="play-arcade__progress-row">
            <div
              className={`play-arcade__progress-fill ${arcadeTheme === 'vsbot' ? 'play-arcade__progress-fill--pink' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="play-arcade__progress-meta">
            <span>
              {index + 1}/{totalQPlaying || 1}
            </span>
            <span className="play-arcade__timer-chip" aria-live="polite">
              {feedback ? '—' : `⏱ ${secondsLeft}s`}
            </span>
          </div>
          {arcadeTheme === 'speed' && !feedback ? (
            <div className="play-arcade__timer-hero" aria-hidden>
              Còn <strong>{secondsLeft}</strong> giây
            </div>
          ) : null}
          {combo > 1 ? <div className="play-arcade__combo">Combo ×{combo}</div> : null}
          {arcadeTheme === 'vsbot' ? (
            <p className="play-arcade__bot-hint">
              Bot mô phỏng ~70% “trúng” mỗi câu (điểm bot tăng ngẫu nhiên theo tỷ lệ đó, độc lập với bạn).
            </p>
          ) : null}
        </header>

        {error ? <div className="play-arcade__err">{error}</div> : null}
        {powerUpBar}

        {arcadeTheme === 'boss' && q ? (
          <section className="play-arcade__boss-panel" aria-label="Boss">
            <div className="play-arcade__boss-emoji" aria-hidden>
              👹
            </div>
            <div className="play-arcade__boss-caption">鬼 (Quỷ Oni)</div>
            <div className="play-arcade__meter">
              <span className="play-arcade__meter-label">HP</span>
              <div className="play-arcade__meter-track play-arcade__meter-track--boss">
                <div style={{ width: `${(bossHp / 400) * 100}%` }} />
              </div>
              <span className="play-arcade__meter-val">
                {bossHp}/400
              </span>
            </div>
            <div className="play-arcade__meter play-arcade__meter--player">
              <span className="play-arcade__meter-label">Bạn</span>
              <div className="play-arcade__meter-track play-arcade__meter-track--player">
                <div style={{ width: `${playerHpPct}%` }} />
              </div>
              <span className="play-arcade__meter-val">{playerHpPct}%</span>
            </div>
            <p className="play-arcade__boss-flavor">Trả lời đúng để tấn công Boss!</p>
          </section>
        ) : null}

        {q ? (
          <>
            {arcadeTheme === 'sentence' && showSentenceUI ? (
              <>
                <p className="play-arcade__instruction">Sắp xếp các từ thành câu đúng:</p>
                {q.questionText ? (
                  <p className="play-arcade__sentence-vi">&quot;{String(q.questionText).replace(/\n/g, ' ')}&quot;</p>
                ) : null}
                <button
                  type="button"
                  className="play-arcade__hint-btn"
                  onClick={() => setShowSentenceHint((v) => !v)}
                >
                  💡 {showSentenceHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
                </button>
                {showSentenceHint ? (
                  <p className="play-arcade__hint-txt" lang="ja">
                    {sentenceCanonKey}
                  </p>
                ) : null}
                <div className="play-arcade__slot-board">
                  {sentenceSlots.length === 0 ? (
                    <span className="play-arcade__slot-placeholder">Nhấn vào từ bên dưới…</span>
                  ) : (
                    sentenceSlots.map((item, si) => (
                      <button
                        key={`sl-${si}-${item.id}`}
                        type="button"
                        className="play-arcade__slot-chip"
                        lang="ja"
                        disabled={!!feedback}
                        onClick={() => removeSentenceChip(item.id)}
                      >
                        {item.text}
                      </button>
                    ))
                  )}
                </div>
                <div className="play-arcade__word-bank">
                  {sentenceBank.map((item, bi) => (
                    <button
                      key={`bk-${bi}-${item.id}`}
                      type="button"
                      className="play-arcade__bank-chip"
                      lang="ja"
                      disabled={!!feedback}
                      onClick={() => addSentenceChip(item.id)}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {arcadeMidPrompt ? <p className="play-arcade__instruction">{arcadeMidPrompt}</p> : null}
                <div className="play-arcade__q-card">
                  {arcadeTheme === 'counter' ? (
                    <div className="play-arcade__icon-badge" aria-hidden>
                      🔢
                    </div>
                  ) : null}
                  {arcadeTheme === 'daily' ? (
                    <div className="play-arcade__pill play-arcade__pill--gold">
                      <span lang="ja">
                        {(qMain.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/) || [])[0] || 'あ'}
                      </span>{' '}
                      Daily
                    </div>
                  ) : null}
                  <div className="play-arcade__q-main" lang="ja">
                    {qMain || q.questionText}
                  </div>
                  {qSub ? (
                    <div className="play-arcade__q-sub" lang="ja">
                      {qSub}
                    </div>
                  ) : null}
                  <div className="play-arcade__speak">
                    <SpeakJaButton
                      text={String(q.questionText ?? '')}
                      label={`Nghe phát âm: ${q.questionText}`}
                    />
                  </div>
                </div>
                <div className="play-arcade__options">
                  {q.options.map((opt, i) => {
                    let cls = 'play-arcade__opt';
                    if (feedback) {
                      if (feedback.correctIndex === i) cls += ' play-arcade__opt--correct';
                      if (!feedback.correct && pickedIndex === i) cls += ' play-arcade__opt--wrong';
                    }
                    return (
                      <button
                        key={`${index}-${i}-${opt.text}`}
                        type="button"
                        className={cls}
                        disabled={!!feedback}
                        onClick={() => handlePick(i)}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : null}

        {feedback ? (
          <p
            className={`play-arcade__fb ${feedback.correct ? 'play-arcade__fb--ok' : 'play-arcade__fb--bad'}`}
          >
            {feedback.correct ? 'Chính xác!' : 'Chưa đúng.'}{' '}
            {feedback.explanation ? <span className="play-arcade__fb-exp">{feedback.explanation}</span> : null}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={kanaGame && phase === 'playing' ? 'play-game play-game--kana-battle' : 'play-game'}>
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">{title}</h1>
        <div className="play-game__hud">
          <span className="play-game__hearts" aria-label="mạng">
            {'❤'.repeat(Math.max(0, heartsRemaining))}
            {'♡'.repeat(Math.max(0, maxHearts - heartsRemaining))}
          </span>
          <span className="play-game__score">
            Điểm: {displayScore}/100
          </span>
          {combo > 1 ? <span className="play-game__combo">Combo ×{combo}</span> : null}
          <span className="play-game__timer">{feedback ? '—' : `${secondsLeft}s`}</span>
        </div>
      </header>

      {error ? <div className="play-game__err">{error}</div> : null}

      {powerUpBar}

      {kanaGame && phase === 'playing' ? (
        <section
          className={`play-kana-battle play-kana-battle--${kanaBattlefield}`}
          aria-label="Chiến trường luyện tập"
          data-anim={kanaBattleAnim}
        >
          <div className="play-kana-battle__strip" aria-hidden>
            <div className="play-kana-battle__hp play-kana-battle__hp--player">
              <span className="play-kana-battle__hp-label">Ninja</span>
              <span className="play-kana-battle__hp-track">
                <span
                  className="play-kana-battle__hp-fill play-kana-battle__hp-fill--player"
                  style={{ width: `${playerHpPct}%` }}
                />
              </span>
            </div>
            <div className="play-kana-battle__hp play-kana-battle__hp--enemy">
              <span className="play-kana-battle__hp-label">Yurei</span>
              <span className="play-kana-battle__hp-track">
                <span className="play-kana-battle__hp-fill play-kana-battle__hp-fill--enemy" />
              </span>
            </div>
          </div>
          <div className="play-kana-battle__stage">
            <div className="play-kana-battle__actor play-kana-battle__ninja-wrap">
              <div className="play-kana-battle__actor-label visually-hidden">Ninja chibi</div>
              <div className="play-kana-battle__ninja">
                <div className="play-kana-battle__ninja-band" />
                <div className="play-kana-battle__ninja-face">
                  <span className="play-kana-battle__ninja-eye" />
                  <span className="play-kana-battle__ninja-eye" />
                </div>
                <div className="play-kana-battle__ninja-body" />
                <div className="play-kana-battle__ninja-sword" />
              </div>
            </div>
            <div className="play-kana-battle__actor play-kana-battle__yurei-wrap">
              <div className="play-kana-battle__actor-label visually-hidden">Yurei</div>
              <div className="play-kana-battle__yurei">
                <div className="play-kana-battle__yurei-sheet">
                  <div className="play-kana-battle__yurei-face">
                    <span className="play-kana-battle__yurei-eye" />
                    <span className="play-kana-battle__yurei-eye" />
                    <span className="play-kana-battle__yurei-blush" />
                    <span className="play-kana-battle__yurei-blush" />
                  </div>
                  <div className="play-kana-battle__yurei-arm play-kana-battle__yurei-arm--l" />
                  <div className="play-kana-battle__yurei-arm play-kana-battle__yurei-arm--r">
                    <span className="play-kana-battle__yurei-tablet" aria-hidden />
                  </div>
                </div>
                <div className="play-kana-battle__yurei-tail" />
              </div>
            </div>
          </div>
          <p className="play-kana-battle__hint">Trả lời đúng để Ninja tấn công; sai hoặc hết giờ thì Yurei phản đòn.</p>
        </section>
      ) : null}

      {q ? (
        <>
          <p className="play-game__prompt">{promptLabel}</p>
          <div className="play-game__kana-row">
            <div className="play-game__kana" lang="ja">
              {q.questionText}
            </div>
            <SpeakJaButton
              text={String(q.questionText ?? '')}
              label={`Nghe phát âm: ${q.questionText}`}
            />
          </div>
          <div className="play-game__options">
            {q.options.map((opt, i) => {
              let cls = 'play-opt';
              if (feedback) {
                if (feedback.correctIndex === i) cls += ' play-opt--correct';
                if (!feedback.correct && pickedIndex === i) cls += ' play-opt--wrong';
              }
              return (
                <button
                  key={`${index}-${i}-${opt.text}`}
                  type="button"
                  className={cls}
                  disabled={!!feedback}
                  onClick={() => handlePick(i)}
                >
                  {opt.text}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {feedback ? (
        <p className={`play-game__fb ${feedback.correct ? 'play-game__fb--ok' : 'play-game__fb--bad'}`}>
          {feedback.correct ? 'Chính xác!' : 'Chưa đúng.'}{' '}
          {feedback.explanation ? <span className="play-game__fb-exp">{feedback.explanation}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
