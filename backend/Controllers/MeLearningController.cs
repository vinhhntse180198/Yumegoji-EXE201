using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Tiến độ & bookmark của user đăng nhập.</summary>
[ApiController]
[Route("api/users/me")]
[Authorize(Policy = AuthPolicies.Member)]
public class MeLearningController : ControllerBase
{
    private readonly ILearningService _learning;

    public MeLearningController(ILearningService learning)
    {
        _learning = learning;
    }

    private int GetUserId()
    {
        var s = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(s, out var id) ? id : 0;
    }

    [HttpGet("progress")]
    public async Task<ActionResult<PagedResultDto<UserLessonProgressDto>>> GetProgress(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        return Ok(await _learning.GetMyProgressAsync(uid, status, page, pageSize));
    }

    [HttpGet("progress/summary")]
    public async Task<ActionResult<ProgressSummaryDto>> GetProgressSummary()
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        try
        {
            return Ok(await _learning.GetProgressSummaryAsync(uid));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("bookmarks")]
    public async Task<ActionResult<PagedResultDto<BookmarkLessonDto>>> GetBookmarks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        return Ok(await _learning.GetMyBookmarksAsync(uid, page, pageSize));
    }
}
