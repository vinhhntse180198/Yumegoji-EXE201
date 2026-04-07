using System.Collections.Generic;

namespace backend.DTOs.Chat;

public class CreateRoomRequest
{
    public string Name { get; set; } = null!;
    public string Type { get; set; } = "group"; // public, level, private, group
    public string? Slug { get; set; }
    public int? LevelId { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public int? MaxMembers { get; set; }

    /// <summary>Chỉ áp dụng khi <c>type=group</c>: mời bạn bè ngay khi tạo (giống bài mẫu memberIds).</summary>
    public IReadOnlyList<int>? InitialMemberIds { get; set; }
}
