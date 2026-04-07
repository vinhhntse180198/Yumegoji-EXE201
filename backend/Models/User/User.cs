using System;

namespace backend.Models.User;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? PasswordHash { get; set; }
    public string Role { get; set; } = "user";
    public int? LevelId { get; set; }
    public int Exp { get; set; } = 0;
    public int StreakDays { get; set; } = 0;
    public DateTime? LastStreakAt { get; set; }
    public int Xu { get; set; } = 0;
    public bool IsEmailVerified { get; set; } = false;
    public bool IsLocked { get; set; } = false;
    public DateTime? LockedAt { get; set; }
    public string? LockedReason { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public bool IsPremium { get; set; } = false;
}

