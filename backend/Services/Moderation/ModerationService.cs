using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Authorization;
using backend.Data;
using backend.DTOs.Moderation;
using backend.Models.Level;
using backend.Models.Moderation;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Moderation;

public class ModerationService : IModerationService
{
    private readonly ApplicationDbContext _db;

    public ModerationService(ApplicationDbContext db)
    {
        _db = db;
    }

    private static ReportStaffDto MapReportToStaffDto(Report r, IReadOnlyDictionary<int, string> usernames) => new()
    {
        Id = r.Id,
        ReporterId = r.ReporterId,
        ReporterUsername = usernames.GetValueOrDefault(r.ReporterId),
        ReportedUserId = r.ReportedUserId,
        ReportedUsername = r.ReportedUserId.HasValue ? usernames.GetValueOrDefault(r.ReportedUserId.Value) : null,
        MessageId = r.MessageId,
        RoomId = r.RoomId,
        Type = r.Type,
        Severity = r.Severity,
        Description = r.Description,
        Status = r.Status,
        AssignedModeratorId = r.AssignedModeratorId,
        ResolvedAt = r.ResolvedAt,
        ResolutionNote = r.ResolutionNote,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };

    public async Task<CreateReportResponse> CreateReportAsync(int reporterId, CreateReportRequest request)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            ReporterId = reporterId,
            ReportedUserId = request.ReportedUserId,
            MessageId = request.MessageId,
            RoomId = request.RoomId,
            Type = request.Type,
            Severity = request.Severity,
            Description = request.Description,
            Status = "pending",
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        return new CreateReportResponse { ReportId = report.Id, Status = report.Status };
    }

    public async Task<IEnumerable<WarningDto>> GetMyWarningsAsync(int userId)
    {
        var list = await _db.Warnings
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        return list.Select(w => new WarningDto
        {
            Id = w.Id,
            UserId = w.UserId,
            ModeratorId = w.ModeratorId,
            ReportId = w.ReportId,
            Reason = w.Reason,
            CreatedAt = w.CreatedAt
        });
    }

    public async Task<IReadOnlyList<ReportStaffDto>> GetReportsForStaffAsync(string? type, int? severity, string? status, int limit)
    {
        limit = Math.Clamp(limit, 1, 200);
        var q = _db.Reports.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(r => r.Type == type);
        if (severity.HasValue)
            q = q.Where(r => r.Severity == severity);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(r => r.Status == status);

        var list = await q.OrderByDescending(r => r.CreatedAt).Take(limit).ToListAsync();
        var userIds = list
            .SelectMany(r => new[] { r.ReporterId }.Concat(r.ReportedUserId.HasValue ? new[] { r.ReportedUserId!.Value } : Array.Empty<int>()))
            .Distinct()
            .ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id) && u.DeletedAt == null)
            .ToDictionaryAsync(u => u.Id, u => u.Username);

        return list.Select(r => MapReportToStaffDto(r, users)).ToList();
    }

    public async Task<bool> ResolveReportForStaffAsync(int reportId, int moderatorId, ResolveReportStaffRequest request)
    {
        var r = await _db.Reports.FirstOrDefaultAsync(x => x.Id == reportId);
        if (r == null) return false;

        var st = (request.Status ?? "resolved").Trim().ToLowerInvariant();
        if (st is not ("resolved" or "dismissed" or "pending_admin_lock" or "lock_approved" or "lock_rejected"))
            st = "resolved";

        var now = DateTime.UtcNow;
        r.Status = st;
        r.ResolutionNote = request.ResolutionNote;
        r.ResolvedAt = now;
        r.AssignedModeratorId = moderatorId;
        r.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EscalateReportToAdminLockAsync(int reportId, int moderatorId, string? note)
    {
        var r = await _db.Reports.FirstOrDefaultAsync(x => x.Id == reportId);
        if (r == null) return false;
        var now = DateTime.UtcNow;
        r.Status = "pending_admin_lock";
        r.AssignedModeratorId = moderatorId;
        r.ResolutionNote = string.IsNullOrWhiteSpace(note) ? "Moderator đề xuất khóa tài khoản." : note.Trim();
        r.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<ReportStaffDto>> GetAdminLockRequestsAsync(string status, int limit)
    {
        limit = Math.Clamp(limit, 1, 200);
        status = string.IsNullOrWhiteSpace(status) ? "pending_admin_lock" : status.Trim().ToLowerInvariant();
        var q = _db.Reports.AsNoTracking()
            .Where(r => r.ReportedUserId != null);
        if (status != "all")
            q = q.Where(r => r.Status == status);
        else
            q = q.Where(r => r.Status == "pending_admin_lock" || r.Status == "lock_approved" || r.Status == "lock_rejected");

        var list = await q.OrderByDescending(r => r.CreatedAt).Take(limit).ToListAsync();
        var userIds = list
            .SelectMany(r => new[] { r.ReporterId }.Concat(r.ReportedUserId.HasValue ? new[] { r.ReportedUserId!.Value } : Array.Empty<int>()))
            .Distinct()
            .ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id) && u.DeletedAt == null)
            .ToDictionaryAsync(u => u.Id, u => u.Username);

        return list.Select(r => MapReportToStaffDto(r, users)).ToList();
    }

    public async Task<bool> ResolveAdminLockRequestAsync(int reportId, int adminId, bool approve, string? note)
    {
        var r = await _db.Reports.FirstOrDefaultAsync(x => x.Id == reportId);
        if (r == null) return false;
        var now = DateTime.UtcNow;

        if (approve && r.ReportedUserId.HasValue)
        {
            var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == r.ReportedUserId.Value && x.DeletedAt == null);
            if (u != null)
            {
                u.IsLocked = true;
                u.LockedAt = now;
                u.LockedReason = string.IsNullOrWhiteSpace(note) ? "Khóa bởi admin theo đề xuất moderator." : note.Trim();
                u.UpdatedAt = now;
            }
        }

        r.Status = approve ? "lock_approved" : "lock_rejected";
        r.AssignedModeratorId = adminId;
        r.ResolvedAt = now;
        r.ResolutionNote = string.IsNullOrWhiteSpace(note)
            ? (approve ? "Admin đã duyệt khóa tài khoản." : "Admin từ chối đề xuất khóa.")
            : note.Trim();
        r.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> IssueWarningForStaffAsync(int moderatorId, IssueWarningStaffRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ArgumentException("Lý do cảnh cáo không được để trống.");

        var now = DateTime.UtcNow;
        var w = new Warning
        {
            UserId = request.UserId,
            ModeratorId = moderatorId,
            ReportId = request.ReportId,
            Reason = request.Reason.Trim(),
            CreatedAt = now
        };
        _db.Warnings.Add(w);
        await _db.SaveChangesAsync();
        return w.Id;
    }

    public async Task<IReadOnlyList<WarningDto>> GetWarningsForUserAsync(int userId, int limit)
    {
        limit = Math.Clamp(limit, 1, 100);
        var list = await _db.Warnings.AsNoTracking()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return list.Select(w => new WarningDto
        {
            Id = w.Id,
            UserId = w.UserId,
            ModeratorId = w.ModeratorId,
            ReportId = w.ReportId,
            Reason = w.Reason,
            CreatedAt = w.CreatedAt
        }).ToList();
    }

    public async Task<ModerationOverviewDto> GetStaffOverviewAsync(int trendDays)
    {
        trendDays = Math.Clamp(trendDays, 1, 90);
        var todayUtc = DateTime.UtcNow.Date;
        var from = todayUtc.AddDays(-(trendDays - 1));

        var pending = await _db.Reports.CountAsync(r => r.Status == "pending");
        var resolvedToday = await _db.Reports.CountAsync(r =>
            r.Status == "resolved" && r.ResolvedAt.HasValue && r.ResolvedAt.Value.Date == todayUtc);
        var dismissedToday = await _db.Reports.CountAsync(r =>
            r.Status == "dismissed" && r.ResolvedAt.HasValue && r.ResolvedAt.Value.Date == todayUtc);
        var yesterday = todayUtc.AddDays(-1);
        var newSinceYesterday = await _db.Reports.CountAsync(r => r.CreatedAt >= yesterday && r.Status == "pending");

        var registeredLearners = await _db.Users.CountAsync(u => u.DeletedAt == null && u.Role == AppRoles.User);

        var createdInRange = await _db.Reports.AsNoTracking()
            .Where(r => r.CreatedAt >= from)
            .Select(r => r.CreatedAt.Date)
            .ToListAsync();
        var resolvedInRange = await _db.Reports.AsNoTracking()
            .Where(r => r.ResolvedAt.HasValue && r.ResolvedAt!.Value >= from && (r.Status == "resolved" || r.Status == "dismissed"))
            .Select(r => r.ResolvedAt!.Value.Date)
            .ToListAsync();

        var trend = new List<ModerationDailyBucketDto>();
        for (var d = from; d <= todayUtc; d = d.AddDays(1))
        {
            trend.Add(new ModerationDailyBucketDto
            {
                Date = d.ToString("yyyy-MM-dd"),
                ReportsCreated = createdInRange.Count(x => x == d),
                ReportsResolved = resolvedInRange.Count(x => x == d)
            });
        }

        var monthlyTrend = await BuildLastThreeCalendarMonthsTrendAsync(todayUtc);

        return new ModerationOverviewDto
        {
            PendingCount = pending,
            ResolvedTodayCount = resolvedToday,
            DismissedTodayCount = dismissedToday,
            NewSinceYesterdayCount = newSinceYesterday,
            RegisteredLearnersCount = registeredLearners,
            Trend = trend,
            MonthlyTrend = monthlyTrend
        };
    }

    private async Task<List<ModerationMonthlyBucketDto>> BuildLastThreeCalendarMonthsTrendAsync(DateTime todayUtc)
    {
        var firstOfThisMonth = new DateTime(todayUtc.Year, todayUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startMonth = firstOfThisMonth.AddMonths(-2);
        var buckets = new ModerationMonthlyBucketDto[3];

        async Task FillMonthAsync(int i)
        {
            var monthStart = startMonth.AddMonths(i);
            var monthEnd = monthStart.AddMonths(1);
            var reportsCreated = await _db.Reports.AsNoTracking()
                .CountAsync(r => r.CreatedAt >= monthStart && r.CreatedAt < monthEnd);
            var reportsResolved = await _db.Reports.AsNoTracking()
                .CountAsync(r =>
                    r.ResolvedAt.HasValue &&
                    r.ResolvedAt.Value >= monthStart &&
                    r.ResolvedAt.Value < monthEnd &&
                    (r.Status == "resolved" || r.Status == "dismissed"));
            buckets[i] = new ModerationMonthlyBucketDto
            {
                MonthKey = monthStart.ToString("yyyy-MM"),
                MonthLabel = $"Tháng {monthStart.Month}",
                ReportsCreated = reportsCreated,
                ReportsResolved = reportsResolved
            };
        }

        await Task.WhenAll(FillMonthAsync(0), FillMonthAsync(1), FillMonthAsync(2));
        return buckets.ToList();
    }

    public async Task<IReadOnlyList<StaffLearnerRowDto>> GetLearnersForStaffAsync(int limit)
    {
        limit = Math.Clamp(limit, 1, 500);
        var users = await _db.Users.AsNoTracking()
            .Where(u => u.DeletedAt == null && u.Role == AppRoles.User)
            .OrderByDescending(u => u.CreatedAt)
            .Take(limit)
            .ToListAsync();

        if (users.Count == 0)
            return Array.Empty<StaffLearnerRowDto>();

        var userIds = users.Select(u => u.Id).ToList();
        var profiles = await _db.UserProfiles.AsNoTracking()
            .Where(p => userIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId);

        var levelIds = users.Where(u => u.LevelId.HasValue).Select(u => u.LevelId!.Value).Distinct().ToList();
        var levels = levelIds.Count == 0
            ? new Dictionary<int, Level>()
            : await _db.Levels.AsNoTracking()
                .Where(l => levelIds.Contains(l.Id))
                .ToDictionaryAsync(l => l.Id);

        return users.Select(u =>
        {
            profiles.TryGetValue(u.Id, out var p);
            Level? lvRow = null;
            if (u.LevelId.HasValue && levels.TryGetValue(u.LevelId.Value, out var found))
                lvRow = found;

            return new StaffLearnerRowDto
            {
                UserId = u.Id,
                Username = u.Username,
                Email = u.Email,
                LevelId = u.LevelId,
                LevelCode = lvRow?.Code,
                LevelName = lvRow?.Name,
                DisplayName = p?.DisplayName,
                CreatedAt = u.CreatedAt
            };
        }).ToList();
    }

    public async Task<bool> SetLearnerLevelForStaffAsync(int learnerUserId, int? levelId)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == learnerUserId && x.DeletedAt == null);
        if (u == null || !string.Equals(u.Role, AppRoles.User, StringComparison.OrdinalIgnoreCase))
            return false;

        if (levelId.HasValue)
        {
            var exists = await _db.Levels.AnyAsync(l => l.Id == levelId.Value);
            if (!exists)
                throw new ArgumentException("level_id không tồn tại trong bảng levels.");
        }

        u.LevelId = levelId;
        u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }
}
