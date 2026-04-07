using System;

namespace backend.DTOs.Chat;

public class ChatRoomMemberDto
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = null!;
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }

    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }

    /// <summary>Chỉ gửi khi moderator/admin gọi kèm includeOnline=true — đồng bộ UserOnlineStatuses.</summary>
    public bool? IsOnline { get; set; }

    public DateTime? PresenceLastSeenAt { get; set; }
}

