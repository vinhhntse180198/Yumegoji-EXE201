namespace backend.DTOs.Chat;

public class SendMessageRequest
{
    /// <summary>Nội dung text, JSON cho file/ảnh/sticker, hoặc mention @username trong text.</summary>
    public string? Content { get; set; }
    /// <summary>text, emoji, image, file, sticker, lesson_share, achievement_share, ...</summary>
    public string Type { get; set; } = "text";
    public int? ReplyToId { get; set; }
}
