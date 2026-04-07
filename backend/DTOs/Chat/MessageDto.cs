using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.DTOs.Chat;

public class MessageDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    [JsonPropertyName("roomId")]
    public int RoomId { get; set; }
    /// <summary>ID người gửi — luôn serial camelCase cho frontend (tránh PascalCase làm mất userId).</summary>
    [JsonPropertyName("userId")]
    public int UserId { get; set; }
    public string? SenderUsername { get; set; }
    public string? SenderDisplayName { get; set; }
    public string? SenderAvatarUrl { get; set; }
    public string? Content { get; set; }
    public string Type { get; set; } = "text";
    public int? ReplyToId { get; set; }
    public bool IsPinned { get; set; }
    public int? PinnedBy { get; set; }
    public DateTime? PinnedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ReactionSummaryDto> Reactions { get; set; } = new();
}
