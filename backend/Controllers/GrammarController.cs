using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/grammar")]
[Authorize(Policy = AuthPolicies.Member)]
public class GrammarController : ControllerBase
{
    private readonly ILearningService _learning;

    public GrammarController(ILearningService learning)
    {
        _learning = learning;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<GrammarItemDto>>> Search(
        [FromQuery] int? levelId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _learning.SearchGrammarAsync(levelId, search, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GrammarItemDto>> GetById(int id)
    {
        var dto = await _learning.GetGrammarByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }
}
