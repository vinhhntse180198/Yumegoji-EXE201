using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/vocabulary")]
[Authorize(Policy = AuthPolicies.Member)]
public class VocabularyController : ControllerBase
{
    private readonly ILearningService _learning;

    public VocabularyController(ILearningService learning)
    {
        _learning = learning;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<VocabularyItemDto>>> Search(
        [FromQuery] int? levelId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _learning.SearchVocabularyAsync(levelId, search, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VocabularyItemDto>> GetById(int id)
    {
        var dto = await _learning.GetVocabularyByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }
}
