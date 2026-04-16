namespace backend.DTOs.Auth;

public class GoogleLoginRequest
{
    /// <summary>JWT credential từ Google Identity Services (thuộc tính <c>credential</c> trong callback).</summary>
    public string? IdToken { get; set; }
}
