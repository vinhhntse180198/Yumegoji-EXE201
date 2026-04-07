using System;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using Microsoft.AspNetCore.Http;
using backend.DTOs.Assessment;
using backend.Services.Assessment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.Member)]
public class LevelUpTestController : ControllerBase
{
    private readonly IAssessmentService _assessment;

    public LevelUpTestController(IAssessmentService assessment)
    {
        _assessment = assessment;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }

    /// <summary>Lấy đề thi nâng level (ví dụ từ N5 lên N4).</summary>
    [HttpGet]
    public async Task<ActionResult<LevelUpTestDefinitionDto>> Get([FromQuery] string toLevel)
    {
        if (User.IsModeratorOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản điều hành không làm bài thi nâng level." });
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        if (string.IsNullOrWhiteSpace(toLevel))
            return BadRequest(new { message = "Thiếu tham số toLevel." });

        var dto = await _assessment.GetLevelUpTestAsync(userId, toLevel);
        if (dto == null)
            return NotFound(new { message = "Chưa có bài thi nâng level phù hợp. Moderator cần tạo đề trước." });

        return Ok(dto);
    }

    /// <summary>Nộp bài thi nâng level, nếu đậu sẽ cập nhật LevelId của user.</summary>
    [HttpPost("submit")]
    public async Task<ActionResult<LevelUpTestResultDto>> Submit([FromBody] LevelUpTestSubmitRequest request)
    {
        if (User.IsModeratorOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản điều hành không làm bài thi nâng level." });
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        if (request == null)
            return BadRequest(new { message = "Request không hợp lệ." });

        try
        {
            var result = await _assessment.SubmitLevelUpTestAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

