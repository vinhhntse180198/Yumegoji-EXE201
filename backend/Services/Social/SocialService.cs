using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using backend.DTOs.Social;
using backend.Models.Social;
using backend.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Social;

public class SocialService : ISocialService
{
    private readonly ApplicationDbContext _db;

    public SocialService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ----------------- FRIEND REQUESTS / FRIENDS / BLOCK / SEARCH -----------------
    public async Task<FriendRequestDto> SendFriendRequestAsync(int fromUserId, int toUserId)
    {
        if (fromUserId == toUserId)
            throw new InvalidOperationException("Không thể gửi lời mời kết bạn cho chính mình.");

        var targetExists = await _db.Users.AnyAsync(u => u.Id == toUserId && u.DeletedAt == null);
        if (!targetExists)
            throw new InvalidOperationException("Người dùng không tồn tại.");

        var blockedEitherWay = await _db.BlockedUsers.AnyAsync(b =>
            (b.UserId == fromUserId && b.BlockedUserId == toUserId) ||
            (b.UserId == toUserId && b.BlockedUserId == fromUserId));
        if (blockedEitherWay)
            throw new InvalidOperationException("Không thể gửi lời mời (một trong hai đã chặn nhau).");

        var alreadyFriends = await _db.Friendships.AnyAsync(f => f.UserId == fromUserId && f.FriendId == toUserId);
        if (alreadyFriends)
            throw new InvalidOperationException("Hai bạn đã là bạn bè.");

        // Nếu phía kia đã gửi pending -> auto accept
        var reversePending = await _db.FriendRequests.FirstOrDefaultAsync(fr =>
            fr.FromUserId == toUserId && fr.ToUserId == fromUserId && fr.Status == "pending");
        if (reversePending != null)
        {
            reversePending.Status = "accepted";
            reversePending.RespondedAt = DateTime.UtcNow;

            await EnsureFriendshipPairAsync(fromUserId, toUserId);
            await _db.SaveChangesAsync();
            return await BuildFriendRequestDtoAsync(reversePending.Id);
        }

        // Schema: UQ_friend_requests_from_to (from_user_id, to_user_id) — chỉ một dòng / cặp; không thể INSERT lại sau reject.
        var existing = await _db.FriendRequests.FirstOrDefaultAsync(fr =>
            fr.FromUserId == fromUserId && fr.ToUserId == toUserId);
        if (existing != null)
        {
            if (existing.Status == "pending")
                return await BuildFriendRequestDtoAsync(existing.Id);
            if (existing.Status == "accepted")
                throw new InvalidOperationException("Hai bạn đã là bạn bè.");
            if (existing.Status == "rejected")
            {
                existing.Status = "pending";
                existing.CreatedAt = DateTime.UtcNow;
                existing.RespondedAt = null;
                await _db.SaveChangesAsync();
                return await BuildFriendRequestDtoAsync(existing.Id);
            }
        }

        var req = new FriendRequest
        {
            FromUserId = fromUserId,
            ToUserId = toUserId,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };
        _db.FriendRequests.Add(req);
        await _db.SaveChangesAsync();
        return await BuildFriendRequestDtoAsync(req.Id);
    }

