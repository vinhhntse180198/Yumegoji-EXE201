using System;

namespace backend.Models.Social;

public class BlockedUser
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int BlockedUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

