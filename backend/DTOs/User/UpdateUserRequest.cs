namespace backend.DTOs.User;

public class UpdateUserRequest
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public int? LevelId { get; set; }
    public bool? IsLocked { get; set; }
    public bool? IsPremium { get; set; }
}

