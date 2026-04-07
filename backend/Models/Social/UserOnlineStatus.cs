using System;

namespace backend.Models.Social;

public class UserOnlineStatus
{
    public int UserId { get; set; }
    public DateTime LastSeenAt { get; set; }
    public string Status { get; set; } = "offline";
}
