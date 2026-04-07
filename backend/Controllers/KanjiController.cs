using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/kanji")]
public class KanjiController : ControllerBase
{
    private readonly ILearningService _learning;

    public KanjiController(ILearningService learning)
    {
        _learning = learning;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<KanjiItemDto>>> Search(
        [FromQuery] string? jlptLevel,
        [FromQuery] string? search,
        [FromQuery] int? strokeCount,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _learning.SearchKanjiAsync(jlptLevel, search, strokeCount, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<KanjiItemDto>> GetById(int id)
    {
        var dto = await _learning.GetKanjiByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }
}
