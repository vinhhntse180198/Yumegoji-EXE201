namespace backend.Models.Learning;

public class GrammarItem
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public string Pattern { get; set; } = null!;
    public string? Structure { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public string? ExampleSentences { get; set; }
    public int? LevelId { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson? Lesson { get; set; }
}
