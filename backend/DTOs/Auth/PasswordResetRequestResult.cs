namespace backend.DTOs.Auth;

/// <summary>Kết quả nội bộ sau khi xử lý yêu cầu quên mật khẩu (không lộ email có/không cho client production).</summary>
public sealed class PasswordResetRequestResult
{
    /// <summary>Chỉ gán khi môi trường Development và đã tạo token — tiện test khi chưa gửi email.</summary>
    public string? DevelopmentResetUrl { get; init; }
}
