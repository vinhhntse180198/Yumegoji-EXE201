using System;

namespace backend.DTOs.User;

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public int? LevelId { get; set; }
    public int Exp { get; set; }
    public int Xu { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsLocked { get; set; }
    public bool IsPremium { get; set; }
    public DateTime CreatedAt { get; set; }
}

