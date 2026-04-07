namespace backend.DTOs.Social;

public class PresenceUpdateRequest
{
    /// <summary>online, offline, away</summary>
    public string Status { get; set; } = "online";
}
