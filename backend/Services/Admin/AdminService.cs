using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using backend.DTOs.Admin;
using backend.Models.Moderation;
using AppUser = backend.Models.User.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace backend.Services.Admin;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _db;

    public AdminService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<AdminOverviewDto> GetOverviewAsync()
    {
        var now = DateTime.UtcNow;
        var dayStart = now.Date;
        var d7 = dayStart.AddDays(-7);
        var d30 = dayStart.AddDays(-30);
        var d30SignupChart = dayStart.AddDays(-29);

        var baseQ = _db.Users.AsNoTracking().Where(u => u.DeletedAt == null);
        var academyQ = baseQ.Where(u => u.Role == "user");

        var total = await baseQ.CountAsync();
        var academyUsers = await academyQ.CountAsync();
        var active = await academyQ.CountAsync(u => !u.IsLocked);
        var locked = await academyQ.CountAsync(u => u.IsLocked);
        var premium = await academyQ.CountAsync(u => u.IsPremium);
        var freeUsers = Math.Max(0, academyUsers - premium);
        var new7 = await academyQ.CountAsync(u => u.CreatedAt >= d7);
        var new30 = await academyQ.CountAsync(u => u.CreatedAt >= d30);
        var conversion = academyUsers == 0 ? 0 : Math.Round(100.0 * premium / academyUsers, 2);

        var retention = await ComputeRetentionRatePercentAsync(academyQ, d30);
        var byLevel = await BuildUsersByLevelAsync(academyQ);

        var msg24 = await _db.Messages.AsNoTracking()
            .CountAsync(m => !m.IsDeleted && m.CreatedAt >= now.AddHours(-24));

        var perDay = await BuildNewUsersPerDayAsync(academyQ, d30SignupChart, dayStart);

        var (revenueToday, revenueCumulative) = await GetRevenueMetricsAsync(dayStart);
        var revenueLast8 = await GetRevenueLast8MonthsAsync(now);
        var learning = await GetLearningActivityAsync(now);
        var byPackage = new List<PackageSliceDto>
        {
            new() { Name = "Miễn phí", Count = freeUsers, Color = "#94a3b8" },
            new() { Name = "Premium", Count = premium, Color = "#7c3aed" }
        };

        return new AdminOverviewDto
        {
            AcademyUsers = academyUsers,
            FreeUsers = freeUsers,
            TotalUsers = total,
            ActiveUsers = active,
            LockedUsers = locked,
            PremiumUsers = premium,
            RevenueTodayVnd = revenueToday,
            RevenueCumulativeVnd = revenueCumulative,
            PremiumConversionRatePercent = conversion,
            NewUsersLast7Days = new7,
            NewUsersLast30Days = new30,
            RetentionRatePercent = retention,
            UsersByLevel = byLevel,
            MessagesLast24Hours = msg24,
            NewUsersPerDay = perDay,
            RevenueLast8Months = revenueLast8,
            LearningActivity = learning,
            UsersByPackage = byPackage
        };
    }

    private static string LevelLabel(int? lid) => lid switch
    {
        1 => "N5",
        2 => "N4",
        3 => "N3",
        4 => "N2",
        5 => "N1",
        _ => "Chưa gán"
    };

    private static async Task<double> ComputeRetentionRatePercentAsync(
        IQueryable<AppUser> academyQ,
        DateTime d30)
    {
        var cohort = await academyQ
            .Where(u => u.CreatedAt < d30)
            .Select(u => new { u.Id, u.LastLoginAt })
            .ToListAsync();
        var cohortSize = cohort.Count;
        if (cohortSize == 0) return 0;
        var retained = cohort.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt.Value >= d30);
        return Math.Round(100.0 * retained / cohortSize, 1);
    }

    private static async Task<List<LevelCountDto>> BuildUsersByLevelAsync(IQueryable<AppUser> academyQ)
    {
        var levelGroups = await academyQ
            .GroupBy(u => u.LevelId)
            .Select(g => new { LevelId = g.Key, Cnt = g.Count() })
            .ToListAsync();

        return levelGroups
            .OrderBy(x => x.LevelId ?? 99)
            .Select(x => new LevelCountDto
            {
                LevelId = x.LevelId,
                Label = LevelLabel(x.LevelId),
                Count = x.Cnt
            })
            .ToList();
    }

    private static async Task<List<DailyCountDto>> BuildNewUsersPerDayAsync(
        IQueryable<AppUser> academyQ,
        DateTime d30SignupChart,
        DateTime dayStart)
    {
        var signupDays = await academyQ
            .Where(u => u.CreatedAt >= d30SignupChart)
            .Select(u => u.CreatedAt.Date)
            .ToListAsync();

        var perDay = new List<DailyCountDto>();
        for (var d = d30SignupChart; d <= dayStart; d = d.AddDays(1))
        {
            var c = signupDays.Count(x => x == d);
            perDay.Add(new DailyCountDto { Date = d.ToString("yyyy-MM-dd"), Count = c });
        }

        return perDay;
    }

    private async Task<List<MonthlyRevenueDto>> GetRevenueLast8MonthsAsync(DateTime nowUtc)
    {
        var monthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var firstMonth = monthStart.AddMonths(-7);
        var rangeEndExclusive = monthStart.AddMonths(1);

        var buckets = new List<MonthlyRevenueDto>();
        for (var i = 0; i < 8; i++)
        {
            var m = firstMonth.AddMonths(i);
            buckets.Add(new MonthlyRevenueDto
            {
                MonthKey = m.ToString("yyyy-MM"),
                MonthLabel = $"T{m.Month}/{m.Year % 100:D2}",
                AmountVnd = 0
            });
        }

        var byKey = buckets.ToDictionary(b => b.MonthKey, b => b, StringComparer.Ordinal);

        try
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText =
                """
                SELECT YEAR(approved_at) AS y, MONTH(approved_at) AS mo, ISNULL(SUM(amount_vnd), 0) AS total
                FROM dbo.premium_payment_requests
                WHERE status = N'approved'
                  AND approved_at IS NOT NULL
                  AND approved_at >= @start
                  AND approved_at < @endEx
                GROUP BY YEAR(approved_at), MONTH(approved_at)
                """;
            var p1 = cmd.CreateParameter();
            p1.ParameterName = "@start";
            p1.Value = firstMonth;
            p1.DbType = DbType.DateTime2;
            cmd.Parameters.Add(p1);
            var p2 = cmd.CreateParameter();
            p2.ParameterName = "@endEx";
            p2.Value = rangeEndExclusive;
            p2.DbType = DbType.DateTime2;
            cmd.Parameters.Add(p2);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var y = reader.GetInt32(0);
                var mo = reader.GetInt32(1);
                var total = reader.IsDBNull(2) ? 0m : Convert.ToDecimal(reader.GetValue(2));
                var key = $"{y}-{mo:D2}";
                if (byKey.TryGetValue(key, out var row))
                    row.AmountVnd = total;
            }
        }
        catch (SqlException)
        {
            /* bảng payment chưa có */
        }

        return buckets;
    }

    private async Task<LearningActivityStatsDto> GetLearningActivityAsync(DateTime nowUtc)
    {
        var from30 = nowUtc.AddDays(-30);
        var dto = new LearningActivityStatsDto();
        try
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText =
                    "SELECT COUNT(1) FROM dbo.game_sessions WHERE started_at >= @from";
                var p = cmd.CreateParameter();
                p.ParameterName = "@from";
                p.Value = from30;
                p.DbType = DbType.DateTime2;
                cmd.Parameters.Add(p);
                var o = await cmd.ExecuteScalarAsync();
                dto.GameSessionsStartedLast30Days = o is int i ? i : Convert.ToInt32(o ?? 0);
            }

            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText =
                    """
                    SELECT COUNT(1) FROM dbo.game_sessions
                    WHERE ended_at IS NOT NULL AND ended_at >= @from
                    """;
                var p = cmd.CreateParameter();
                p.ParameterName = "@from";
                p.Value = from30;
                p.DbType = DbType.DateTime2;
                cmd.Parameters.Add(p);
                var o = await cmd.ExecuteScalarAsync();
                dto.GameSessionsEndedLast30Days = o is int i ? i : Convert.ToInt32(o ?? 0);
            }

            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText =
                    """
                    SELECT COUNT(1) FROM dbo.user_lesson_progress
                    WHERE completed_at IS NOT NULL AND completed_at >= @from
                    """;
                var p = cmd.CreateParameter();
                p.ParameterName = "@from";
                p.Value = from30;
                p.DbType = DbType.DateTime2;
                cmd.Parameters.Add(p);
                var o = await cmd.ExecuteScalarAsync();
                dto.CompletedLessonsLast30Days = o is int i ? i : Convert.ToInt32(o ?? 0);
            }
        }
        catch (SqlException)
        {
            /* bảng chưa migrate */
        }

        return dto;
    }

    private async Task<(decimal RevenueToday, decimal RevenueCumulative)> GetRevenueMetricsAsync(DateTime dayStartUtc)
    {
        try
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText =
                """
                SELECT
                    ISNULL(SUM(CASE WHEN approved_at >= @dayStart THEN amount_vnd ELSE 0 END), 0) AS revenue_today,
                    ISNULL(SUM(amount_vnd), 0) AS revenue_total
                FROM dbo.premium_payment_requests
                WHERE status = N'approved'
                """;
            var p = cmd.CreateParameter();
            p.ParameterName = "@dayStart";
            p.Value = dayStartUtc;
            p.DbType = System.Data.DbType.DateTime2;
            cmd.Parameters.Add(p);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var today = reader.IsDBNull(0) ? 0m : Convert.ToDecimal(reader.GetValue(0));
                var total = reader.IsDBNull(1) ? 0m : Convert.ToDecimal(reader.GetValue(1));
                return (today, total);
            }
        }
        catch (SqlException)
        {
            // Bảng payment chưa tạo patch thì fallback 0.
        }
        catch (InvalidOperationException)
        {
            // Lỗi kết nối tạm thời: fallback 0 để dashboard vẫn chạy.
        }

        return (0m, 0m);
    }

    public async Task<IReadOnlyList<SensitiveKeywordAdminDto>> ListSensitiveKeywordsAsync()
    {
        var list = await _db.SensitiveKeywords.AsNoTracking()
            .OrderBy(k => k.Keyword)
            .ToListAsync();
        return list.Select(MapKw).ToList();
    }

    public async Task<int> CreateSensitiveKeywordAsync(int adminUserId, CreateSensitiveKeywordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Keyword))
            throw new ArgumentException("Từ khóa không được để trống.");

        var kw = request.Keyword.Trim();
        var exists = await _db.SensitiveKeywords.AnyAsync(k => k.Keyword.ToLower() == kw.ToLower());
        if (exists)
            throw new InvalidOperationException("Từ khóa đã tồn tại.");

        var now = DateTime.UtcNow;
        var row = new SensitiveKeyword
        {
            Keyword = kw,
            Severity = Math.Clamp(request.Severity, 1, 3),
            IsActive = true,
            CreatedBy = adminUserId,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.SensitiveKeywords.Add(row);
        await _db.SaveChangesAsync();
        return row.Id;
    }

    public async Task<bool> UpdateSensitiveKeywordAsync(int id, UpdateSensitiveKeywordRequest request)
    {
        var row = await _db.SensitiveKeywords.FirstOrDefaultAsync(k => k.Id == id);
        if (row == null) return false;

        if (!string.IsNullOrWhiteSpace(request.Keyword))
            row.Keyword = request.Keyword.Trim();
        if (request.Severity.HasValue)
            row.Severity = Math.Clamp(request.Severity.Value, 1, 3);
        if (request.IsActive.HasValue)
            row.IsActive = request.IsActive.Value;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteSensitiveKeywordAsync(int id)
    {
        var row = await _db.SensitiveKeywords.FirstOrDefaultAsync(k => k.Id == id);
        if (row == null) return false;
        _db.SensitiveKeywords.Remove(row);
        await _db.SaveChangesAsync();
        return true;
    }

    private static SensitiveKeywordAdminDto MapKw(SensitiveKeyword k) => new()
    {
        Id = k.Id,
        Keyword = k.Keyword,
        Severity = k.Severity,
        IsActive = k.IsActive,
        CreatedBy = k.CreatedBy,
        CreatedAt = k.CreatedAt,
        UpdatedAt = k.UpdatedAt
    };
}
