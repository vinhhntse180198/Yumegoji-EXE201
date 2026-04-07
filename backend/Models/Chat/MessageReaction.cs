using System;

namespace backend.Models.Chat;

public class MessageReaction
{
    public int Id { get; set; }
    public int MessageId { get; set; }
    public int UserId { get; set; }
    public string Emoji { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public Message? Message { get; set; }
}
