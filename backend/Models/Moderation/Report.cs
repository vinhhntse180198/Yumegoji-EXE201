using System;

namespace backend.Models.Moderation;

public class Report
{
    public int Id { get; set; }
    public int ReporterId { get; set; }
    public int? ReportedUserId { get; set; }
    public int? MessageId { get; set; }
    public int? RoomId { get; set; }
    public string Type { get; set; } = null!;
    public int? Severity { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "pending";
    public int? AssignedModeratorId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
