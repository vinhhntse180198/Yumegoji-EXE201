namespace backend.DTOs.Admin;

public class PublishSystemAnnouncementRequest
{
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    /// <summary>maintenance | event | promo hoặc tùy chỉnh ngắn.</summary>
    public string? Type { get; set; }
}
