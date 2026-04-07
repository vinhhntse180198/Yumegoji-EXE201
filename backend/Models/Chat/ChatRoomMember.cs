using System;

namespace backend.Models.Chat;

public class ChatRoomMember
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "member";
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }

    public ChatRoom? Room { get; set; }
}
