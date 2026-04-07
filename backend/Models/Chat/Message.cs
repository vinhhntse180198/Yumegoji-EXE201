using System;

namespace backend.Models.Chat;

public class Message
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    /// <summary>ID người gửi — tên cột SQL: <c>user_id</c> (script chuẩn) hoặc <c>sender_id</c> (DB đã đổi tên); xem <c>YUMEGOJI_MESSAGES_AUTHOR_COLUMN</c>.</summary>
    public int UserId { get; set; }
    public string? Content { get; set; }
    public string Type { get; set; } = "text";
    public int? ReplyToId { get; set; }
    public bool IsPinned { get; set; }
    public int? PinnedBy { get; set; }
    public DateTime? PinnedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ChatRoom? Room { get; set; }
    public Message? ReplyTo { get; set; }
}
