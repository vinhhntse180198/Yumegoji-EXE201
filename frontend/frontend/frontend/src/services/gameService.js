import http from './http';

/**
 * @returns {Promise<Array<{ id, slug, name, description, skillType, maxHearts, isPvp, isBossMode, sortOrder }>>}
 */
export async function fetchGames() {
  const { data } = await http.get('/api/game');
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminGames() {
  const { data } = await http.get('/api/game/admin/games');
  return Array.isArray(data) ? data : [];
}

export async function createAdminGame(body) {
  const { data } = await http.post('/api/game/admin/games', body);
  return data ?? null;
}

export async function deleteAdminGame(gameId) {
  await http.delete(`/api/game/admin/games/${gameId}`);
}

/** Slug có nhánh lấy từ vựng/kanji/quiz bài học — mặc định ưu tiên bài học nếu client không gửi cờ. */
const LESSON_FIRST_GAME_SLUGS = new Set([
  'vocabulary-speed-quiz',
  'flashcard-vocabulary',
  'flashcard-battle',
  'counter-quest',
  'boss-battle',
]);

function normalizeGameSlug(slug) {
  return String(slug ?? '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * @param {{
 *   gameSlug: string,
 *   setId?: number|null,
 *   mode?: string,
 *   questionCount?: number,
 *   useLessonVocabulary?: boolean|null,
 * }} body
 */
export async function startGameSession(body) {
  const rawSet = body.setId;
  const setId =
    rawSet != null && Number.isFinite(Number(rawSet)) && Number(rawSet) > 0 ? Number(rawSet) : null;
  const payload = {
    gameSlug: body.gameSlug,
    setId,
    mode: body.mode ?? 'solo',
  };
  if (body.questionCount != null) payload.questionCount = Number(body.questionCount);

  const slugNorm = normalizeGameSlug(body.gameSlug);
  if (body.useLessonVocabulary != null) {
    payload.useLessonVocabulary = Boolean(body.useLessonVocabulary);
  } else if (LESSON_FIRST_GAME_SLUGS.has(slugNorm)) {
    payload.useLessonVocabulary = true;
  }

  const { data } = await http.post('/api/game/session/start', payload);
  return data;
}

/**
 * @param {{
 *   sessionId: number,
 *   questionId: number,
 *   questionOrder: number,
 *   chosenIndex: number|null,
 *   responseMs: number|null,
 *   powerUpUsed?: string|null
 * }} body
 */
export async function submitGameAnswer(body) {
  const sessionId = Number(body.sessionId);
  const questionId = Number(body.questionId);
  const questionOrder = Number(body.questionOrder);
  if (!Number.isFinite(sessionId) || sessionId < 1) {
    throw new Error('Mã phiên game không hợp lệ.');
  }
  if (!Number.isFinite(questionId) || questionId < 1) {
    throw new Error('Mã câu hỏi không hợp lệ — hãy thoát và bắt đầu phiên mới.');
  }
  if (!Number.isFinite(questionOrder) || questionOrder < 1) {
    throw new Error('Thứ tự câu không hợp lệ.');
  }
  const chosenRaw = body.chosenIndex;
  const chosenIndex =
    chosenRaw === null || chosenRaw === undefined || chosenRaw === '' ? null : Number(chosenRaw);
  if (chosenIndex != null && !Number.isFinite(chosenIndex)) {
    throw new Error('Chỉ số đáp án không hợp lệ.');
  }
  const msRaw = body.responseMs;
  const responseMs =
    msRaw === null || msRaw === undefined || msRaw === '' ? null : Number(msRaw);
  const payload = {
    sessionId,
    questionId,
    questionOrder,
    chosenIndex,
    responseMs: responseMs != null && Number.isFinite(responseMs) ? Math.max(0, Math.floor(responseMs)) : null,
    powerUpUsed: body.powerUpUsed == null || body.powerUpUsed === '' ? null : String(body.powerUpUsed),
  };
  const { data } = await http.post('/api/game/session/answer', payload);
  return data;
}

export async function endGameSession(sessionId) {
  const raw =
    sessionId != null && typeof sessionId === 'object'
      ? sessionId.sessionId ?? sessionId.SessionId ?? sessionId.id ?? sessionId.Id
      : sessionId;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) {
    throw new Error('Mã phiên game không hợp lệ.');
  }
  const { data } = await http.post(`/api/game/session/${id}/end`);
  return data;
}

/**
 * @param {{ gameSlug?: string|null, period?: 'weekly'|'monthly', sortBy?: 'score'|'accuracy'|'speed', levelId?: number|null, friendsOnly?: boolean }} q
 */
export async function fetchLeaderboard(q = {}) {
  const params = new URLSearchParams();
  if (q.gameSlug) params.set('gameSlug', q.gameSlug);
  if (q.period) params.set('period', q.period);
  if (q.sortBy) params.set('sortBy', q.sortBy);
  if (q.levelId != null) params.set('levelId', String(q.levelId));
  if (q.friendsOnly) params.set('friendsOnly', 'true');
  const qs = params.toString();
  const { data } = await http.get(`/api/game/leaderboard${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchMyAchievements() {
  const { data } = await http.get('/api/game/achievements');
  return Array.isArray(data) ? data : [];
}

/** BXH tổng EXP (users.exp) — không cần đăng nhập. */
export async function fetchExpLeaderboard(limit = 10) {
  const n = Math.min(100, Math.max(1, Number(limit) || 10));
  const { data } = await http.get(`/api/game/exp-leaderboard?limit=${n}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchGameInventory() {
  const { data } = await http.get('/api/game/inventory');
  return data ?? {};
}

/** @param {{ powerUpSlug: string, quantity?: number }} body */
export async function purchaseGamePowerUp(body) {
  const { data } = await http.post('/api/game/inventory/purchase', {
    powerUpSlug: body.powerUpSlug,
    quantity: body.quantity != null ? Math.min(99, Math.max(1, Number(body.quantity))) : 1,
  });
  return data ?? {};
}

/** Hoàn thành Kanji Memory (client) — cộng EXP/xu trên server. */
export async function completeKanjiMemoryRewards(body) {
  const { data } = await http.post('/api/game/kanji-memory/complete', {
    totalPairs: Number(body.totalPairs),
    matchedPairs: Number(body.matchedPairs),
  });
  return data ?? {};
}

/** POST /api/game/inventory/use — tên không dùng tiền tố "use" để tránh nhầm với React Hook. */
/** @param {{ sessionId: number, powerUpSlug: string }} body */
export async function postInventoryPowerUp(body) {
  await http.post('/api/game/inventory/use', {
    sessionId: body.sessionId,
    powerUpSlug: body.powerUpSlug,
  });
}

export async function fetchDailyChallenge() {
  const res = await http.get('/api/game/daily-challenge');
  if (res.status === 204) return null;
  return res.data ?? null;
}

export async function createPvpRoom(body) {
  const { data } = await http.post('/api/game/pvp/create', {
    gameSlug: body.gameSlug,
    levelId: body.levelId ?? null,
  });
  return data;
}

export async function joinPvpRoom(body) {
  const { data } = await http.post('/api/game/pvp/join', { roomCode: body.roomCode });
  return data;
}
