import { CHAT_API, chatApi } from '../api/chatApi';

export { CHAT_API };

/**
 * Khớp ASP.NET ChatController — luôn dùng dấu gạch ngang:
 * - GET  /api/Chat/public-rooms   (KHÔNG phải public_rooms)
 * - Query: type = "public" | "level" | "group"; levelId là số (khi type=level), KHÔNG gộp kiểu type=level1
 */

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
  async getRoomCatalog() {
    const { data } = await chatApi.getRoomCatalog();
    return Array.isArray(data) ? data : [];
  },

  async getMyRooms({ type, limit = 50 } = {}) {
    const { data } = await chatApi.getMyRooms({
      params: cleanParams({ type, limit }),
    });
    return Array.isArray(data) ? data : [];
  },

  async getPublicRooms({ type = 'public', slug, levelId, limit = 50 } = {}) {
    const { data } = await chatApi.getPublicRooms({
      params: cleanParams({
        type,
        slug,
        levelId,
        limit,
      }),
    });
    return Array.isArray(data) ? data : [];
  },

  async getPublicRoom(roomId) {
    const { data } = await chatApi.getPublicRoom(roomId);
    return data;
  },

  async getRoom(roomId) {
    const { data } = await chatApi.getRoom(roomId);
    return data;
  },

  async getRoomPresence(roomId) {
    const { data } = await chatApi.getRoomPresence(roomId);
    return data;
  },

  async getRoomMembers(roomId, { limit = 200, includeOnline = false } = {}) {
    const { data } = await chatApi.getRoomMembers(roomId, {
      params: cleanParams({ limit, includeOnline }),
    });
    return Array.isArray(data) ? data : [];
  },

  async getRoomMessages(roomId, { cursor, limit = 50 } = {}) {
    const { data } = await chatApi.getRoomMessages(roomId, {
      params: cleanParams({ cursor, limit }),
    });
    return data;
  },

  async sendMessage(roomId, { content, type = 'text', replyToId } = {}) {
    const body = {
      content: content ?? '',
      type,
    };
    const rid = replyToId != null && replyToId !== '' ? Number(replyToId) : NaN;
    if (Number.isFinite(rid) && rid > 0) {
      body.replyToId = rid;
    }
    const { data } = await chatApi.sendMessage(roomId, body);
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
    const { data } = await chatApi.createRoom({
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
    const { data } = await chatApi.getOrCreateDirect({
      peerUserId,
    });
    return data;
  },

  async joinRoom(roomId) {
    await chatApi.joinRoom(roomId);
  },

  async leaveRoom(roomId) {
    await chatApi.leaveRoom(roomId);
  },

  async deleteRoom(roomId) {
    await chatApi.deleteRoom(roomId);
  },

  async markRoomRead(roomId, lastReadMessageId) {
    await chatApi.markRoomRead(roomId, {
      lastReadMessageId: lastReadMessageId ?? null,
    });
  },

  async addReaction(roomId, messageId, emoji) {
    const { data } = await chatApi.addReaction(roomId, messageId, {
      emoji,
    });
    return data;
  },

  async removeReaction(roomId, messageId, emoji) {
    await chatApi.removeReaction(roomId, messageId, {
      params: { emoji },
    });
  },

  async pinMessage(roomId, messageId) {
    await chatApi.pinMessage(roomId, messageId);
  },

  async unpinMessage(roomId, messageId) {
    await chatApi.unpinMessage(roomId, messageId);
  },

  async deleteMessage(roomId, messageId) {
    await chatApi.deleteMessage(roomId, messageId);
  },

  async deleteMessageAsModerator(roomId, messageId) {
    await chatApi.deleteMessageAsModerator(roomId, messageId);
  },
};
