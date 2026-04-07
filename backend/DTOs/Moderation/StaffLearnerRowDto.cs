using System;

namespace backend.DTOs.Moderation;

public class StaffLearnerRowDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public int? LevelId { get; set; }
    public string? LevelCode { get; set; }
    public string? LevelName { get; set; }
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
}
