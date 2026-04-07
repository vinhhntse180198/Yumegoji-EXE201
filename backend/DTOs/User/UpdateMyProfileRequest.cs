using System;

namespace backend.DTOs.User;

public class UpdateMyProfileRequest
{
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Theme { get; set; }
}

