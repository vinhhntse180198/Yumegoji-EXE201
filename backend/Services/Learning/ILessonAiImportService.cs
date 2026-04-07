using System.Threading;
using System.Threading.Tasks;
using backend.DTOs.Learning;

namespace backend.Services.Learning;

public interface ILessonAiImportService
{
    /// <summary>Gọi LLM để sinh bản nháp bài học từ văn bản đã trích.</summary>
    /// <param name="lessonKind">auto | vocabulary | grammar | reading (tùy chọn).</param>
    Task<GenerateLessonDraftResponseDto> GenerateDraftAsync(
        string plainText,
        string? lessonKind = null,
        CancellationToken cancellationToken = default);
}
