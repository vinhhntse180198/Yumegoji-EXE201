using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Social;

namespace backend.Services.Social;

/// <summary>Mô-đun 6: Kết bạn, hồ sơ cá nhân, thông báo, tương tác.</summary>
public interface ISocialService
{
    Task<FriendRequestDto> SendFriendRequestAsync(int fromUserId, int toUserId);
    Task<bool> CancelFriendRequestAsync(int fromUserId, int requestId);
    Task<FriendRequestDto> AcceptFriendRequestAsync(int toUserId, int requestId);
    Task<bool> RejectFriendRequestAsync(int toUserId, int requestId);

    Task<IEnumerable<FriendRequestDto>> GetIncomingRequestsAsync(int userId);
    Task<IEnumerable<FriendRequestDto>> GetOutgoingRequestsAsync(int userId);
    Task<IEnumerable<FriendDto>> GetFriendsAsync(int userId);
    Task<bool> UnfriendAsync(int userId, int friendId);

    Task<bool> BlockUserAsync(int userId, int blockedUserId);
    Task<bool> UnblockUserAsync(int userId, int blockedUserId);
    Task<IEnumerable<UserLiteDto>> GetBlockedUsersAsync(int userId);

    Task<IEnumerable<UserLiteDto>> SearchUsersAsync(int currentUserId, string query, int limit = 20);
    Task<IEnumerable<UserLiteDto>> GetFriendSuggestionsAsync(int userId, int limit = 10);
    Task UpdatePresenceAsync(int userId, string status);

    // Posts / Newsfeed
    Task<PostDto> CreatePostAsync(int userId, CreatePostRequest request);
    Task<bool> DeletePostAsync(int userId, int postId);
    Task<IReadOnlyList<PostDto>> GetFeedAsync(int userId, int limit = 20, int? beforePostId = null);
    Task<PostCommentDto> AddCommentAsync(int userId, int postId, CreateCommentRequest request);
    Task<IReadOnlyList<PostCommentDto>> GetCommentsAsync(int userId, int postId, int limit = 50);
    Task<PostReactionSummaryDto> ToggleReactionAsync(int userId, int postId, string emoji);
}