    public async Task<bool> CancelFriendRequestAsync(int fromUserId, int requestId)
    {
        var req = await _db.FriendRequests.FirstOrDefaultAsync(fr => fr.Id == requestId && fr.FromUserId == fromUserId);
        if (req == null) return false;
        if (req.Status != "pending") return false;
        _db.FriendRequests.Remove(req);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<FriendRequestDto> AcceptFriendRequestAsync(int toUserId, int requestId)
    {
        var req = await _db.FriendRequests.FirstOrDefaultAsync(fr => fr.Id == requestId && fr.ToUserId == toUserId);
        if (req == null) throw new InvalidOperationException("Lời mời không tồn tại.");
        if (req.Status != "pending") throw new InvalidOperationException("Lời mời không còn ở trạng thái pending.");

        var blockedEitherWay = await _db.BlockedUsers.AnyAsync(b =>
            (b.UserId == req.FromUserId && b.BlockedUserId == req.ToUserId) ||
            (b.UserId == req.ToUserId && b.BlockedUserId == req.FromUserId));
        if (blockedEitherWay)
            throw new InvalidOperationException("Không thể chấp nhận (một trong hai đã chặn nhau).");

        req.Status = "accepted";
        req.RespondedAt = DateTime.UtcNow;

        await EnsureFriendshipPairAsync(req.FromUserId, req.ToUserId);
        await _db.SaveChangesAsync();
        return await BuildFriendRequestDtoAsync(req.Id);
    }

    public async Task<bool> RejectFriendRequestAsync(int toUserId, int requestId)
    {
        var req = await _db.FriendRequests.FirstOrDefaultAsync(fr => fr.Id == requestId && fr.ToUserId == toUserId);
        if (req == null) return false;
        if (req.Status != "pending") return false;
        req.Status = "rejected";
        req.RespondedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<FriendRequestDto>> GetIncomingRequestsAsync(int userId)
    {
        var ids = await _db.FriendRequests
            .Where(fr => fr.ToUserId == userId && fr.Status == "pending")
            .OrderByDescending(fr => fr.CreatedAt)
            .Select(fr => fr.Id)
            .ToListAsync();

        var result = new List<FriendRequestDto>();
        foreach (var id in ids) result.Add(await BuildFriendRequestDtoAsync(id));
        return result;
    }

    public async Task<IEnumerable<FriendRequestDto>> GetOutgoingRequestsAsync(int userId)
    {
        var ids = await _db.FriendRequests
            .Where(fr => fr.FromUserId == userId && fr.Status == "pending")
            .OrderByDescending(fr => fr.CreatedAt)
            .Select(fr => fr.Id)
            .ToListAsync();

        var result = new List<FriendRequestDto>();
        foreach (var id in ids) result.Add(await BuildFriendRequestDtoAsync(id));
        return result;
    }

    public async Task<IEnumerable<FriendDto>> GetFriendsAsync(int userId)
    {
        var friendships = await _db.Friendships
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        var friendIds = friendships.Select(f => f.FriendId).Distinct().ToList();
        var users = await _db.Users.Where(u => friendIds.Contains(u.Id) && u.DeletedAt == null).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => friendIds.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);
        var presences = await _db.UserOnlineStatuses.Where(s => friendIds.Contains(s.UserId)).ToDictionaryAsync(s => s.UserId);
        var utcNow = DateTime.UtcNow;

        return friendships
            .Where(f => users.ContainsKey(f.FriendId))
            .Select(f =>
            {
                var u = users[f.FriendId];
                profiles.TryGetValue(f.FriendId, out var p);
                presences.TryGetValue(f.FriendId, out var pr);
                return new FriendDto
                {
                    FriendshipId = f.Id,
                    UserId = f.UserId,
                    FriendId = f.FriendId,
                    CreatedAt = f.CreatedAt,
                    Friend = new UserLiteDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        DisplayName = p?.DisplayName,
                        AvatarUrl = p?.AvatarUrl
                    },
                    IsOnline = pr != null && OnlinePresenceRules.IsEffectivelyOnline(pr.Status, pr.LastSeenAt, utcNow),
                    PresenceStatus = pr?.Status,
                    LastSeenAt = pr?.LastSeenAt
                };
            }).ToList();
    }

