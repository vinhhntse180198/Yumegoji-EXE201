using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace backend.DTOs.Learning;

public class LevelDto
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
}

public class LessonCategoryDto
{
    public int Id { get; set; }
    public int LevelId { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string? ThumbnailUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsPremium { get; set; }
}

public class LessonListItemDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public int LevelId { get; set; }
    /// <summary>grammar | vocab | reading | … — khớp tab lọc trên Learn.</summary>
    public string CategoryType { get; set; } = "";
    public string CategoryName { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int EstimatedMinutes { get; set; }
    public bool IsPremium { get; set; }
    public int SortOrder { get; set; }
}

public class LessonDetailDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public int LevelId { get; set; }
    public string CategoryName { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Content { get; set; }
    public int EstimatedMinutes { get; set; }
    public bool IsPremium { get; set; }
    public int SortOrder { get; set; }
}

public class LessonFullDetailDto
{
    public LessonDetailDto Lesson { get; set; } = null!;
    public IReadOnlyList<VocabularyItemDto> Vocabulary { get; set; } = Array.Empty<VocabularyItemDto>();
    public IReadOnlyList<KanjiItemDto> Kanji { get; set; } = Array.Empty<KanjiItemDto>();
    public IReadOnlyList<GrammarItemDto> Grammar { get; set; } = Array.Empty<GrammarItemDto>();
    /// <summary>Chỉ điền khi staff xem bài; API public học viên không trả quiz.</summary>
    public IReadOnlyList<LessonQuizQuestionDto> Quiz { get; set; } = Array.Empty<LessonQuizQuestionDto>();
}

public class LessonQuizQuestionDto
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string Question { get; set; } = null!;
    public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();
    public int CorrectIndex { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>Multipart cho POST generate-draft — một model duy nhất (Swashbuckle không hỗ trợ IFormFile + nhiều [FromForm] rời).</summary>
public class GenerateLessonDraftForm
{
    public IFormFile? File { get; set; }
    public string? Text { get; set; }

    /// <summary>auto | vocabulary | grammar | reading — gợi ý cấu trúc cho AI.</summary>
    public string? LessonKind { get; set; }
}

/// <summary>Chỉ trích văn bản từ file / form — không gọi OpenAI.</summary>
public class ExtractLessonTextResponseDto
{
    public int CharacterCount { get; set; }
    public string? Preview { get; set; }
    public string PlainText { get; set; } = "";
    public bool Truncated { get; set; }
    public string? Warning { get; set; }
}

/// <summary>Kết quả bước 1: trích text + bản nháp AI (moderator chỉnh trước khi lưu).</summary>
public class GenerateLessonDraftResponseDto
{
    public int ExtractedCharacterCount { get; set; }
    public string? ExtractedPreview { get; set; }
    public string? Warning { get; set; }
    public AiLessonDraftDto Draft { get; set; } = null!;
}

/// <summary>JSON do AI sinh — map sang form lưu bài.</summary>
public class AiLessonDraftDto
{
    public string Title { get; set; } = "";
    public string SlugSuggestion { get; set; } = "";
    public string ContentHtml { get; set; } = "";
    public int EstimatedMinutes { get; set; } = 15;
    public List<AiVocabItemDto> Vocabulary { get; set; } = new();
    public List<AiGrammarItemDto> Grammar { get; set; } = new();
    public List<AiQuizItemDto> Quiz { get; set; } = new();
}

public class AiVocabItemDto
{
    public string WordJp { get; set; } = "";
    public string? Reading { get; set; }
    public string? MeaningVi { get; set; }
}

public class AiGrammarItemDto
{
    public string Pattern { get; set; } = "";
    public string? MeaningVi { get; set; }
    public List<string>? Examples { get; set; }
}

public class AiQuizItemDto
{
    public string Question { get; set; } = "";
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
}

/// <summary>Body lưu bài sau khi moderator chỉnh bản nháp.</summary>
public class StaffCreateLessonFromDraftRequest
{
    public int CategoryId { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Content { get; set; }
    public int EstimatedMinutes { get; set; } = 15;
    public bool IsPublished { get; set; }
    public List<StaffVocabularyCreateRequest>? Vocabulary { get; set; }
    public List<StaffGrammarCreateRequest>? Grammar { get; set; }
    public List<StaffKanjiCreateRequest>? Kanji { get; set; }
    public List<StaffQuizQuestionCreateRequest>? Quiz { get; set; }
}

public class VocabularyItemDto
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public string WordJp { get; set; } = null!;
    public string? Reading { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentence { get; set; }
    public string? AudioUrl { get; set; }
    public int SortOrder { get; set; }
}

public class KanjiItemDto
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public string Character { get; set; } = null!;
    public string? ReadingsOn { get; set; }
    public string? ReadingsKun { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public int? StrokeCount { get; set; }
    public string? JlptLevel { get; set; }
    public int SortOrder { get; set; }
}

public class GrammarItemDto
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public int? LevelId { get; set; }
    public string Pattern { get; set; } = null!;
    public string? Structure { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentences { get; set; }
    public int SortOrder { get; set; }
}

public class PagedResultDto<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class UpsertProgressRequest
{
    public int ProgressPercent { get; set; }
    public string Status { get; set; } = "in_progress";
}

public class UserLessonProgressDto
{
    public int LessonId { get; set; }
    public string LessonTitle { get; set; } = null!;
    public string LessonSlug { get; set; } = null!;
    public int LevelId { get; set; }
    public string Status { get; set; } = null!;
    public int ProgressPercent { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime LastAccessedAt { get; set; }
}

public class ProgressSummaryDto
{
    public int Exp { get; set; }
    public int Xu { get; set; }
    public int StreakDays { get; set; }
    public IReadOnlyList<LevelCompletionDto> ByLevel { get; set; } = Array.Empty<LevelCompletionDto>();
}

public class LevelCompletionDto
{
    public int LevelId { get; set; }
    public string LevelCode { get; set; } = null!;
    public string LevelName { get; set; } = null!;
    public int TotalPublishedLessons { get; set; }
    public int CompletedLessons { get; set; }
    public double CompletionPercent { get; set; }
}

public class BookmarkLessonDto
{
    public int BookmarkId { get; set; }
    public int LessonId { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public int LevelId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LearningMaterialDto
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public int? LevelId { get; set; }
    public string Title { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public int? FileSizeKb { get; set; }
    public bool IsPremium { get; set; }
    public string Status { get; set; } = null!;
    public int DownloadCount { get; set; }
}

public class DownloadMaterialResponseDto
{
    public string FileUrl { get; set; } = null!;
    public int DownloadCount { get; set; }
}
