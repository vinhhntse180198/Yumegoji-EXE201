namespace backend.Models.Learning;

public class UserBookmark
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int LessonId { get; set; }
    public DateTime CreatedAt { get; set; }

    public Lesson? Lesson { get; set; }
}
