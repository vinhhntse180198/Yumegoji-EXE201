import { socialApi } from '../api/socialApi';

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

export const socialService = {
  async getFriends() {
    const { data } = await socialApi.getFriends();
    return safeArray(data);
  },

  async searchUsers(q, limit = 20) {
    const { data } = await socialApi.searchUsers({ q, limit });
    return safeArray(data);
  },

  async sendFriendRequest(toUserId) {
    const { data } = await socialApi.sendFriendRequest({ toUserId });
    return data;
  },

  async getIncomingFriendRequests() {
    const { data } = await socialApi.getIncomingFriendRequests();
    return safeArray(data);
  },

  async getOutgoingFriendRequests() {
    const { data } = await socialApi.getOutgoingFriendRequests();
    return safeArray(data);
  },

  async cancelFriendRequest(requestId) {
    await socialApi.cancelFriendRequest(requestId);
  },

  async acceptFriendRequest(requestId) {
    const { data } = await socialApi.acceptFriendRequest(requestId);
    return data;
  },

  async rejectFriendRequest(requestId) {
    await socialApi.rejectFriendRequest(requestId);
  },

  async updatePresence(status = 'online') {
    await socialApi.updatePresence({ status });
  },
};
