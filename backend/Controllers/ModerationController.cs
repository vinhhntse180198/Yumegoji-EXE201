using System;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Moderation;
using backend.Services.Moderation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>API Mô-đun 7: Kiểm duyệt – Báo cáo, cảnh cáo (theo bảng reports, warnings).</summary>
[ApiController]
[Route("api/[controller]")]
public class ModerationController : ControllerBase
{
    private readonly IModerationService _moderationService;

    public ModerationController(IModerationService moderationService)
    {
        _moderationService = moderationService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }

    /// <summary>Báo cáo người dùng hoặc tin nhắn (bảng reports).</summary>
    [Authorize(Policy = AuthPolicies.Member)]
    [HttpPost("reports")]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var result = await _moderationService.CreateReportAsync(userId, body);
        return Ok(result);
    }

    /// <summary>Lịch sử cảnh cáo của bản thân (bảng warnings).</summary>
    [Authorize(Policy = AuthPolicies.Member)]
    [HttpGet("warnings/me")]
    public async Task<IActionResult> GetMyWarnings()
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _moderationService.GetMyWarningsAsync(userId);
        return Ok(items);
    }

    // --- Staff (moderator / admin) ---

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpGet("staff/overview")]
    public async Task<IActionResult> GetStaffOverview([FromQuery] int trendDays = 7)
    {
        var dto = await _moderationService.GetStaffOverviewAsync(trendDays);
        return Ok(dto);
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpGet("staff/reports")]
    public async Task<IActionResult> ListReportsForStaff(
        [FromQuery] string? type,
        [FromQuery] int? severity,
        [FromQuery] string? status,
        [FromQuery] int limit = 80)
    {
        var items = await _moderationService.GetReportsForStaffAsync(type, severity, status, limit);
        return Ok(items);
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpPatch("staff/reports/{id:int}/resolve")]
    public async Task<IActionResult> ResolveReportForStaff(int id, [FromBody] ResolveReportStaffRequest body)
    {
        var modId = GetCurrentUserId();
        if (modId == 0) return Unauthorized();
        var ok = await _moderationService.ResolveReportForStaffAsync(id, modId, body);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpPost("staff/reports/{id:int}/escalate-lock")]
    public async Task<IActionResult> EscalateLockRequestForAdmin(int id, [FromBody] ResolveReportStaffRequest body)
    {
        var modId = GetCurrentUserId();
        if (modId == 0) return Unauthorized();
        var ok = await _moderationService.EscalateReportToAdminLockAsync(id, modId, body.ResolutionNote);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpPost("staff/warnings")]
    public async Task<IActionResult> IssueWarningForStaff([FromBody] IssueWarningStaffRequest body)
    {
        var modId = GetCurrentUserId();
        if (modId == 0) return Unauthorized();
        try
        {
            var warningId = await _moderationService.IssueWarningForStaffAsync(modId, body);
            return Ok(new { warningId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpGet("staff/users/{userId:int}/warnings")]
    public async Task<IActionResult> ListWarningsForUser(int userId, [FromQuery] int limit = 50)
    {
        var items = await _moderationService.GetWarningsForUserAsync(userId, limit);
        return Ok(items);
    }

    /// <summary>Học viên (role = user): hiển thị tab Quản lý học viên.</summary>
    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpGet("staff/learners")]
    public async Task<IActionResult> ListLearnersForStaff([FromQuery] int limit = 200)
    {
        var lim = Math.Clamp(limit, 1, 500);
        var items = await _moderationService.GetLearnersForStaffAsync(lim);
        return Ok(items);
    }

    [Authorize(Policy = AuthPolicies.Staff)]
    [HttpPatch("staff/learners/{userId:int}/level")]
    public async Task<IActionResult> SetLearnerLevelForStaff(int userId, [FromBody] SetLearnerLevelStaffRequest? body)
    {
        if (body == null)
            return BadRequest(new { message = "Thiếu body JSON { levelId }." });
        try
        {
            var ok = await _moderationService.SetLearnerLevelForStaffAsync(userId, body.LevelId);
            return ok ? Ok(new { ok = true }) : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = AuthPolicies.AdminOnly)]
    [HttpGet("admin/lock-requests")]
    public async Task<IActionResult> ListAdminLockRequests([FromQuery] string status = "pending_admin_lock", [FromQuery] int limit = 100)
    {
        var items = await _moderationService.GetAdminLockRequestsAsync(status, limit);
        return Ok(items);
    }

    [Authorize(Policy = AuthPolicies.AdminOnly)]
    [HttpPost("admin/lock-requests/{id:int}/approve")]
    public async Task<IActionResult> ApproveAdminLockRequest(int id, [FromBody] AdminLockDecisionRequest body)
    {
        var adminId = GetCurrentUserId();
        if (adminId == 0) return Unauthorized();
        var ok = await _moderationService.ResolveAdminLockRequestAsync(id, adminId, true, body.Note);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [Authorize(Policy = AuthPolicies.AdminOnly)]
    [HttpPost("admin/lock-requests/{id:int}/reject")]
    public async Task<IActionResult> RejectAdminLockRequest(int id, [FromBody] AdminLockDecisionRequest body)
    {
        var adminId = GetCurrentUserId();
        if (adminId == 0) return Unauthorized();
        var ok = await _moderationService.ResolveAdminLockRequestAsync(id, adminId, false, body.Note);
        return ok ? Ok(new { ok = true }) : NotFound();
    }
}
