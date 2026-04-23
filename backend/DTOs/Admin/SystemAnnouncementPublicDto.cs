using System;

namespace backend.DTOs.Admin;

public class SystemAnnouncementPublicDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string? Type { get; set; }
    public DateTime? PublishedAt { get; set; }
}
