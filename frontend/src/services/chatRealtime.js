import * as signalR from '@microsoft/signalr';
import { buildChatHubUrl } from '../api/chatHub';
import { storage } from '../utils/storage';

const TOKEN_KEY = 'token';

/**
 * Kết nối SignalR, JoinRoom, đăng ký ReceiveMessage / MessageUpdated / MessageDeleted.
 * @param {string|number} roomId
 * @param {object} handlers
 * @returns {Promise<() => Promise<void>>} hàm disconnect
 */
export async function startChatRoomConnection(roomId, handlers) {
  const rid = Number(roomId);
  if (!Number.isFinite(rid)) {
    return async () => {};
  }

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(buildChatHubUrl(), {
      accessTokenFactory: () => storage.get(TOKEN_KEY) || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build();

  if (handlers.onReceiveMessage) {
    connection.on('ReceiveMessage', handlers.onReceiveMessage);
  }
  if (handlers.onMessageUpdated) {
    connection.on('MessageUpdated', handlers.onMessageUpdated);
  }
  if (handlers.onMessageDeleted) {
    connection.on('MessageDeleted', handlers.onMessageDeleted);
  }

  await connection.start();
  await connection.invoke('JoinRoom', rid);

  const rejoin = async () => {
    try {
      await connection.invoke('JoinRoom', rid);
    } catch {
      /* bỏ qua */
    }
  };
  connection.onreconnected(rejoin);

  return async () => {
    try {
      await connection.invoke('LeaveRoom', rid);
    } catch {
      /* bỏ qua */
    }
    await connection.stop();
  };
}
