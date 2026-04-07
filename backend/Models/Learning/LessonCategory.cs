namespace backend.Models.Learning;

public class LessonCategory
{
    public int Id { get; set; }
    public int LevelId { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string? ThumbnailUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsPremium { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public global::backend.Models.Level.Level? Level { get; set; }
}
