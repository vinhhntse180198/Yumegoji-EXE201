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

/// <summary>Mô-đun kiểm tra đầu vào: bài test 40 câu phân trình độ N5/N4/N3.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.Member)]
public class PlacementTestController : ControllerBase
{
    private readonly IAssessmentService _assessment;

    public PlacementTestController(IAssessmentService assessment)
    {
        _assessment = assessment;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }

    /// <summary>Lấy đề test 40 câu và thời gian làm (20 phút).</summary>
    [HttpGet]
    public async Task<ActionResult<PlacementTestDefinitionDto>> GetTest()
    {
        if (User.IsModeratorOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản điều hành không làm bài test đầu vào." });
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var dto = await _assessment.GetPlacementTestAsync();
        return Ok(dto);
    }

    /// <summary>Nộp bài test, trả về số câu đúng và level N5/N4/N3.</summary>
    [HttpPost("submit")]
    public async Task<ActionResult<PlacementTestResultDto>> Submit([FromBody] PlacementTestSubmitRequest request)
    {
        if (User.IsModeratorOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản điều hành không làm bài test đầu vào." });
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        if (request == null) return BadRequest(new { message = "Request không hợp lệ." });

        try
        {
            var result = await _assessment.SubmitPlacementTestAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

