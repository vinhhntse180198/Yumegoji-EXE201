using System;

namespace backend.DTOs.Chat;

public class ChatRoomDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string Type { get; set; } = null!;
    public int? LevelId { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public int? MaxMembers { get; set; }
    public bool IsActive { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    /// <summary>Cho room private/direct: user còn lại trong room (peer).</summary>
    public ChatRoomPeerDto? PeerUser { get; set; }
    /// <summary>Tin nhắn mới nhất (để hiển thị preview).</summary>
    public MessageDto? LastMessage { get; set; }
    /// <summary>Số tin chưa đọc (sau last_read_at của member).</summary>
    public int UnreadCount { get; set; }
    /// <summary>Tổng tin nhắn (không xóa) trong phòng — dùng thống kê / dashboard.</summary>
    public int MessageCount { get; set; }
    /// <summary>Số thành viên phòng đang online (heartbeat gần đây).</summary>
    public int OnlineMemberCount { get; set; }
    /// <summary>Vai trò của user hiện tại trong phòng (member/admin); null nếu không phải thành viên.</summary>
    public string? MyRole { get; set; }
}

public class ChatRoomPeerDto
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    /// <summary>Peer có heartbeat online gần đây (cùng quy tắc với danh sách bạn bè).</summary>
    public bool IsOnline { get; set; }
}
