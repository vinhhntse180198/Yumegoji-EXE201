using System.Collections.Generic;

namespace backend.DTOs.Chat;

public class PagedMessagesResponse
{
    public List<MessageDto> Items { get; set; } = new();
    public string? NextCursor { get; set; }
    public bool HasMore { get; set; }
}
