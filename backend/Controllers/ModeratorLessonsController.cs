using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Moderator/Admin cập nhật nội dung bài học (Staff).</summary>
[ApiController]
[Route("api/moderator/lessons")]
[Authorize(Policy = AuthPolicies.Staff)]
public class ModeratorLessonsController : ControllerBase
{
    private readonly ILearningService _learning;

    public ModeratorLessonsController(ILearningService learning)
    {
        _learning = learning;
    }

    /// <summary>Lấy toàn bộ nội dung bài (kể cả chưa publish) để soạn thảo.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<LessonFullDetailDto>> GetForStaff(int id)
    {
        var dto = await _learning.GetLessonFullForStaffAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    /// <summary>Partial update: chỉ các field có trong body mới đổi.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<LessonFullDetailDto>> UpdateLesson(int id, [FromBody] StaffUpdateLessonRequest body)
    {
        try
        {
            var dto = await _learning.UpdateLessonByStaffAsync(id, body);
            return dto == null ? NotFound() : Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Xóa vĩnh viễn bài học và nội dung gắn bài (từ vựng, kanji, ngữ pháp, quiz). Cần quyền Staff.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteLesson(int id)
    {
        var ok = await _learning.StaffDeleteLessonAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{lessonId:int}/vocabulary")]
    public async Task<ActionResult<VocabularyItemDto>> AddVocabulary(int lessonId, [FromBody] StaffVocabularyCreateRequest body)
    {
        try
        {
            return Ok(await _learning.StaffAddVocabularyAsync(lessonId, body));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{lessonId:int}/vocabulary/{vocabularyId:int}")]
    public async Task<ActionResult<VocabularyItemDto>> UpdateVocabulary(
        int lessonId, int vocabularyId, [FromBody] StaffVocabularyPatchRequest body)
    {
        try
        {
            var dto = await _learning.StaffUpdateVocabularyAsync(lessonId, vocabularyId, body);
            return dto == null ? NotFound() : Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{lessonId:int}/vocabulary/{vocabularyId:int}")]
    public async Task<IActionResult> DeleteVocabulary(int lessonId, int vocabularyId)
    {
        var ok = await _learning.StaffDeleteVocabularyAsync(lessonId, vocabularyId);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{lessonId:int}/kanji")]
    public async Task<ActionResult<KanjiItemDto>> AddKanji(int lessonId, [FromBody] StaffKanjiCreateRequest body)
    {
        try
        {
            return Ok(await _learning.StaffAddKanjiAsync(lessonId, body));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{lessonId:int}/kanji/{kanjiId:int}")]
    public async Task<ActionResult<KanjiItemDto>> UpdateKanji(
        int lessonId, int kanjiId, [FromBody] StaffKanjiPatchRequest body)
    {
        try
        {
            var dto = await _learning.StaffUpdateKanjiAsync(lessonId, kanjiId, body);
            return dto == null ? NotFound() : Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{lessonId:int}/kanji/{kanjiId:int}")]
    public async Task<IActionResult> DeleteKanji(int lessonId, int kanjiId)
    {
        var ok = await _learning.StaffDeleteKanjiAsync(lessonId, kanjiId);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{lessonId:int}/grammar")]
    public async Task<ActionResult<GrammarItemDto>> AddGrammar(int lessonId, [FromBody] StaffGrammarCreateRequest body)
    {
        try
        {
            return Ok(await _learning.StaffAddGrammarAsync(lessonId, body));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{lessonId:int}/grammar/{grammarId:int}")]
    public async Task<ActionResult<GrammarItemDto>> UpdateGrammar(
        int lessonId, int grammarId, [FromBody] StaffGrammarPatchRequest body)
    {
        try
        {
            var dto = await _learning.StaffUpdateGrammarAsync(lessonId, grammarId, body);
            return dto == null ? NotFound() : Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{lessonId:int}/grammar/{grammarId:int}")]
    public async Task<IActionResult> DeleteGrammar(int lessonId, int grammarId)
    {
        var ok = await _learning.StaffDeleteGrammarAsync(lessonId, grammarId);
        return ok ? NoContent() : NotFound();
    }
}
