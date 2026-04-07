using System;
using System.Collections.Generic;

namespace backend.Models.Chat;

public class ChatRoom
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string Type { get; set; } = null!; // public, level, private, group
    public int? LevelId { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public int? MaxMembers { get; set; }
    public bool IsActive { get; set; } = true;
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ChatRoomMember> Members { get; set; } = new List<ChatRoomMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
