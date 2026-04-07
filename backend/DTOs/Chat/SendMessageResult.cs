using System.Collections.Generic;

namespace backend.DTOs.Chat;

public class SendMessageResult
{
    public MessageDto Message { get; set; } = null!;
    /// <summary>Từ khóa nhạy cảm khớp (bảng sensitive_keywords) — cảnh báo, không chặn gửi.</summary>
    public IReadOnlyList<string> SensitiveKeywordMatches { get; set; } = new List<string>();
}
