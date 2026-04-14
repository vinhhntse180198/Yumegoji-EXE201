import { useContext } from 'react';
import { ChatShellContext } from '../context/chatShellContext';

/** Dùng trong ChatRoomPage (header, panel phải) và MojiChatLayout. */
export function useChatShell() {
  return useContext(ChatShellContext) ?? {};
}
