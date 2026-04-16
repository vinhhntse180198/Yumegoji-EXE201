using System;

namespace backend.Models.User;

/// <summary>Bản ghi token đặt lại mật khẩu (bảng <c>password_reset_tokens</c>).</summary>
public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
