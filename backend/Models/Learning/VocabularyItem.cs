namespace backend.Models.Learning;

public class VocabularyItem
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson? Lesson { get; set; }
}
