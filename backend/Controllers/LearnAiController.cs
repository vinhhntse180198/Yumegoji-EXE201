using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Learning;
using backend.Services.AI;
using backend.Services.Learning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>AI dùm tôi — Ollama (local): chat + ảnh (model vision).</summary>
[ApiController]
[Route("api/learn/ai")]
public class LearnAiController : ControllerBase
{
    private const int LearnAiExtractMaxChars = 60_000;

    private readonly ILearnOllamaAssistantService _ollama;

    public LearnAiController(ILearnOllamaAssistantService ollama)
    {
        _ollama = ollama;
    }

    /// <summary>Trích văn bản từ PDF/DOCX/PPTX cho AI dùm tôi (học viên).</summary>
    [Authorize(Policy = AuthPolicies.Member)]
    [HttpPost("extract-document")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25_000_000)]
    public async Task<ActionResult<ExtractLessonTextResponseDto>> ExtractDocument(
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file .pdf, .docx hoặc .pptx." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf" && ext != ".docx" && ext != ".pptx")
            return BadRequest(new { message = "Chỉ hỗ trợ .pdf, .docx và .pptx." });

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var plain = LessonDocumentTextExtractor.Extract(ms, file.FileName, out var extractErr);
        if (!string.IsNullOrWhiteSpace(extractErr) && string.IsNullOrWhiteSpace(plain))
            return BadRequest(new { message = extractErr });

        var truncated = plain.Length > LearnAiExtractMaxChars;
        var body = truncated ? plain.Substring(0, LearnAiExtractMaxChars) : plain;
        var previewLen = Math.Min(body.Length, 2000);
        var preview = previewLen < body.Length ? body.Substring(0, previewLen) + "…" : body;

        return Ok(new ExtractLessonTextResponseDto
        {
            CharacterCount = body.Length,
            Preview = preview,
            PlainText = body,
            Truncated = truncated,
            Warning = truncated
                ? $"Chỉ gửi tối đa {LearnAiExtractMaxChars:N0} ký tự đầu; phần sau bị cắt."
                : null,
        });
    }

    [Authorize(Policy = AuthPolicies.Member)]
    [HttpPost("chat")]
    public async Task<ActionResult<LearnAiChatResponse>> Chat(
        [FromBody] LearnAiChatRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var result = await _ollama.ChatAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }
    }
}
