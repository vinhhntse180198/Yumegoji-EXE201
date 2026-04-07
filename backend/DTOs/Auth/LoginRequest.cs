using System.Text.Json.Serialization;

namespace backend.DTOs.Auth;

public class LoginRequest
{
    /// <summary>Username hoặc email (JSON camelCase: <c>usernameOrEmail</c>).</summary>
    public string? UsernameOrEmail { get; set; }

    /// <summary>Nhiều front-end chỉ gửi <c>email</c> — map tại đây.</summary>
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    public string? Password { get; set; }
}

