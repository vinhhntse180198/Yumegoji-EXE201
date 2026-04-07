namespace backend.Models.Learning;

public class Lesson
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Content { get; set; }
    public int SortOrder { get; set; }
    public int EstimatedMinutes { get; set; }
    public bool IsPremium { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }

    public LessonCategory? Category { get; set; }
}
