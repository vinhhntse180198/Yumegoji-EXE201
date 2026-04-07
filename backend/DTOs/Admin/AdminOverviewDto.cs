using System.Collections.Generic;

namespace backend.DTOs.Admin;

public class AdminOverviewDto
{
    public int AcademyUsers { get; set; }
    public int FreeUsers { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int LockedUsers { get; set; }
    public int PremiumUsers { get; set; }
    public decimal RevenueTodayVnd { get; set; }
    public decimal RevenueCumulativeVnd { get; set; }
    /// <summary>Tỷ lệ chuyển đổi Free → Premium, tính theo Premium / AcademyUsers (%).</summary>
    public double PremiumConversionRatePercent { get; set; }
    public int NewUsersLast7Days { get; set; }
    public int NewUsersLast30Days { get; set; }
    /// <summary>Tỷ lệ % user tạo trước 30 ngày có đăng nhập trong 30 ngày qua.</summary>
    public double RetentionRatePercent { get; set; }
    public List<LevelCountDto> UsersByLevel { get; set; } = new();
    public int MessagesLast24Hours { get; set; }
    public List<DailyCountDto> NewUsersPerDay { get; set; } = new();

    /// <summary>Doanh thu theo tháng (8 tháng gần nhất), từ giao dịch Premium đã duyệt.</summary>
    public List<MonthlyRevenueDto> RevenueLast8Months { get; set; } = new();

    /// <summary>Hoạt động học/chơi thật (rolling 30 ngày).</summary>
    public LearningActivityStatsDto LearningActivity { get; set; } = new();

    /// <summary>Phân bổ Free / Premium (học viên role user).</summary>
    public List<PackageSliceDto> UsersByPackage { get; set; } = new();
}

public class MonthlyRevenueDto
{
    public string MonthKey { get; set; } = "";
    public string MonthLabel { get; set; } = "";
    public decimal AmountVnd { get; set; }
}

public class LearningActivityStatsDto
{
    /// <summary>Tổng phiên game đã bắt đầu (30 ngày).</summary>
    public int GameSessionsStartedLast30Days { get; set; }

    /// <summary>Bài học đánh dấu hoàn thành (30 ngày).</summary>
    public int CompletedLessonsLast30Days { get; set; }

    /// <summary>Phiên game đã kết thúc (30 ngày).</summary>
    public int GameSessionsEndedLast30Days { get; set; }
}

public class PackageSliceDto
{
    public string Name { get; set; } = "";
    public int Count { get; set; }
    public string Color { get; set; } = "#94a3b8";
}

public class LevelCountDto
{
    public int? LevelId { get; set; }
    public string Label { get; set; } = null!;
    public int Count { get; set; }
}

public class DailyCountDto
{
    public string Date { get; set; } = null!;
    public int Count { get; set; }
}
