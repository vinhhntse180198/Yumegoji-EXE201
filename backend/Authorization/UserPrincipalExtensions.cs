using System.Security.Claims;

namespace backend.Authorization;

public static class UserPrincipalExtensions
{
    /// <summary>Moderator / Admin không dùng bài kiểm tra dành cho học viên.</summary>
    public static bool IsModeratorOrAdmin(this ClaimsPrincipal? user) =>
        user != null && (user.IsInRole(AppRoles.Moderator) || user.IsInRole(AppRoles.Admin));
}
