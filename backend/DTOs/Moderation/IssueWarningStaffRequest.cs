namespace backend.DTOs.Moderation;

public class IssueWarningStaffRequest
{
    public int UserId { get; set; }
    public string Reason { get; set; } = null!;
    public int? ReportId { get; set; }
}
