namespace backend.DTOs.Chat;

public class RoomPresenceDto
{
    public int RoomId { get; set; }
    public int MemberCount { get; set; }
    public int OnlineCount { get; set; }
}