    public async Task<bool> UnfriendAsync(int userId, int friendId)
    {
        var pair = await _db.Friendships
            .Where(f => (f.UserId == userId && f.FriendId == friendId) || (f.UserId == friendId && f.FriendId == userId))
            .ToListAsync();

        if (pair.Count == 0) return false;
        _db.Friendships.RemoveRange(pair);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> BlockUserAsync(int userId, int blockedUserId)
    {
        if (userId == blockedUserId) return false;

        var targetExists = await _db.Users.AnyAsync(u => u.Id == blockedUserId && u.DeletedAt == null);
        if (!targetExists) return false;

        var exists = await _db.BlockedUsers.AnyAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
        if (exists) return true;

        _db.BlockedUsers.Add(new BlockedUser
        {
            UserId = userId,
            BlockedUserId = blockedUserId,
            CreatedAt = DateTime.UtcNow
        });

        // Khi block: xóa quan hệ bạn bè + hủy requests 2 chiều
        var requests = await _db.FriendRequests
            .Where(fr =>
                (fr.FromUserId == userId && fr.ToUserId == blockedUserId && fr.Status == "pending") ||
                (fr.FromUserId == blockedUserId && fr.ToUserId == userId && fr.Status == "pending"))
            .ToListAsync();
        _db.FriendRequests.RemoveRange(requests);

        var friendships = await _db.Friendships
            .Where(f => (f.UserId == userId && f.FriendId == blockedUserId) || (f.UserId == blockedUserId && f.FriendId == userId))
            .ToListAsync();
        _db.Friendships.RemoveRange(friendships);

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnblockUserAsync(int userId, int blockedUserId)
    {
        var row = await _db.BlockedUsers.FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
        if (row == null) return false;
        _db.BlockedUsers.Remove(row);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<UserLiteDto>> GetBlockedUsersAsync(int userId)
    {
        var blocked = await _db.BlockedUsers.Where(b => b.UserId == userId).OrderByDescending(b => b.CreatedAt).ToListAsync();
        var ids = blocked.Select(b => b.BlockedUserId).Distinct().ToList();
        var users = await _db.Users.Where(u => ids.Contains(u.Id) && u.DeletedAt == null).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        return ids
            .Where(id => users.ContainsKey(id))
            .Select(id =>
            {
                var u = users[id];
                profiles.TryGetValue(id, out var p);
                return new UserLiteDto { Id = u.Id, Username = u.Username, DisplayName = p?.DisplayName, AvatarUrl = p?.AvatarUrl };
            }).ToList();
    }

    public async Task<IEnumerable<UserLiteDto>> SearchUsersAsync(int currentUserId, string query, int limit = 20)
    {
        var q = query?.Trim() ?? "";
        if (q.Length < 1) return Array.Empty<UserLiteDto>();

        var blocked = await _db.BlockedUsers
            .Where(b => b.UserId == currentUserId || b.BlockedUserId == currentUserId)
            .Select(b => b.UserId == currentUserId ? b.BlockedUserId : b.UserId)
            .ToListAsync();

        var fromUsername = await _db.Users
            .Where(u => u.DeletedAt == null && u.Id != currentUserId && !blocked.Contains(u.Id) && u.Username.Contains(q))
            .Select(u => u.Id)
            .Take(limit)
            .ToListAsync();

        var fromDisplay = await _db.UserProfiles
            .Where(p => p.DisplayName != null && p.DisplayName.Contains(q))
            .Select(p => p.UserId)
            .Take(limit)
            .ToListAsync();

        var ids = fromUsername.Union(fromDisplay).Where(id => id != currentUserId && !blocked.Contains(id)).Distinct().Take(limit).ToList();
        var users = await _db.Users.Where(u => ids.Contains(u.Id) && u.DeletedAt == null).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        return ids
            .Where(id => users.ContainsKey(id))
            .Select(id =>
            {
                var u = users[id];
                profiles.TryGetValue(id, out var p);
                return new UserLiteDto { Id = u.Id, Username = u.Username, DisplayName = p?.DisplayName, AvatarUrl = p?.AvatarUrl };
            }).ToList();
    }

    public async Task<IEnumerable<UserLiteDto>> GetFriendSuggestionsAsync(int userId, int limit = 10)
    {
        var me = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
        if (me?.LevelId == null) return Array.Empty<UserLiteDto>();

        var friendIds = await _db.Friendships.Where(f => f.UserId == userId).Select(f => f.FriendId).ToListAsync();
        var blocked = await _db.BlockedUsers
            .Where(b => b.UserId == userId || b.BlockedUserId == userId)
            .Select(b => b.UserId == userId ? b.BlockedUserId : b.UserId)
            .ToListAsync();

        var candidates = await _db.Users
            .Where(u => u.DeletedAt == null && u.Id != userId && u.LevelId == me.LevelId && !friendIds.Contains(u.Id) && !blocked.Contains(u.Id))
            .OrderBy(u => u.Id)
            .Take(limit)
            .ToListAsync();

        var ids = candidates.Select(u => u.Id).ToList();
        var profiles = await _db.UserProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        return candidates.Select(u =>
        {
            profiles.TryGetValue(u.Id, out var p);
            return new UserLiteDto { Id = u.Id, Username = u.Username, DisplayName = p?.DisplayName, AvatarUrl = p?.AvatarUrl };
        }).ToList();
    }

    public async Task UpdatePresenceAsync(int userId, string status)
    {
        var now = DateTime.UtcNow;
        var row = await _db.UserOnlineStatuses.FindAsync(userId);
        if (row == null)
        {
            _db.UserOnlineStatuses.Add(new UserOnlineStatus { UserId = userId, Status = status, LastSeenAt = now });
        }
        else
        {
            row.Status = status;
            row.LastSeenAt = now;
        }
        await _db.SaveChangesAsync();
    }

    // ----------------- POSTS / NEWSFEED -----------------

    public async Task<PostDto> CreatePostAsync(int userId, CreatePostRequest request)
    {
        var now = DateTime.UtcNow;
        var post = new Post
        {
            UserId = userId,
            Content = string.IsNullOrWhiteSpace(request.Content) ? null : request.Content.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            IsDeleted = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        return await BuildPostDtoAsync(userId, post.Id);
    }

    public async Task<bool> DeletePostAsync(int userId, int postId)
    {
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);
        if (post == null) return false;
        if (post.UserId != userId) return false;

        post.IsDeleted = true;
        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PostDto>> GetFeedAsync(int userId, int limit = 20, int? beforePostId = null)
    {
        var query = _db.Posts
            .Where(p => !p.IsDeleted)
            .OrderByDescending(p => p.CreatedAt)
            .AsQueryable();

        if (beforePostId.HasValue)
        {
            var before = await _db.Posts.FirstOrDefaultAsync(p => p.Id == beforePostId.Value);
            if (before != null)
            {
                query = query.Where(p => p.CreatedAt < before.CreatedAt);
            }
        }

        var postIds = await query
            .Take(Math.Max(1, Math.Min(100, limit)))
            .Select(p => p.Id)
            .ToListAsync();

        var result = new List<PostDto>();
        foreach (var id in postIds)
        {
            result.Add(await BuildPostDtoAsync(userId, id));
        }

        return result;
    }

    public async Task<PostCommentDto> AddCommentAsync(int userId, int postId, CreateCommentRequest request)
    {
        var postExists = await _db.Posts.AnyAsync(p => p.Id == postId && !p.IsDeleted);
        if (!postExists) throw new InvalidOperationException("Bài đăng không tồn tại.");

        if (string.IsNullOrWhiteSpace(request.Content))
            throw new InvalidOperationException("Nội dung bình luận không được rỗng.");

        var comment = new PostComment
        {
            PostId = postId,
            UserId = userId,
            Content = request.Content.Trim(),
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.PostComments.Add(comment);
        await _db.SaveChangesAsync();

        return await BuildCommentDtoAsync(comment.Id);
    }

    public async Task<IReadOnlyList<PostCommentDto>> GetCommentsAsync(int userId, int postId, int limit = 50)
    {
        var ids = await _db.PostComments
            .Where(c => c.PostId == postId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .Take(Math.Max(1, Math.Min(100, limit)))
            .Select(c => c.Id)
            .ToListAsync();

        var result = new List<PostCommentDto>();
        foreach (var id in ids)
        {
            result.Add(await BuildCommentDtoAsync(id));
        }

        return result;
    }

    public async Task<PostReactionSummaryDto> ToggleReactionAsync(int userId, int postId, string emoji)
    {
        if (string.IsNullOrWhiteSpace(emoji))
            throw new InvalidOperationException("Emoji không hợp lệ.");

        var postExists = await _db.Posts.AnyAsync(p => p.Id == postId && !p.IsDeleted);
        if (!postExists) throw new InvalidOperationException("Bài đăng không tồn tại.");

        var normalizedEmoji = emoji.Trim();

        var existing = await _db.PostReactions.FirstOrDefaultAsync(r =>
            r.PostId == postId && r.UserId == userId && r.Emoji == normalizedEmoji);

        if (existing != null)
        {
            _db.PostReactions.Remove(existing);
        }
        else
        {
            _db.PostReactions.Add(new PostReaction
            {
                PostId = postId,
                UserId = userId,
                Emoji = normalizedEmoji,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        return await BuildReactionSummaryAsync(postId);
    }

    private async Task<PostDto> BuildPostDtoAsync(int currentUserId, int postId)
    {
        var post = await _db.Posts.FirstAsync(p => p.Id == postId);
        var user = await _db.Users.FirstAsync(u => u.Id == post.UserId);
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == post.UserId);

        var commentCount = await _db.PostComments.CountAsync(c => c.PostId == postId && !c.IsDeleted);
        var reactions = await BuildReactionSummaryAsync(postId);

        return new PostDto
        {
            Id = post.Id,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            IsOwner = currentUserId == post.UserId,
            CreatedAt = post.CreatedAt,
            Author = new PostAuthorDto
            {
                Id = user.Id,
                Username = user.Username,
                DisplayName = profile?.DisplayName,
                AvatarUrl = profile?.AvatarUrl
            },
            CommentCount = commentCount,
            Reactions = reactions
        };
    }

    private async Task<PostCommentDto> BuildCommentDtoAsync(int commentId)
    {
        var c = await _db.PostComments.FirstAsync(x => x.Id == commentId);
        var user = await _db.Users.FirstAsync(u => u.Id == c.UserId);
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == c.UserId);

        return new PostCommentDto
        {
            Id = c.Id,
            PostId = c.PostId,
            Content = c.Content,
            CreatedAt = c.CreatedAt,
            Author = new PostAuthorDto
            {
                Id = user.Id,
                Username = user.Username,
                DisplayName = profile?.DisplayName,
                AvatarUrl = profile?.AvatarUrl
            }
        };
    }

    private async Task<PostReactionSummaryDto> BuildReactionSummaryAsync(int postId)
    {
        var rows = await _db.PostReactions
            .Where(r => r.PostId == postId)
            .GroupBy(r => r.Emoji)
            .Select(g => new { Emoji = g.Key, Count = g.Count() })
            .ToListAsync();

        var dict = rows.ToDictionary(x => x.Emoji, x => x.Count);
        return new PostReactionSummaryDto
        {
            PostId = postId,
            Counts = dict
        };
    }

    private async Task EnsureFriendshipPairAsync(int userA, int userB)
    {
        var now = DateTime.UtcNow;

        if (!await _db.Friendships.AnyAsync(f => f.UserId == userA && f.FriendId == userB))
            _db.Friendships.Add(new Friendship { UserId = userA, FriendId = userB, CreatedAt = now });

        if (!await _db.Friendships.AnyAsync(f => f.UserId == userB && f.FriendId == userA))
            _db.Friendships.Add(new Friendship { UserId = userB, FriendId = userA, CreatedAt = now });
    }

    private async Task<FriendRequestDto> BuildFriendRequestDtoAsync(int requestId)
    {
        var fr = await _db.FriendRequests.FirstAsync(x => x.Id == requestId);
        var userIds = new[] { fr.FromUserId, fr.ToUserId };

        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => userIds.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        UserLiteDto? MapUser(int id)
        {
            if (!users.TryGetValue(id, out var u)) return null;
            profiles.TryGetValue(id, out var p);
            return new UserLiteDto { Id = u.Id, Username = u.Username, DisplayName = p?.DisplayName, AvatarUrl = p?.AvatarUrl };
        }

        return new FriendRequestDto
        {
            Id = fr.Id,
            FromUserId = fr.FromUserId,
            ToUserId = fr.ToUserId,
            Status = fr.Status,
            CreatedAt = fr.CreatedAt,
            RespondedAt = fr.RespondedAt,
            FromUser = MapUser(fr.FromUserId),
            ToUser = MapUser(fr.ToUserId)
        };
    }
}
