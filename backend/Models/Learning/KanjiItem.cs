namespace backend.Models.Learning;

public class KanjiItem
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    /// <summary>Cột SQL: character</summary>
    public string KanjiChar { get; set; } = null!;
    public string? ReadingsOn { get; set; }
    public string? ReadingsKun { get; set; }
    public string? MeaningVi { get; set; }
    public string? MeaningEn { get; set; }
    public int? StrokeCount { get; set; }
    public string? JlptLevel { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson? Lesson { get; set; }
}
