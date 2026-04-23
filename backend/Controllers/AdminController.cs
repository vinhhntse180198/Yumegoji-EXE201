using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Admin;
using backend.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace backend.Controllers;

/// <summary>API Mô-đun 8: Quản trị — tổng quan, từ khóa nhạy cảm.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IAdminService admin, ILogger<AdminController> logger)
    {
        _admin = admin;
        _logger = logger;
    }

    /// <summary>Chỉ chấp nhận id dương; tránh dùng 0 làm “magic” cho không hợp lệ.</summary>
    private bool TryGetAdminUserId(out int adminUserId)
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(sub, out var id) && id > 0)
        {
            adminUserId = id;
            return true;
        }

        adminUserId = 0;
        return false;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var dto = await _admin.GetOverviewAsync();
        return Ok(dto);
    }

    [HttpGet("sensitive-keywords")]
    public async Task<IActionResult> ListKeywords()
    {
        var list = await _admin.ListSensitiveKeywordsAsync();
        return Ok(list);
    }

    [HttpPost("sensitive-keywords")]
    public async Task<IActionResult> CreateKeyword([FromBody] CreateSensitiveKeywordRequest body)
    {
        if (!TryGetAdminUserId(out var adminUserId)) return Unauthorized();
        try
        {
            var newId = await _admin.CreateSensitiveKeywordAsync(adminUserId, body);
            return Ok(new { id = newId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPatch("sensitive-keywords/{id:int}")]
    public async Task<IActionResult> UpdateKeyword(int id, [FromBody] UpdateSensitiveKeywordRequest body)
    {
        var ok = await _admin.UpdateSensitiveKeywordAsync(id, body);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [HttpDelete("sensitive-keywords/{id:int}")]
    public async Task<IActionResult> DeleteKeyword(int id)
    {
        var ok = await _admin.DeleteSensitiveKeywordAsync(id);
        return ok ? NoContent() : NotFound();
    }

    /// <summary>Xuất bản thông báo toàn hệ thống (user đọc qua GET public + poll).</summary>
    [HttpPost("system-announcements/publish")]
    public async Task<IActionResult> PublishSystemAnnouncement([FromBody] PublishSystemAnnouncementRequest body)
    {
        if (!TryGetAdminUserId(out var adminUserId)) return Unauthorized();
        try
        {
            var dto = await _admin.PublishSystemAnnouncementAsync(adminUserId, body);
            return Ok(dto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Ghi nhận yêu cầu backup thủ công vào nhật ký máy chủ (tích hợp SQL Agent / maintenance plan sau).</summary>
    [HttpPost("data-backup-request")]
    public IActionResult RequestDataBackup()
    {
        if (!TryGetAdminUserId(out var adminUserId)) return Unauthorized();
        _logger.LogInformation("Yêu cầu backup dữ liệu thủ công từ admin userId={AdminUserId}", adminUserId);
        return Accepted(new { ok = true, message = "Đã ghi nhận yêu cầu backup vào nhật ký máy chủ." });
    }
}
