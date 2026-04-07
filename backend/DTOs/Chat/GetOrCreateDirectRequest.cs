namespace backend.DTOs.Chat;

/// <summary>Body cho API tạo/lấy phòng chat 1vs1.</summary>
public class GetOrCreateDirectRequest
{
    public int PeerUserId { get; set; }
}
