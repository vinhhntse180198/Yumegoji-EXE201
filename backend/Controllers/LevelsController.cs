using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LevelsController : ControllerBase
{
    private readonly ILearningService _learning;

    public LevelsController(ILearningService learning)
    {
        _learning = learning;
    }

    /// <summary>Danh sách cấp độ (N5, N4, N3, …) — chỉ cần thêm dòng trong bảng levels.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<LevelDto>>> GetLevels()
    {
        return Ok(await _learning.GetLevelsAsync());
    }
}
