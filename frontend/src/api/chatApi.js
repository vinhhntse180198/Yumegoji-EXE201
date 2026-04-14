import http from './client';

/** Khớp ASP.NET ChatController — base `/api/Chat`. */
export const CHAT_API = '/api/Chat';

export const chatApi = {
  getRoomCatalog: () => http.get(`${CHAT_API}/room-catalog`),

  getMyRooms: (config) => http.get(`${CHAT_API}/rooms`, config),

  getPublicRooms: (config) => http.get(`${CHAT_API}/public-rooms`, config),

  getPublicRoom: (roomId) => http.get(`${CHAT_API}/public-rooms/${roomId}`),

  getRoom: (roomId) => http.get(`${CHAT_API}/rooms/${roomId}`),

  getRoomPresence: (roomId) => http.get(`${CHAT_API}/rooms/${roomId}/presence`),

  getRoomMembers: (roomId, config) => http.get(`${CHAT_API}/rooms/${roomId}/members`, config),

  getRoomMessages: (roomId, config) => http.get(`${CHAT_API}/rooms/${roomId}/messages`, config),

  sendMessage: (roomId, body) => http.post(`${CHAT_API}/rooms/${roomId}/messages`, body),

  createRoom: (body) => http.post(`${CHAT_API}/rooms`, body),

  getOrCreateDirect: (body) => http.post(`${CHAT_API}/direct`, body),

  joinRoom: (roomId) => http.post(`${CHAT_API}/rooms/${roomId}/join`),

  leaveRoom: (roomId) => http.post(`${CHAT_API}/rooms/${roomId}/leave`),

  deleteRoom: (roomId) => http.delete(`${CHAT_API}/rooms/${roomId}`),

  markRoomRead: (roomId, body) => http.post(`${CHAT_API}/rooms/${roomId}/read`, body),

  addReaction: (roomId, messageId, body) =>
    http.post(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/reactions`, body),

  removeReaction: (roomId, messageId, config) =>
    http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/reactions`, config),

  pinMessage: (roomId, messageId) => http.post(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/pin`),

  unpinMessage: (roomId, messageId) =>
    http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/pin`),

  deleteMessage: (roomId, messageId) =>
    http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}`),

  deleteMessageAsModerator: (roomId, messageId) =>
    http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/moderate`),
};
