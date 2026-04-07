namespace backend.Models.Learning;

public class LearningMaterial
{
    public int Id { get; set; }
    public int? LessonId { get; set; }
    public int? LevelId { get; set; }
    public string Title { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public int? FileSizeKb { get; set; }
    public bool IsPremium { get; set; }
    public string Status { get; set; } = "pending";
    public int DownloadCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
