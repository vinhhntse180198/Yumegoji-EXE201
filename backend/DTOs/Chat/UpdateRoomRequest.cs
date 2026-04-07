namespace backend.DTOs.Chat;

public class UpdateRoomRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public int? MaxMembers { get; set; }
    public bool? IsActive { get; set; }
}
