namespace backend.Authorization;

/// <summary>
/// Phân quyền giai đoạn 2:
/// - Member: user đã đăng ký đầy đủ (không phải guest) — chat, game, học chi tiết, AI, xã hội…
/// - Staff: moderator + admin — kiểm duyệt nâng cao, sửa nội dung học…
/// - AdminOnly: chỉ admin.
/// </summary>
public static class AuthPolicies
{
    public const string Member = "Member";
    public const string Staff = "Staff";
    public const string AdminOnly = "AdminOnly";
}
