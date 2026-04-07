using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/lesson-categories")]
public class LessonCategoriesController : ControllerBase
{
    private readonly ILearningService _learning;

    public LessonCategoriesController(ILearningService learning)
    {
        _learning = learning;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<LessonCategoryDto>>> GetCategories(
        [FromQuery] int? levelId,
        [FromQuery] string? type)
    {
        return Ok(await _learning.GetLessonCategoriesAsync(levelId, type));
    }
}
