using System;

namespace backend.DTOs.Social;

public class FriendDto
{
    public int FriendshipId { get; set; }
    public int UserId { get; set; }
    public int FriendId { get; set; }
    public DateTime CreatedAt { get; set; }
    public UserLiteDto Friend { get; set; } = null!;
    public bool IsOnline { get; set; }
    public string? PresenceStatus { get; set; }
    public DateTime? LastSeenAt { get; set; }
}

public class PostReactionRequest
{
    public string Emoji { get; set; } = null!;
}

