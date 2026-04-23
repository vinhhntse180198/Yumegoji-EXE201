using System;

namespace backend.Models.Admin;

/// <summary>Bản ghi thông báo toàn hệ thống (bảng system_announcements).</summary>
public class SystemAnnouncement
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string? Type { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
