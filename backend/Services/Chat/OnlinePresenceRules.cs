using System;

namespace backend.Services;

/// <summary>
/// Client gửi POST /api/Social/presence định kỳ (~45s). Nếu không còn heartbeat, không coi là online
/// (tránh “treo” online sau khi đóng tab / mất mạng mà không gửi offline).
/// </summary>
public static class OnlinePresenceRules
{
    public const int StaleAfterSeconds = 120;

    public static bool IsEffectivelyOnline(string? status, DateTime lastSeenAtUtc, DateTime utcNow)
    {
        if (string.IsNullOrWhiteSpace(status)) return false;
        if (!string.Equals(status, "online", StringComparison.OrdinalIgnoreCase)) return false;
        return (utcNow - lastSeenAtUtc).TotalSeconds <= StaleAfterSeconds;
    }
}
