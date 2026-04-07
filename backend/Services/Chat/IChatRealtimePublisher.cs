using System.Threading.Tasks;
using backend.DTOs.Chat;

namespace backend.Services.Chat;

/// <summary>Broadcast tới SignalR group phòng (tương đương Socket.io emit trong bài mẫu).</summary>
public interface IChatRealtimePublisher
{
    Task NotifyReceiveMessageAsync(int roomId, MessageDto message);
    Task NotifyMessageUpdatedAsync(int roomId, MessageDto message);
    Task NotifyMessageDeletedAsync(int roomId, int messageId);
    Task NotifyMemberRemovedAsync(int roomId, int removedUserId);
}
