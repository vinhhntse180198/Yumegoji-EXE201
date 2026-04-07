using System;

namespace backend.DTOs.Moderation;

public class WarningDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ModeratorId { get; set; }
    public int? ReportId { get; set; }
    public string Reason { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
