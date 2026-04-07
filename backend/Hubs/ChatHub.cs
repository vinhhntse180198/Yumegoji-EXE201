using System.Security.Claims;
using backend.Authorization;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Hubs;

/// <summary>Realtime chat: client gọi JoinRoom sau khi có JWT (query access_token hoặc header).</summary>
[Authorize(Policy = AuthPolicies.Member)]
public class ChatHub : Hub
{
    private readonly IServiceScopeFactory _scopeFactory;

    public ChatHub(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public static string RoomGroupName(int roomId) => $"chat_room_{roomId}";

    public async Task JoinRoom(int roomId)
    {
        var userId = GetUserId();
        if (userId == 0)
        {
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var isMember = await db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == userId);
        if (!isMember)
        {
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, RoomGroupName(roomId));
    }

    public async Task LeaveRoom(int roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, RoomGroupName(roomId));
    }

    private int GetUserId()
    {
        var sub = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }
}
