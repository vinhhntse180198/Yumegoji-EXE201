namespace backend.DTOs.Moderation;

public class CreateReportResponse
{
    public int ReportId { get; set; }
    public string Status { get; set; } = null!;
}
