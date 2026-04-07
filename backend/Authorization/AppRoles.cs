namespace backend.Authorization;

/// <summary>Giá trị cột users.role (khớp CHECK trong schema SQL).</summary>
public static class AppRoles
{
    public const string Guest = "guest";
    public const string User = "user";
    public const string Moderator = "moderator";
    public const string Admin = "admin";
}
