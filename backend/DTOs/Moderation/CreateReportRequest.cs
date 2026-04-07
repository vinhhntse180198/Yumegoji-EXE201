namespace backend.DTOs.Moderation;

public class CreateReportRequest
{
    /// <summary>spam, profanity, harassment, inappropriate, other</summary>
    public string Type { get; set; } = null!;
    public int? ReportedUserId { get; set; }
    public int? MessageId { get; set; }
    public int? RoomId { get; set; }
    public int? Severity { get; set; }
    public string? Description { get; set; }
}
