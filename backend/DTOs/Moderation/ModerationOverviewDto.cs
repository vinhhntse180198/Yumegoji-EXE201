using System.Collections.Generic;

namespace backend.DTOs.Moderation;

public class ModerationOverviewDto
{
    public int PendingCount { get; set; }
    public int ResolvedTodayCount { get; set; }
    public int DismissedTodayCount { get; set; }
    public int NewSinceYesterdayCount { get; set; }

    /// <summary>Số tài khoản học viên (role user) còn hoạt động — hiển thị tab Học viên.</summary>
    public int RegisteredLearnersCount { get; set; }

    public List<ModerationDailyBucketDto> Trend { get; set; } = new();

    /// <summary>3 tháng dương lịch gần nhất (tháng hiện tại + 2 tháng trước), luôn có đủ 3 phần tử.</summary>
    public List<ModerationMonthlyBucketDto> MonthlyTrend { get; set; } = new();
}

public class ModerationDailyBucketDto
{
    public string Date { get; set; } = null!;
    public int ReportsCreated { get; set; }
    public int ReportsResolved { get; set; }
}
