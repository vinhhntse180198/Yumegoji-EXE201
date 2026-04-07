using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/lessons")]
public class LessonsController : ControllerBase
{
    private readonly ILearningService _learning;

    public LessonsController(ILearningService learning)
    {
        _learning = learning;
    }

    private int GetUserId()
    {
        var s = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(s, out var id) ? id : 0;
    }

    private int? GetOptionalUserId()
    {
        var id = GetUserId();
        return id > 0 ? id : null;
    }

    private async Task<IActionResult?> EnsureLessonPremiumMemberAccessAsync(int lessonId)
    {
        var dto = await _learning.GetLessonDetailByIdAsync(lessonId);
        if (dto == null) return NotFound();
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        if (dto.Lesson.IsPremium && !await _learning.IsUserPremiumAsync(uid))
            return StatusCode(403, new { message = "Nội dung Premium — cần nâng cấp gói.", code = "PREMIUM_REQUIRED" });
        return null;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResultDto<LessonListItemDto>>> GetLessons(
        [FromQuery] int? levelId,
        [FromQuery] int? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isPremium = null)
    {
        return Ok(await _learning.GetLessonsPagedAsync(levelId, categoryId, page, pageSize, isPremium));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> GetById(int id)
    {
        var dto = await _learning.GetLessonDetailByIdAsync(id);
        if (dto == null) return NotFound();
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        if (dto.Lesson.IsPremium && !await _learning.IsUserPremiumAsync(uid))
            return StatusCode(403, new { message = "Nội dung Premium — cần nâng cấp gói.", code = "PREMIUM_REQUIRED" });
        return Ok(dto);
    }

    /// <summary>Bài đã publish. Bài Premium: cần đăng nhập và gói Premium.</summary>
    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var dto = await _learning.GetLessonDetailBySlugAsync(slug);
        if (dto == null) return NotFound();
        if (!dto.Lesson.IsPremium) return Ok(dto);

        var uid = GetOptionalUserId();
        if (uid is null)
            return Unauthorized(new { message = "Đăng nhập để xem bài học Premium.", code = "AUTH_REQUIRED" });
        if (!await _learning.IsUserPremiumAsync(uid.Value))
            return StatusCode(403, new { message = "Nội dung Premium — cần nâng cấp gói.", code = "PREMIUM_REQUIRED" });
        return Ok(dto);
    }

    [HttpGet("{id:int}/vocabulary")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> GetVocabulary(int id)
    {
        var gate = await EnsureLessonPremiumMemberAccessAsync(id);
        if (gate != null) return gate;
        return Ok(await _learning.GetVocabularyByLessonAsync(id));
    }

    [HttpGet("{id:int}/kanji")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> GetKanji(int id)
    {
        var gate = await EnsureLessonPremiumMemberAccessAsync(id);
        if (gate != null) return gate;
        return Ok(await _learning.GetKanjiByLessonAsync(id));
    }

    [HttpGet("{id:int}/grammar")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> GetGrammar(int id)
    {
        var gate = await EnsureLessonPremiumMemberAccessAsync(id);
        if (gate != null) return gate;
        return Ok(await _learning.GetGrammarByLessonAsync(id));
    }

    [HttpPost("{id:int}/progress")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> UpsertProgress(int id, [FromBody] UpsertProgressRequest body)
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        try
        {
            var dto = await _learning.UpsertProgressAsync(uid, id, body);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/bookmark")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> AddBookmark(int id)
    {
        var gate = await EnsureLessonPremiumMemberAccessAsync(id);
        if (gate != null) return gate;
        var uid = GetUserId();
        var ok = await _learning.AddBookmarkAsync(uid, id);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}/bookmark")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> RemoveBookmark(int id)
    {
        var gate = await EnsureLessonPremiumMemberAccessAsync(id);
        if (gate != null) return gate;
        var uid = GetUserId();
        var ok = await _learning.RemoveBookmarkAsync(uid, id);
        return ok ? NoContent() : NotFound();
    }
}
