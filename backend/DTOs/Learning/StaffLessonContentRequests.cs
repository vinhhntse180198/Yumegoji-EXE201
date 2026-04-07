using System.Collections.Generic;

namespace backend.DTOs.Learning;

public class StaffVocabularyCreateRequest
{
    public string WordJp { get; set; } = null!;
    public string? Reading { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentence { get; set; }
    public string? AudioUrl { get; set; }
    /// <summary>Bỏ qua để tự gán cuối danh sách.</summary>
    public int? SortOrder { get; set; }
}

public class StaffVocabularyPatchRequest
{
    public string? WordJp { get; set; }
    public string? Reading { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentence { get; set; }
    public string? AudioUrl { get; set; }
    public int? SortOrder { get; set; }
}

public class StaffKanjiCreateRequest
{
    public string Character { get; set; } = null!;
    public string? ReadingsOn { get; set; }
    public string? ReadingsKun { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public int? StrokeCount { get; set; }
    public string? JlptLevel { get; set; }
    public int? SortOrder { get; set; }
}

public class StaffKanjiPatchRequest
{
    public string? Character { get; set; }
    public string? ReadingsOn { get; set; }
    public string? ReadingsKun { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public int? StrokeCount { get; set; }
    public string? JlptLevel { get; set; }
    public int? SortOrder { get; set; }
}

public class StaffGrammarCreateRequest
{
    public string Pattern { get; set; } = null!;
    public string? Structure { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentences { get; set; }
    /// <summary>Mặc định lấy theo cấp độ của danh mục bài học.</summary>
    public int? LevelId { get; set; }
    public int? SortOrder { get; set; }
}

public class StaffQuizQuestionCreateRequest
{
    public string Question { get; set; } = null!;
    public List<string> Options { get; set; } = new();
    public int CorrectIndex { get; set; }
    public int? SortOrder { get; set; }
}

public class StaffGrammarPatchRequest
{
    public string? Pattern { get; set; }
    public string? Structure { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentences { get; set; }
    public int? LevelId { get; set; }
    public int? SortOrder { get; set; }
}
