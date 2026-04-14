import http from './client';

export const socialApi = {
  getFriends: () => http.get('/api/Social/friends'),

  searchUsers: (params) => http.get('/api/Social/users/search', { params }),

  sendFriendRequest: (body) => http.post('/api/Social/friend-requests', body),

  getIncomingFriendRequests: () => http.get('/api/Social/friend-requests/incoming'),

  getOutgoingFriendRequests: () => http.get('/api/Social/friend-requests/outgoing'),

  cancelFriendRequest: (requestId) => http.delete(`/api/Social/friend-requests/${requestId}`),

  acceptFriendRequest: (requestId) => http.post(`/api/Social/friend-requests/${requestId}/accept`),

  rejectFriendRequest: (requestId) => http.post(`/api/Social/friend-requests/${requestId}/reject`),

  updatePresence: (body) => http.post('/api/Social/presence', body),
};
