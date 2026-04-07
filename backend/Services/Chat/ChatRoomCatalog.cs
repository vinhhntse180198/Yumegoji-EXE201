using System.Collections.Generic;
using backend.DTOs.Chat;

namespace backend.Services.Chat;

/// <summary>Đặc tả phòng 5.1 — map với bảng <c>chat_rooms</c> (yumegoji-schema-sqlserver.sql) qua slug/type/level_id khi seed.</summary>
public static class ChatRoomCatalog
{
    public static IReadOnlyList<RoomCategoryDto> Categories { get; } = new List<RoomCategoryDto>
    {
        new()
        {
            Key = "general",
            Name = "Phòng chung",
            Description = "Tất cả người dùng",
            SuggestedSlug = "general",
            RoomType = "public",
            LevelId = null
        },
        new()
        {
            Key = "level-n5",
            Name = "Phòng N5",
            Description = "Dành cho trình độ N5",
            SuggestedSlug = "level-n5",
            RoomType = "level",
            LevelId = 1
        },
        new()
        {
            Key = "level-n4",
            Name = "Phòng N4",
            Description = "Dành cho trình độ N4",
            SuggestedSlug = "level-n4",
            RoomType = "level",
            LevelId = 2
        },
        new()
        {
            Key = "level-n3",
            Name = "Phòng N3",
            Description = "Dành cho trình độ N3",
            SuggestedSlug = "level-n3",
            RoomType = "level",
            LevelId = 3
        },
        new()
        {
            Key = "japan",
            Name = "Phòng Nhật Bản",
            Description = "Văn hóa, du lịch, ẩm thực",
            SuggestedSlug = "japan-culture",
            RoomType = "public",
            LevelId = null
        },
        new()
        {
            Key = "jlpt",
            Name = "Phòng ôn thi",
            Description = "Thảo luận JLPT",
            SuggestedSlug = "jlpt-prep",
            RoomType = "public",
            LevelId = null
        },
        new()
        {
            Key = "free",
            Name = "Phòng tự do",
            Description = "Chat không giới hạn chủ đề",
            SuggestedSlug = "free-chat",
            RoomType = "public",
            LevelId = null
        }
    };
}
