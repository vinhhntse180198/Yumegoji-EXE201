import http from './http';

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

export const socialService = {
  async getFriends() {
    const { data } = await http.get('/api/Social/friends');
    return safeArray(data);
  },

  async searchUsers(q, limit = 20) {
    const { data } = await http.get('/api/Social/users/search', {
      params: { q, limit },
    });
    return safeArray(data);
  },

  async sendFriendRequest(toUserId) {
    const { data } = await http.post('/api/Social/friend-requests', {
      toUserId,
    });
    return data;
  },

  async getIncomingFriendRequests() {
    const { data } = await http.get('/api/Social/friend-requests/incoming');
    return safeArray(data);
  },

  async getOutgoingFriendRequests() {
    const { data } = await http.get('/api/Social/friend-requests/outgoing');
    return safeArray(data);
  },

  /** Hủy lời mời đã gửi (pending) — DELETE /api/Social/friend-requests/{id}. */
  async cancelFriendRequest(requestId) {
    await http.delete(`/api/Social/friend-requests/${requestId}`);
  },

  async acceptFriendRequest(requestId) {
    const { data } = await http.post(`/api/Social/friend-requests/${requestId}/accept`);
    return data;
  },

  async rejectFriendRequest(requestId) {
    await http.post(`/api/Social/friend-requests/${requestId}/reject`);
  },

  /** Cập nhật online/offline (bảng user_online_status) — gọi định kỳ khi user đã đăng nhập. */
  async updatePresence(status = 'online') {
    await http.post('/api/Social/presence', { status });
  },
};
