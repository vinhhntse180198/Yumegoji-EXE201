namespace backend.DTOs.Learning;

/// <summary>Staff (moderator/admin) cập nhật bài học — chỉ field nào gửi lên (khác null) mới được áp dụng.</summary>
public class StaffUpdateLessonRequest
{
    public int? CategoryId { get; set; }
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public string? Content { get; set; }
    public int? SortOrder { get; set; }
    public int? EstimatedMinutes { get; set; }
    public bool? IsPremium { get; set; }
    public bool? IsPublished { get; set; }
}
