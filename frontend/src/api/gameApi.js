import http from './client';

export const gameApi = {
  fetchGames: () => http.get('/api/game'),

  fetchAdminGames: () => http.get('/api/game/admin/games'),

  createAdminGame: (body) => http.post('/api/game/admin/games', body),

  deleteAdminGame: (gameId) => http.delete(`/api/game/admin/games/${gameId}`),

  startSession: (payload) => http.post('/api/game/session/start', payload),

  submitAnswer: (payload) => http.post('/api/game/session/answer', payload),

  endSession: (sessionId) => http.post(`/api/game/session/${sessionId}/end`),

  getLeaderboard: (config) => http.get('/api/game/leaderboard', config),

  fetchMyAchievements: () => http.get('/api/game/achievements'),

  fetchExpLeaderboard: (params) => http.get('/api/game/exp-leaderboard', { params }),

  fetchGameInventory: () => http.get('/api/game/inventory'),

  purchasePowerUp: (body) => http.post('/api/game/inventory/purchase', body),

  completeKanjiMemory: (body) => http.post('/api/game/kanji-memory/complete', body),

  useInventoryPowerUp: (body) => http.post('/api/game/inventory/use', body),

  fetchDailyChallenge: () => http.get('/api/game/daily-challenge'),

  createPvpRoom: (body) => http.post('/api/game/pvp/create', body),

  joinPvpRoom: (body) => http.post('/api/game/pvp/join', body),
};
