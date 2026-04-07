using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Chat;

namespace backend.Services.Chat;

/// <summary>Mô-đun 5: Phòng chat công cộng, chat riêng (1vs1), nhóm, realtime.</summary>
public interface IChatService
{
    // --- 1vs1 Direct ---
    Task<ChatRoomDto> GetOrCreateDirectRoomAsync(int currentUserId, int peerUserId);

    /// <summary>Học viên mở (hoặc tái sử dụng) phòng chat 1-1 với một moderator/admin — hỗ trợ từ widget.</summary>
    Task<ChatRoomDto> GetOrCreateModeratorSupportRoomAsync(int learnerUserId);

    // --- Catalog (đặc tả 5.1) ---
    IReadOnlyList<RoomCategoryDto> GetRoomCategories();

    // --- Rooms CRUD ---
    Task<IEnumerable<ChatRoomDto>> GetPublicRoomsAsync(int currentUserId, string? type = "public", string? slug = null, int? levelId = null, int limit = 50);
    Task<IEnumerable<ChatRoomDto>> GetMyRoomsAsync(int currentUserId, string? type = null, int limit = 50);
    Task<ChatRoomDto?> GetRoomByIdAsync(int roomId, int currentUserId);
    Task<ChatRoomDto?> GetPublicRoomByIdAsync(int roomId, int currentUserId);
    Task<IEnumerable<ChatRoomMemberDto>> GetRoomMembersAsync(int roomId, int currentUserId, int limit = 200, bool includeOnlineForStaff = false);
    Task<RoomPresenceDto?> GetRoomPresenceAsync(int roomId, int currentUserId);
    Task<ChatRoomDto> CreateRoomAsync(int currentUserId, CreateRoomRequest request);
    Task<ChatRoomDto?> UpdateRoomAsync(int roomId, int currentUserId, UpdateRoomRequest request);
    /// <summary>(Success, Forbidden) — Forbidden khi không phải admin/người tạo (phòng không private).</summary>
    Task<(bool Success, bool Forbidden)> DeleteRoomAsync(int roomId, int currentUserId);
    Task<bool> JoinRoomAsync(int roomId, int currentUserId);
    Task<bool> LeaveRoomAsync(int roomId, int currentUserId);
    Task<bool> InviteMemberToRoomAsync(int roomId, int currentUserId, int targetUserId);

    /// <summary>Admin nhóm kick thành viên (không áp dụng private 1-1).</summary>
    Task<bool> RemoveMemberFromRoomAsync(int roomId, int actorUserId, int targetUserId);

    // --- Messages CRUD ---
    Task<PagedMessagesResponse> GetMessagesAsync(int roomId, int currentUserId, string? cursor = null, int limit = 30, bool staffCanReadPublicWithoutMembership = false);
    Task<SendMessageResult> SendMessageAsync(int roomId, int currentUserId, SendMessageRequest request);
    Task<MessageDto?> UpdateMessageAsync(int roomId, int messageId, int currentUserId, string content);
    Task<bool> DeleteMessageAsync(int roomId, int messageId, int currentUserId);
    Task<bool> DeleteMessageAsModeratorAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator);

    // --- Reactions (message_reactions) ---
    Task<MessageDto?> AddReactionAsync(int roomId, int messageId, int currentUserId, string emoji);
    Task<bool> RemoveReactionAsync(int roomId, int messageId, int currentUserId, string emoji);

    // --- Pin (moderator phòng hoặc moderator/admin hệ thống) ---
    Task<bool> PinMessageAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator);
    Task<bool> UnpinMessageAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator);

    // --- Read ---
    Task<bool> MarkRoomReadAsync(int roomId, int currentUserId, int? lastReadMessageId = null);
}
