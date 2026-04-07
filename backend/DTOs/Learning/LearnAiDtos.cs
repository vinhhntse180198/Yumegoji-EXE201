using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace backend.DTOs.Learning;

public class LearnAiMessageItem
{
    [Required]
    public string Role { get; set; } = "user";

    [Required]
    public string Content { get; set; } = "";
}

public class LearnAiChatRequest
{
    [Required]
    [MinLength(1)]
    public List<LearnAiMessageItem> Messages { get; set; } = new();

    /// <summary>Ảnh base64 (không có tiền tố data:), gắn vào tin nhắn user cuối — dùng model vision (vd: llava).</summary>
    public List<string>? ImagesBase64 { get; set; }
}

public class LearnAiChatResponse
{
    public string Message { get; set; } = "";
    public string? Model { get; set; }
}
