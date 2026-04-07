using backend.DTOs.User;

namespace backend.DTOs.Auth;

public class AuthResponse
{
    public string AccessToken { get; set; } = null!;
    public UserDto User { get; set; } = null!;
    public bool NeedsPlacementTest { get; set; }
}

