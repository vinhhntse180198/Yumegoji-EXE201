namespace backend.DTOs.Chat;

/// <summary>Gợi ý mapping phòng theo đặc tả 5.1 — dùng slug/level khi seed DB.</summary>
public class RoomCategoryDto
{
    public string Key { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string SuggestedSlug { get; set; } = null!;
    public string RoomType { get; set; } = null!;
    public int? LevelId { get; set; }
}
