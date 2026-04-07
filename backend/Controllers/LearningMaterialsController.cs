using System.Collections.Generic;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/learning-materials")]
[Authorize(Policy = AuthPolicies.Member)]
public class LearningMaterialsController : ControllerBase
{
    private readonly ILearningService _learning;

    public LearningMaterialsController(ILearningService learning)
    {
        _learning = learning;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LearningMaterialDto>>> GetList(
        [FromQuery] int? levelId,
        [FromQuery] int? lessonId,
        [FromQuery] string? type,
        [FromQuery] string? status)
    {
        return Ok(await _learning.GetLearningMaterialsAsync(levelId, lessonId, type, status));
    }

    [HttpPost("{id:int}/download")]
    public async Task<ActionResult<DownloadMaterialResponseDto>> RecordDownload(int id)
    {
        var dto = await _learning.RecordMaterialDownloadAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }
}
