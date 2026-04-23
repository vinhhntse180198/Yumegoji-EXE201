namespace backend.DTOs.Moderation;

/// <summary>Bucket theo tháng dương lịch (UTC) cho biểu đồ &quot;3 tháng&quot;.</summary>
public class ModerationMonthlyBucketDto
{
    public string MonthKey { get; set; } = null!;
    public string MonthLabel { get; set; } = null!;
    public int ReportsCreated { get; set; }
    public int ReportsResolved { get; set; }
}
