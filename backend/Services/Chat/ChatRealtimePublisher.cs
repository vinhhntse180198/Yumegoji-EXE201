using System.Threading.Tasks;
using backend.DTOs.Chat;
using backend.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace backend.Services.Chat;

public class ChatRealtimePublisher : IChatRealtimePublisher
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatRealtimePublisher(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public Task NotifyReceiveMessageAsync(int roomId, MessageDto message) =>
        _hub.Clients.Group(ChatHub.RoomGroupName(roomId)).SendAsync("ReceiveMessage", message);

    public Task NotifyMessageUpdatedAsync(int roomId, MessageDto message) =>
        _hub.Clients.Group(ChatHub.RoomGroupName(roomId)).SendAsync("MessageUpdated", message);

    public Task NotifyMessageDeletedAsync(int roomId, int messageId) =>
        _hub.Clients.Group(ChatHub.RoomGroupName(roomId)).SendAsync("MessageDeleted", new { roomId, messageId });

    public Task NotifyMemberRemovedAsync(int roomId, int removedUserId) =>
        _hub.Clients.Group(ChatHub.RoomGroupName(roomId)).SendAsync("MemberRemoved", new { roomId, removedUserId });
}
