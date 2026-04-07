using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Moderation;

namespace backend.Services.Moderation;

public interface IModerationService
{
    Task<CreateReportResponse> CreateReportAsync(int reporterId, CreateReportRequest request);
    Task<IEnumerable<WarningDto>> GetMyWarningsAsync(int userId);

    Task<IReadOnlyList<ReportStaffDto>> GetReportsForStaffAsync(string? type, int? severity, string? status, int limit);
    Task<bool> ResolveReportForStaffAsync(int reportId, int moderatorId, ResolveReportStaffRequest request);
    Task<bool> EscalateReportToAdminLockAsync(int reportId, int moderatorId, string? note);
    Task<IReadOnlyList<ReportStaffDto>> GetAdminLockRequestsAsync(string status, int limit);
    Task<bool> ResolveAdminLockRequestAsync(int reportId, int adminId, bool approve, string? note);
    Task<int> IssueWarningForStaffAsync(int moderatorId, IssueWarningStaffRequest request);
    Task<IReadOnlyList<WarningDto>> GetWarningsForUserAsync(int userId, int limit);
    Task<ModerationOverviewDto> GetStaffOverviewAsync(int trendDays);

    Task<IReadOnlyList<StaffLearnerRowDto>> GetLearnersForStaffAsync(int limit);

    Task<bool> SetLearnerLevelForStaffAsync(int learnerUserId, int? levelId);
}
