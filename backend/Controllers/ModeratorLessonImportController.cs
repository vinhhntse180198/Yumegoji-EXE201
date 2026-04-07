using System.IO;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Trích tài liệu + (tùy chọn) sinh bài học / quiz bằng AI — chỉ moderator/admin.</summary>
[ApiController]
[Route("api/moderator/lessons/import")]
[Authorize(Policy = AuthPolicies.Staff)]
public class ModeratorLessonImportController : ControllerBase
{
    private const int ExtractResponseMaxChars = 200_000;
    private const int ExtractPreviewMaxChars = 2_000;

    private readonly ILessonAiImportService _aiImport;
    private readonly ILearningService _learning;

    public ModeratorLessonImportController(
        ILessonAiImportService aiImport,
        ILearningService learning)
    {
        _aiImport = aiImport;
        _learning = learning;
    }

    private int? GetOptionalUserId()
    {
        var s = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(s, out var id) && id > 0 ? id : null;
    }

    /// <summary>Trích văn bản từ PDF/DOCX/PPTX hoặc text dán — không gọi AI, không cần ApiKey.</summary>
    [HttpPost("extract-text")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(32_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 32_000_000)]
    public async Task<ActionResult<ExtractLessonTextResponseDto>> ExtractText(
        [FromForm] GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        try
        {
            var (plain, err) = await TryBuildPlainFromFormAsync(form, cancellationToken);
            if (err != null)
                return BadRequest(new { message = err });

            var truncated = plain!.Length > ExtractResponseMaxChars;
            var body = truncated ? plain.Substring(0, ExtractResponseMaxChars) : plain;
            var previewLen = Math.Min(body.Length, ExtractPreviewMaxChars);
            var preview = previewLen < body.Length ? body.Substring(0, previewLen) + "…" : body;

            return Ok(new ExtractLessonTextResponseDto
            {
                CharacterCount = body.Length,
                Preview = preview,
                PlainText = body,
                Truncated = truncated,
                Warning = truncated
                    ? $"Nội dung chỉ trả về tối đa {ExtractResponseMaxChars:N0} ký tự đầu; phần sau bị cắt."
                    : null,
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, new { message = "Yêu cầu bị hủy hoặc hết thời gian chờ." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message =
                    "Lỗi khi trích văn bản (có thể file .pptx lỗi hoặc quá phức tạp). Thử PDF/.docx hoặc dán text. Chi tiết: "
                    + ex.Message,
            });
        }
    }

    /// <summary>Upload PDF/DOCX hoặc gửi text — trích nội dung và gọi AI sinh bản nháp JSON.</summary>
    [HttpPost("generate-draft")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(32_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 32_000_000)]
    public async Task<ActionResult<GenerateLessonDraftResponseDto>> GenerateDraft(
        [FromForm] GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        var (plain, err) = await TryBuildPlainFromFormAsync(form, cancellationToken);
        if (err != null)
            return BadRequest(new { message = err });

        try
        {
            var lessonKind = form?.LessonKind?.Trim();
            var dto = await _aiImport.GenerateDraftAsync(plain!, lessonKind, cancellationToken);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Lưu bài học mới (chưa publish hoặc publish) kèm từ vựng / ngữ pháp / kanji / quiz.</summary>
    [HttpPost("create-from-draft")]
    public async Task<ActionResult<LessonFullDetailDto>> CreateFromDraft(
        [FromBody] StaffCreateLessonFromDraftRequest body)
    {
        try
        {
            var full = await _learning.StaffCreateLessonFromDraftAsync(body, GetOptionalUserId());
            return Ok(full);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<(string? Plain, string? ErrorMessage)> TryBuildPlainFromFormAsync(
        GenerateLessonDraftForm? form,
        CancellationToken cancellationToken)
    {
        form ??= new GenerateLessonDraftForm();
        var file = form.File;
        var text = form.Text;
        var plain = "";

        if (file != null && file.Length > 0)
        {
            await using var ms = new MemoryStream();
            await file.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;
            plain = LessonDocumentTextExtractor.Extract(ms, file.FileName, out var extractError);
            if (!string.IsNullOrEmpty(extractError) && string.IsNullOrWhiteSpace(plain))
                return (null, extractError);
        }

        if (string.IsNullOrWhiteSpace(plain) && !string.IsNullOrWhiteSpace(text))
            plain = text.Trim();

        if (string.IsNullOrWhiteSpace(plain))
        {
            var msg = file is { Length: > 0 }
                ? "Không trích được chữ từ file (slide có thể chỉ là ảnh, hoặc chữ nằm ngoài định dạng thường). Hãy thử: dán nội dung vào ô bên cạnh (gửi kèm file), xuất PDF/.docx, hoặc thêm ghi chú slide (Notes)."
                : "Gửi file .pdf / .docx / .pptx hoặc trường form text có nội dung.";
            return (null, msg);
        }

        return (plain, null);
    }
}
