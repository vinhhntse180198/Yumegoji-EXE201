namespace backend.Models.Learning;

/// <summary>Câu hỏi trắc nghiệm gắn với bài học (tạo từ AI / moderator).</summary>
public class LessonQuizQuestion
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string Question { get; set; } = null!;
    /// <summary>Mảng chuỗi đáp án (JSON).</summary>
    public string OptionsJson { get; set; } = null!;
    public int CorrectIndex { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Lesson? Lesson { get; set; }
}
