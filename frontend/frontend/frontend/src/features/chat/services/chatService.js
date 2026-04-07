import http from '../../../services/http';

/**
 * Khớp ASP.NET ChatController — luôn dùng dấu gạch ngang:
 * - GET  /api/Chat/public-rooms   (KHÔNG phải public_rooms)
 * - Query: type = "public" | "level" | "group"; levelId là số (khi type=level), KHÔNG gộp kiểu type=level1
 */
export const CHAT_API = '/api/Chat';

/** Bỏ undefined/null để axios không tạo chuỗi query lạ (vd. type=&levelId=). */
function cleanParams(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

function unwrapMessage(sendResult) {
  if (sendResult == null) return sendResult;
  if (sendResult.message != null) return sendResult.message;
  if (sendResult.Message != null) return sendResult.Message;
  return sendResult;
}

export const chatService = {
  /** GET room-catalog */
  async getRoomCatalog() {
    const { data } = await http.get(`${CHAT_API}/room-catalog`);
    return Array.isArray(data) ? data : [];
  },

  /** GET rooms — phòng của tôi */
  async getMyRooms({ type, limit = 50 } = {}) {
    const { data } = await http.get(`${CHAT_API}/rooms`, {
      params: cleanParams({ type, limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET public-rooms
   * @param {Object} opts
   * @param {'public'|'level'|'group'} [opts.type]
   * @param {string} [opts.slug]
   * @param {number} [opts.levelId] — bắt buộc khi muốn lọc đúng một cấp (N5=1 … tùy DB)
   * @param {number} [opts.limit]
   */
  async getPublicRooms({ type = 'public', slug, levelId, limit = 50 } = {}) {
    const { data } = await http.get(`${CHAT_API}/public-rooms`, {
      params: cleanParams({
        type,
        slug,
        levelId,
        limit,
      }),
    });
    return Array.isArray(data) ? data : [];
  },

  /** GET public-rooms/{roomId} */
  async getPublicRoom(roomId) {
    const { data } = await http.get(`${CHAT_API}/public-rooms/${roomId}`);
    return data;
  },

  /** GET rooms/{roomId} — đã là thành viên */
  async getRoom(roomId) {
    const { data } = await http.get(`${CHAT_API}/rooms/${roomId}`);
    return data;
  },

  async getRoomPresence(roomId) {
    const { data } = await http.get(`${CHAT_API}/rooms/${roomId}/presence`);
    return data;
  },

  /** includeOnline: chỉ moderator/admin mới nhận isOnline từ backend. */
  async getRoomMembers(roomId, { limit = 200, includeOnline = false } = {}) {
    const { data } = await http.get(`${CHAT_API}/rooms/${roomId}/members`, {
      params: cleanParams({ limit, includeOnline }),
    });
    return Array.isArray(data) ? data : [];
  },

  async getRoomMessages(roomId, { cursor, limit = 50 } = {}) {
    const { data } = await http.get(`${CHAT_API}/rooms/${roomId}/messages`, {
      params: cleanParams({ cursor, limit }),
    });
    return data;
  },

  async sendMessage(roomId, { content, type = 'text', replyToId } = {}) {
    // Chỉ gửi replyToId khi là số dương — tránh 0/null làm backend/FK lệch
    const body = {
      content: content ?? '',
      type,
    };
    const rid = replyToId != null && replyToId !== '' ? Number(replyToId) : NaN;
    if (Number.isFinite(rid) && rid > 0) {
      body.replyToId = rid;
    }
    const { data } = await http.post(`${CHAT_API}/rooms/${roomId}/messages`, body);
    const message = unwrapMessage(data);
    const warnings =
      data?.sensitiveKeywordMatches ?? data?.SensitiveKeywordMatches ?? [];
    return { message, sensitiveKeywordMatches: warnings };
  },

  async createRoom({
    name,
    type = 'group',
    slug,
    levelId,
    description,
    avatarUrl,
    maxMembers,
    initialMemberIds,
  } = {}) {
    const { data } = await http.post(`${CHAT_API}/rooms`, {
      name: name ?? 'Phòng chat',
      type,
      slug: slug ?? null,
      levelId: levelId ?? null,
      description: description ?? null,
      avatarUrl: avatarUrl ?? null,
      maxMembers: maxMembers ?? null,
      initialMemberIds: initialMemberIds ?? null,
    });
    return data;
  },

  async getOrCreateDirect(peerUserId) {
    const { data } = await http.post(`${CHAT_API}/direct`, {
      peerUserId,
    });
    return data;
  },

  async joinRoom(roomId) {
    await http.post(`${CHAT_API}/rooms/${roomId}/join`);
  },

  async leaveRoom(roomId) {
    await http.post(`${CHAT_API}/rooms/${roomId}/leave`);
  },

  /** Soft-delete phòng (nhóm: admin/người tạo); chat 1–1: rời khỏi phòng. */
  async deleteRoom(roomId) {
    await http.delete(`${CHAT_API}/rooms/${roomId}`);
  },

  async markRoomRead(roomId, lastReadMessageId) {
    await http.post(`${CHAT_API}/rooms/${roomId}/read`, {
      lastReadMessageId: lastReadMessageId ?? null,
    });
  },

  /** Body: { emoji } — like, love, haha, wow, sad, angry hoặc emoji unicode */
  async addReaction(roomId, messageId, emoji) {
    const { data } = await http.post(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/reactions`, {
      emoji,
    });
    return data;
  },

  async removeReaction(roomId, messageId, emoji) {
    await http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/reactions`, {
      params: { emoji },
    });
  },

  async pinMessage(roomId, messageId) {
    await http.post(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/pin`);
  },

  async unpinMessage(roomId, messageId) {
    await http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/pin`);
  },

  /** Thu hồi tin của chính mình (soft-delete) — khớp DELETE rooms/{roomId}/messages/{messageId}. */
  async deleteMessage(roomId, messageId) {
    await http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}`);
  },

  /** Moderator/Admin — xóa tin vi phạm (kiểm duyệt). */
  async deleteMessageAsModerator(roomId, messageId) {
    await http.delete(`${CHAT_API}/rooms/${roomId}/messages/${messageId}/moderate`);
  },
};
