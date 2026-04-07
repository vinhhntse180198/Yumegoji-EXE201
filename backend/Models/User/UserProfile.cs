using System;

namespace backend.Models.User;

public class UserProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? PrivacyProfile { get; set; }
    public string? PrivacyFriendRequest { get; set; }
    public string? Theme { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}
