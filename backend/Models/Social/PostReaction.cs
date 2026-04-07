using System;

namespace backend.Models.Social;

public class PostReaction
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public int UserId { get; set; }
    public string Emoji { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

