using System;

namespace backend.DTOs.Social;

public class FriendRequestDto
{
    public int Id { get; set; }
    public int FromUserId { get; set; }
    public int ToUserId { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public UserLiteDto? FromUser { get; set; }
    public UserLiteDto? ToUser { get; set; }
}

