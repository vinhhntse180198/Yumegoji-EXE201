using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using backend.DTOs.Chat;
using backend.Models.Chat;
using backend.Models.Social;
using backend.Models.User;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace backend.Services.Chat;

public class ChatService : IChatService
{
    private const string PrivateRoomType = "private";
    private const string GroupRoomType = "group";
    private const string DirectRoomNamePrefix = "Direct: ";
    private readonly ApplicationDbContext _db;
    private readonly IChatRealtimePublisher _realtime;

    public ChatService(ApplicationDbContext db, IChatRealtimePublisher realtime)
    {
        _db = db;
        _realtime = realtime;
    }

    public IReadOnlyList<RoomCategoryDto> GetRoomCategories() => ChatRoomCatalog.Categories;

    public async Task<ChatRoomDto> GetOrCreateDirectRoomAsync(int currentUserId, int peerUserId)
    {
        if (currentUserId == peerUserId)
            throw new InvalidOperationException("Không thể tạo chat với chính mình.");

        var peer = await _db.Users.Where(u => u.Id == peerUserId && u.DeletedAt == null).FirstOrDefaultAsync();
        if (peer == null)
            throw new InvalidOperationException("Người dùng không tồn tại.");

        var existingRoomId = await GetDirectRoomIdBetweenAsync(currentUserId, peerUserId);
        if (existingRoomId.HasValue)
        {
            var room = await GetRoomByIdAsync(existingRoomId.Value, currentUserId);
            if (room != null) return room;
        }

        var now = DateTime.UtcNow;
        var roomName = $"{DirectRoomNamePrefix}{currentUserId}_{peerUserId}";
        var newRoom = new ChatRoom
        {
            Name = roomName,
            Type = PrivateRoomType,
            Slug = $"direct-{Math.Min(currentUserId, peerUserId)}-{Math.Max(currentUserId, peerUserId)}",
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.ChatRooms.Add(newRoom);
        await _db.SaveChangesAsync();

        _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = newRoom.Id, UserId = currentUserId, Role = "member", JoinedAt = now });
        _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = newRoom.Id, UserId = peerUserId, Role = "member", JoinedAt = now });
        await _db.SaveChangesAsync();

        return (await BuildRoomDtosAsync(new List<int> { newRoom.Id }, currentUserId)).FirstOrDefault()
            ?? MapToRoomDto(newRoom, null, null, 0);
    }

    public async Task<ChatRoomDto> GetOrCreateModeratorSupportRoomAsync(int learnerUserId)
    {
        if (learnerUserId <= 0)
            throw new InvalidOperationException("Không xác định được người dùng.");

        var me = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == learnerUserId && u.DeletedAt == null);
        if (me == null)
            throw new InvalidOperationException("Tài khoản không tồn tại.");

        var myRole = (me.Role ?? "").Trim().ToLowerInvariant();
        if (myRole is "moderator" or "admin")
            throw new InvalidOperationException("Tài khoản điều hành viên không dùng phòng hỗ trợ này — vào Chat để xử lý yêu cầu học viên.");

        var modId = await _db.Users.AsNoTracking()
            .Where(u => u.DeletedAt == null && !u.IsLocked && u.Role == "moderator")
            .OrderBy(u => u.Id)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        if (modId == 0)
        {
            modId = await _db.Users.AsNoTracking()
                .Where(u => u.DeletedAt == null && !u.IsLocked && u.Role == "admin")
                .OrderBy(u => u.Id)
                .Select(u => u.Id)
                .FirstOrDefaultAsync();
        }

        if (modId == 0)
            throw new InvalidOperationException(
                "Hiện chưa có tài khoản điều hành viên trong hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị.");

        return await GetOrCreateDirectRoomAsync(learnerUserId, modId);
    }

    public async Task<IEnumerable<ChatRoomDto>> GetPublicRoomsAsync(int currentUserId, string? type = "public", string? slug = null, int? levelId = null, int limit = 50)
    {
        var allowedTypes = new[] { "public", "level", "group" };
        var query = _db.ChatRooms.Where(r => r.IsActive && allowedTypes.Contains(r.Type));

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(r => r.Type == type);

        if (!string.IsNullOrWhiteSpace(slug))
            query = query.Where(r => r.Slug == slug);

        // Nhóm (group): chỉ show nhóm do chính user tạo (ẩn các demo ABC/XYZ cho tài khoản mới).
        if (!string.IsNullOrWhiteSpace(type) && type.Equals("group", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(r => r.CreatedBy == currentUserId);
        }

        // Nếu frontend không truyền levelId, tự suy ra từ user
        if (!levelId.HasValue)
        {
            var me = await _db.Users.FirstOrDefaultAsync(u => u.Id == currentUserId && u.DeletedAt == null);
            if (me?.LevelId != null)
                levelId = me.LevelId;
        }

        // Nếu đã biết levelId:
        // - Phòng chung (public, slug = 'common' hoặc levelId null)
        // - Phòng theo level (type = 'level', levelId khớp user)
        if (levelId.HasValue)
        {
            var lvl = levelId.Value;
            query = query.Where(r =>
                (r.Type == "public" && (r.Slug == "common" || r.LevelId == null)) ||
                (r.Type == "level" && r.LevelId == lvl));
        }
        else
        {
            // Chưa có level (chưa làm placement test): chỉ cho xem Phòng chung.
            query = query.Where(r => r.Type == "public" && (r.Slug == "common" || r.LevelId == null));
        }

        var rooms = await query
            .OrderByDescending(r => r.UpdatedAt)
            .Take(limit)
            .ToListAsync();

        return await BuildRoomDtosAsync(rooms.Select(r => r.Id).ToList(), currentUserId);
    }

    public async Task<IEnumerable<ChatRoomDto>> GetMyRoomsAsync(int currentUserId, string? type = null, int limit = 50)
    {
        var roomIds = await _db.ChatRoomMembers
            .Where(m => m.UserId == currentUserId)
            .Select(m => m.RoomId)
            .Distinct()
            .ToListAsync();

        var query = _db.ChatRooms.Where(r => roomIds.Contains(r.Id) && r.IsActive);
        if (!string.IsNullOrEmpty(type))
            query = query.Where(r => r.Type == type);

        // Ẩn các nhóm demo (type = 'group') mà user không phải là người tạo.
        // Chỉ hiển thị group khi CreatedBy == currentUserId.
        query = query.Where(r => r.Type != GroupRoomType || r.CreatedBy == currentUserId);

        var rooms = await query.OrderByDescending(r => r.UpdatedAt).Take(limit).ToListAsync();
        return await BuildRoomDtosAsync(rooms.Select(r => r.Id).ToList(), currentUserId);
    }

    public async Task<ChatRoomDto?> GetRoomByIdAsync(int roomId, int currentUserId)
    {
        var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (!isMember) return null;

        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null) return null;

        var list = await BuildRoomDtosAsync(new List<int> { roomId }, currentUserId);
        return list.FirstOrDefault();
    }

    public async Task<ChatRoomDto?> GetPublicRoomByIdAsync(int roomId, int currentUserId)
    {
        var room = await _db.ChatRooms.FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);
        if (room == null) return null;

        if (room.Type == PrivateRoomType)
            return await GetRoomByIdAsync(roomId, currentUserId);

        var list = await BuildRoomDtosAsync(new List<int> { roomId }, currentUserId);
        return list.FirstOrDefault();
    }

    public async Task<IEnumerable<ChatRoomMemberDto>> GetRoomMembersAsync(int roomId, int currentUserId, int limit = 200, bool includeOnlineForStaff = false)
    {
        var room = await _db.ChatRooms.FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);
        if (room == null) return Array.Empty<ChatRoomMemberDto>();

        if (room.Type == PrivateRoomType)
        {
            var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
            if (!isMember) return Array.Empty<ChatRoomMemberDto>();
        }

        var members = await _db.ChatRoomMembers
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.JoinedAt)
            .Take(limit)
            .ToListAsync();

        var userIds = members.Select(m => m.UserId).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => userIds.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        var list = members.Select(m =>
        {
            users.TryGetValue(m.UserId, out var u);
            profiles.TryGetValue(m.UserId, out var p);

            return new ChatRoomMemberDto
            {
                Id = m.Id,
                RoomId = m.RoomId,
                UserId = m.UserId,
                Role = m.Role,
                JoinedAt = m.JoinedAt,
                LastReadAt = m.LastReadAt,
                Username = u?.Username,
                DisplayName = p?.DisplayName,
                AvatarUrl = p?.AvatarUrl
            };
        }).ToList();

        if (includeOnlineForStaff && list.Count > 0)
        {
            var now = DateTime.UtcNow;
            var statusByUser = await _db.UserOnlineStatuses
                .Where(s => userIds.Contains(s.UserId))
                .ToDictionaryAsync(s => s.UserId);
            foreach (var dto in list)
            {
                if (statusByUser.TryGetValue(dto.UserId, out var st))
                {
                    dto.PresenceLastSeenAt = st.LastSeenAt;
                    dto.IsOnline = OnlinePresenceRules.IsEffectivelyOnline(st.Status, st.LastSeenAt, now);
                }
                else
                {
                    dto.IsOnline = false;
                }
            }
        }

        return list;
    }

    public async Task<RoomPresenceDto?> GetRoomPresenceAsync(int roomId, int currentUserId)
    {
        var room = await _db.ChatRooms.FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);
        if (room == null) return null;

        if (room.Type == PrivateRoomType)
        {
            var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
            if (!isMember) return null;
        }

        var memberIds = await _db.ChatRoomMembers.Where(m => m.RoomId == roomId).Select(m => m.UserId).ToListAsync();
        var presenceFreshSince = DateTime.UtcNow.AddSeconds(-OnlinePresenceRules.StaleAfterSeconds);
        var onlineStatuses = await _db.UserOnlineStatuses
            .Where(s =>
                memberIds.Contains(s.UserId)
                && s.Status.ToLower() == "online"
                && s.LastSeenAt >= presenceFreshSince)
            .Select(s => s.UserId)
            .ToListAsync();

        return new RoomPresenceDto
        {
            RoomId = roomId,
            MemberCount = memberIds.Count,
            OnlineCount = onlineStatuses.Count
        };
    }

    public async Task<ChatRoomDto> CreateRoomAsync(int currentUserId, CreateRoomRequest request)
    {
        var now = DateTime.UtcNow;
        int? maxMembers = request.MaxMembers;
        if (request.Type == GroupRoomType && !maxMembers.HasValue)
            maxMembers = 10;

        if (request.Type == GroupRoomType && request.InitialMemberIds is { Count: > 0 })
        {
            var unique = request.InitialMemberIds.Distinct().Where(id => id != currentUserId).ToList();
            var cap = maxMembers ?? 10;
            if (1 + unique.Count > cap)
                throw new InvalidOperationException("Vượt quá số thành viên tối đa cho nhóm.");

            foreach (var uid in unique)
            {
                var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == uid && x.DeletedAt == null);
                if (u == null)
                    throw new InvalidOperationException("Một số người dùng trong danh sách không tồn tại.");
                if (!await AreFriendsAsync(currentUserId, uid))
                    throw new InvalidOperationException("Chỉ có thể thêm bạn bè vào nhóm chat.");
            }
        }

        var room = new ChatRoom
        {
            Name = request.Name,
            Type = request.Type,
            Slug = request.Slug,
            LevelId = request.LevelId,
            Description = request.Description,
            AvatarUrl = request.AvatarUrl,
            MaxMembers = maxMembers,
            IsActive = true,
            CreatedBy = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.ChatRooms.Add(room);
        await _db.SaveChangesAsync();

        _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = room.Id, UserId = currentUserId, Role = "admin", JoinedAt = now });
        if (request.Type == GroupRoomType && request.InitialMemberIds is { Count: > 0 })
        {
            foreach (var uid in request.InitialMemberIds.Distinct().Where(id => id != currentUserId))
            {
                if (await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == room.Id && m.UserId == uid))
                    continue;
                _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = room.Id, UserId = uid, Role = "member", JoinedAt = now });
            }
        }

        await _db.SaveChangesAsync();

        var list = await BuildRoomDtosAsync(new List<int> { room.Id }, currentUserId);
        return list.FirstOrDefault() ?? MapToRoomDto(room, null, null, 0);
    }

    public async Task<ChatRoomDto?> UpdateRoomAsync(int roomId, int currentUserId, UpdateRoomRequest request)
    {
        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null) return null;

        var member = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (member == null) return null;
        if (member.Role != "admin" && room.CreatedBy != currentUserId)
            return null;

        if (request.Name != null) room.Name = request.Name;
        if (request.Description != null) room.Description = request.Description;
        if (request.AvatarUrl != null) room.AvatarUrl = request.AvatarUrl;
        if (request.MaxMembers.HasValue) room.MaxMembers = request.MaxMembers;
        if (request.IsActive.HasValue) room.IsActive = request.IsActive.Value;
        room.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetRoomByIdAsync(roomId, currentUserId);
    }

    public async Task<(bool Success, bool Forbidden)> DeleteRoomAsync(int roomId, int currentUserId)
    {
        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null) return (false, false);

        var member = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (member == null) return (false, false);
        if (room.Type == PrivateRoomType)
        {
            _db.ChatRoomMembers.Remove(member);
            await _db.SaveChangesAsync();
            return (true, false);
        }

        if (member.Role != "admin" && room.CreatedBy != currentUserId)
            return (false, true);

        // Nhóm chat: xóa hẳn khỏi DB (cascade members + messages). Phòng public/level: chỉ ẩn (seed hệ thống).
        if (string.Equals(room.Type, GroupRoomType, StringComparison.OrdinalIgnoreCase))
        {
            _db.ChatRooms.Remove(room);
        }
        else
        {
            room.IsActive = false;
            room.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return (true, false);
    }

    public async Task<bool> JoinRoomAsync(int roomId, int currentUserId)
    {
        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null || !room.IsActive) return false;
        if (room.Type == PrivateRoomType) return false;
        if (room.MaxMembers.HasValue)
        {
            var count = await _db.ChatRoomMembers.CountAsync(m => m.RoomId == roomId);
            if (count >= room.MaxMembers.Value) return false;
        }
        if (await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId))
            return true;

        _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = roomId, UserId = currentUserId, Role = "member", JoinedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LeaveRoomAsync(int roomId, int currentUserId)
    {
        var member = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (member == null) return false;
        _db.ChatRoomMembers.Remove(member);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> InviteMemberToRoomAsync(int roomId, int currentUserId, int targetUserId)
    {
        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null || !room.IsActive) return false;
        // Chỉ nhóm (nhóm riêng tối đa N người); không dùng invite cho phòng 1-1 (private 2 người).
        if (room.Type != GroupRoomType) return false;

        var inviter = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (inviter == null || inviter.Role != "admin") return false;

        if (await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == targetUserId))
            return true;

        if (!await AreFriendsAsync(currentUserId, targetUserId)) return false;

        if (room.MaxMembers.HasValue)
        {
            var count = await _db.ChatRoomMembers.CountAsync(m => m.RoomId == roomId);
            if (count >= room.MaxMembers.Value) return false;
        }

        _db.ChatRoomMembers.Add(new ChatRoomMember { RoomId = roomId, UserId = targetUserId, Role = "member", JoinedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveMemberFromRoomAsync(int roomId, int actorUserId, int targetUserId)
    {
        if (actorUserId == targetUserId)
            return false;

        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room == null || !room.IsActive || room.Type != GroupRoomType)
            return false;

        var actor = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == actorUserId);
        if (actor == null || actor.Role != "admin")
            return false;

        var target = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == targetUserId);
        if (target == null)
            return false;

        _db.ChatRoomMembers.Remove(target);
        await _db.SaveChangesAsync();
        await TryPublishAsync(() => _realtime.NotifyMemberRemovedAsync(roomId, targetUserId));
        return true;
    }

    public async Task<PagedMessagesResponse> GetMessagesAsync(int roomId, int currentUserId, string? cursor = null, int limit = 30, bool staffCanReadPublicWithoutMembership = false)
    {
        var room = await _db.ChatRooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == roomId && r.IsActive);
        if (room == null)
            return new PagedMessagesResponse();

        var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (!isMember)
        {
            var isPrivate = string.Equals(room.Type, PrivateRoomType, StringComparison.OrdinalIgnoreCase);
            if (!staffCanReadPublicWithoutMembership || isPrivate)
                return new PagedMessagesResponse();
        }

        var baseQuery = _db.Messages.Where(m => m.RoomId == roomId && !m.IsDeleted);
        if (!string.IsNullOrEmpty(cursor) && int.TryParse(cursor, out var cursorId))
            baseQuery = baseQuery.Where(m => m.Id < cursorId);
        var messages = await baseQuery.OrderByDescending(m => m.CreatedAt).Take(limit + 1).ToListAsync();
        var hasMore = messages.Count > limit;
        if (hasMore) messages.RemoveAt(messages.Count - 1);
        messages.Reverse();

        var userIds = messages.Select(m => m.UserId).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => userIds.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        var msgIds = messages.Select(m => m.Id).ToList();
        var reactionMap = await BuildReactionSummariesAsync(msgIds);

        var items = messages.Select(m =>
        {
            var dto = MapToMessageDto(m, users.GetValueOrDefault(m.UserId), profiles.GetValueOrDefault(m.UserId));
            reactionMap.TryGetValue(m.Id, out var rx);
            dto.Reactions = rx ?? new List<ReactionSummaryDto>();
            return dto;
        }).ToList();

        var nextCursor = hasMore && items.Count > 0 ? items.Last().Id.ToString() : null;
        return new PagedMessagesResponse { Items = items, NextCursor = nextCursor, HasMore = hasMore };
    }

    public async Task<SendMessageResult> SendMessageAsync(int roomId, int currentUserId, SendMessageRequest request)
    {
        var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (!isMember)
            throw new InvalidOperationException("Không phải thành viên phòng.");

        var msgType = (request.Type ?? "text").Trim();
        if (msgType.Length > 20)
            throw new InvalidOperationException("Trường type tối đa 20 ký tự (theo cột DB).");

        if (msgType == "text" && string.IsNullOrWhiteSpace(request.Content))
            throw new InvalidOperationException("Nội dung tin nhắn không được để trống.");

        // Client gửi replyToId: 0 hoặc âm → coi như không trả lời (tránh FK / tìm tin id 0)
        int? replyToId = request.ReplyToId is > 0 ? request.ReplyToId : null;

        if (replyToId.HasValue)
        {
            var reply = await _db.Messages.FirstOrDefaultAsync(m =>
                m.Id == replyToId.Value && m.RoomId == roomId && !m.IsDeleted);
            if (reply == null)
                throw new InvalidOperationException("Tin trả lời (replyToId) không tồn tại hoặc không thuộc phòng này.");
        }

        if (currentUserId <= 0)
            throw new InvalidOperationException("Không xác định được người gửi (JWT).");

        var now = DateTime.UtcNow;
        var (sanitizedContent, matches) = await SanitizeBySensitiveKeywordsAsync(request.Content ?? "");

        var msg = new Message
        {
            RoomId = roomId,
            UserId = currentUserId,
            Content = sanitizedContent,
            Type = msgType,
            ReplyToId = replyToId,
            CreatedAt = now,
            UpdatedAt = now
        };
        if (msg.UserId <= 0)
            throw new InvalidOperationException("userId người gửi không hợp lệ.");
        _db.Messages.Add(msg);
        var room = await _db.ChatRooms.FindAsync(roomId);
        if (room != null) room.UpdatedAt = now;
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(currentUserId);
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == currentUserId);
        var dto = MapToMessageDto(msg, user, profile);
        dto.Reactions = new List<ReactionSummaryDto>();

        var result = new SendMessageResult { Message = dto, SensitiveKeywordMatches = matches };
        await TryPublishAsync(() => _realtime.NotifyReceiveMessageAsync(roomId, dto));
        return result;
    }

    public async Task<MessageDto?> UpdateMessageAsync(int roomId, int messageId, int currentUserId, string content)
    {
        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && m.UserId == currentUserId && !m.IsDeleted);
        if (msg == null) return null;
        msg.Content = content;
        msg.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var user = await _db.Users.FindAsync(currentUserId);
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == currentUserId);
        var dto = MapToMessageDto(msg, user, profile);
        var map = await BuildReactionSummariesAsync(new List<int> { messageId });
        dto.Reactions = map.GetValueOrDefault(messageId) ?? new List<ReactionSummaryDto>();
        await TryPublishAsync(() => _realtime.NotifyMessageUpdatedAsync(roomId, dto));
        return dto;
    }

    public async Task<bool> DeleteMessageAsync(int roomId, int messageId, int currentUserId)
    {
        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && m.UserId == currentUserId);
        if (msg == null) return false;
        msg.IsDeleted = true;
        msg.DeletedAt = DateTime.UtcNow;
        msg.Content = null;
        msg.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await TryPublishAsync(() => _realtime.NotifyMessageDeletedAsync(roomId, messageId));
        return true;
    }

    public async Task<bool> DeleteMessageAsModeratorAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator)
    {
        if (!await CanModerateRoomAsync(roomId, currentUserId, isSiteModerator))
            return false;

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && !m.IsDeleted);
        if (msg == null) return false;
        msg.IsDeleted = true;
        msg.DeletedAt = DateTime.UtcNow;
        msg.Content = null;
        msg.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await TryPublishAsync(() => _realtime.NotifyMessageDeletedAsync(roomId, messageId));
        return true;
    }

    public async Task<MessageDto?> AddReactionAsync(int roomId, int messageId, int currentUserId, string emoji)
    {
        if (string.IsNullOrWhiteSpace(emoji)) return null;

        var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (!isMember) return null;

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && !m.IsDeleted);
        if (msg == null) return null;

        var exists = await _db.MessageReactions.AnyAsync(r => r.MessageId == messageId && r.UserId == currentUserId && r.Emoji == emoji);
        if (!exists)
        {
            _db.MessageReactions.Add(new MessageReaction
            {
                MessageId = messageId,
                UserId = currentUserId,
                Emoji = emoji.Trim(),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        var dtoReact = await ReloadMessageDtoAsync(messageId);
        if (dtoReact != null)
            await TryPublishAsync(() => _realtime.NotifyMessageUpdatedAsync(roomId, dtoReact));
        return dtoReact;
    }

    public async Task<bool> RemoveReactionAsync(int roomId, int messageId, int currentUserId, string emoji)
    {
        var isMember = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (!isMember) return false;

        var r = await _db.MessageReactions.FirstOrDefaultAsync(x =>
            x.MessageId == messageId && x.UserId == currentUserId && x.Emoji == emoji);
        if (r == null) return false;
        _db.MessageReactions.Remove(r);
        await _db.SaveChangesAsync();
        var dtoRm = await ReloadMessageDtoAsync(messageId);
        if (dtoRm != null)
            await TryPublishAsync(() => _realtime.NotifyMessageUpdatedAsync(roomId, dtoRm));
        return true;
    }

    public async Task<bool> PinMessageAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator)
    {
        if (!await CanModerateRoomAsync(roomId, currentUserId, isSiteModerator))
            return false;

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && !m.IsDeleted);
        if (msg == null) return false;
        msg.IsPinned = true;
        msg.PinnedBy = currentUserId;
        msg.PinnedAt = DateTime.UtcNow;
        msg.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var dtoPin = await ReloadMessageDtoAsync(messageId);
        if (dtoPin != null)
            await TryPublishAsync(() => _realtime.NotifyMessageUpdatedAsync(roomId, dtoPin));
        return true;
    }

    public async Task<bool> UnpinMessageAsync(int roomId, int messageId, int currentUserId, bool isSiteModerator)
    {
        if (!await CanModerateRoomAsync(roomId, currentUserId, isSiteModerator))
            return false;

        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId && m.RoomId == roomId && !m.IsDeleted);
        if (msg == null) return false;
        msg.IsPinned = false;
        msg.PinnedBy = null;
        msg.PinnedAt = null;
        msg.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var dtoUnpin = await ReloadMessageDtoAsync(messageId);
        if (dtoUnpin != null)
            await TryPublishAsync(() => _realtime.NotifyMessageUpdatedAsync(roomId, dtoUnpin));
        return true;
    }

    public async Task<bool> MarkRoomReadAsync(int roomId, int currentUserId, int? lastReadMessageId = null)
    {
        var member = await _db.ChatRoomMembers.FirstOrDefaultAsync(m => m.RoomId == roomId && m.UserId == currentUserId);
        if (member == null) return false;
        // Unread = tin có CreatedAt > LastReadAt. Dùng UtcNow; nếu có lastReadMessageId thì đảm bảo >= thời điểm tin (tránh lệch đồng hồ).
        var at = DateTime.UtcNow;
        if (lastReadMessageId.HasValue)
        {
            var msg = await _db.Messages.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == lastReadMessageId.Value && m.RoomId == roomId && !m.IsDeleted);
            if (msg != null && msg.CreatedAt > at)
                at = msg.CreatedAt;
        }
        member.LastReadAt = at;
        await _db.SaveChangesAsync();
        return true;
    }

    private Task<bool> AreFriendsAsync(int userId, int friendId) =>
        _db.Friendships.AnyAsync(f =>
            (f.UserId == userId && f.FriendId == friendId) ||
            (f.UserId == friendId && f.FriendId == userId));

    private static async Task TryPublishAsync(Func<Task> publish)
    {
        try
        {
            await publish();
        }
        catch
        {
            // Realtime không làm fail REST
        }
    }

    private async Task<bool> CanModerateRoomAsync(int roomId, int userId, bool isSiteModerator)
    {
        if (isSiteModerator) return true;
        var m = await _db.ChatRoomMembers.FirstOrDefaultAsync(x => x.RoomId == roomId && x.UserId == userId);
        return m != null && (m.Role == "moderator" || m.Role == "admin");
    }

    private async Task<MessageDto?> ReloadMessageDtoAsync(int messageId)
    {
        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId);
        if (msg == null) return null;
        var user = await _db.Users.FindAsync(msg.UserId);
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == msg.UserId);
        var dto = MapToMessageDto(msg, user, profile);
        var map = await BuildReactionSummariesAsync(new List<int> { messageId });
        dto.Reactions = map.GetValueOrDefault(messageId) ?? new List<ReactionSummaryDto>();
        return dto;
    }

    private async Task<Dictionary<int, List<ReactionSummaryDto>>> BuildReactionSummariesAsync(List<int> messageIds)
    {
        if (messageIds.Count == 0)
            return new Dictionary<int, List<ReactionSummaryDto>>();

        var rows = await _db.MessageReactions
            .Where(r => messageIds.Contains(r.MessageId))
            .ToListAsync();

        return rows
            .GroupBy(r => r.MessageId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.Emoji)
                    .Select(gg => new ReactionSummaryDto { Emoji = gg.Key, Count = gg.Count() })
                    .ToList());
    }

    private async Task<List<string>> ScanSensitiveKeywordsAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new List<string>();

        List<string> keywords;
        try
        {
            keywords = await _db.SensitiveKeywords
                .Where(k => k.IsActive)
                .Select(k => k.Keyword)
                .ToListAsync();
        }
        catch
        {
            // DB chưa migrate bảng sensitive_keywords hoặc lỗi kết nối — không chặn gửi tin.
            return new List<string>();
        }

        var lower = text.ToLowerInvariant();
        var hits = new List<string>();
        foreach (var kw in keywords)
        {
            if (string.IsNullOrWhiteSpace(kw)) continue;
            if (lower.Contains(kw.ToLowerInvariant()))
                hits.Add(kw);
        }
        return hits;
    }

    private async Task<(string Sanitized, List<string> Hits)> SanitizeBySensitiveKeywordsAsync(string text)
    {
        var hits = await ScanSensitiveKeywordsAsync(text);
        if (hits.Count == 0) return (text, hits);

        var sanitized = text;
        foreach (var kw in hits.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(kw)) continue;
            sanitized = Regex.Replace(
                sanitized,
                Regex.Escape(kw),
                "***",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }
        return (sanitized, hits);
    }

    private async Task<int?> GetDirectRoomIdBetweenAsync(int userId1, int userId2)
    {
        var roomIdsForUser1 = await _db.ChatRoomMembers.Where(m => m.UserId == userId1).Select(m => m.RoomId).ToListAsync();
        foreach (var rid in roomIdsForUser1)
        {
            var room = await _db.ChatRooms.FindAsync(rid);
            if (room?.Type != PrivateRoomType) continue;
            var memberCount = await _db.ChatRoomMembers.CountAsync(m => m.RoomId == rid);
            if (memberCount != 2) continue;
            var hasUser2 = await _db.ChatRoomMembers.AnyAsync(m => m.RoomId == rid && m.UserId == userId2);
            if (hasUser2) return rid;
        }
        return null;
    }

    private async Task<List<ChatRoomDto>> BuildRoomDtosAsync(List<int> roomIds, int currentUserId)
    {
        var rooms = await _db.ChatRooms.Where(r => roomIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id);
        var membersByRoom = await _db.ChatRoomMembers.Where(m => roomIds.Contains(m.RoomId)).ToListAsync();
        var userIds = membersByRoom.Select(m => m.UserId).Distinct().ToList();
        var users = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        var profiles = await _db.UserProfiles.Where(p => userIds.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId);

        var lastMessageByRoom = await _db.Messages
            .Where(m => roomIds.Contains(m.RoomId) && !m.IsDeleted)
            .GroupBy(m => m.RoomId)
            .Select(g => new { RoomId = g.Key, Last = g.OrderByDescending(x => x.CreatedAt).FirstOrDefault() })
            .ToDictionaryAsync(x => x.RoomId, x => x.Last);

        var myMemberByRoom = membersByRoom.Where(m => m.UserId == currentUserId).ToDictionary(m => m.RoomId);

        var messageCounts = roomIds.Count == 0
            ? new Dictionary<int, int>()
            : await _db.Messages
                .Where(m => roomIds.Contains(m.RoomId) && !m.IsDeleted)
                .GroupBy(m => m.RoomId)
                .Select(g => new { RoomId = g.Key, Cnt = g.Count() })
                .ToDictionaryAsync(x => x.RoomId, x => x.Cnt);

        var utcNow = DateTime.UtcNow;
        var presenceByUser = userIds.Count == 0
            ? new Dictionary<int, UserOnlineStatus>()
            : await _db.UserOnlineStatuses
                .Where(s => userIds.Contains(s.UserId))
                .ToDictionaryAsync(s => s.UserId);

        var result = new List<ChatRoomDto>();
        foreach (var rid in roomIds)
        {
            if (!rooms.TryGetValue(rid, out var room)) continue;
            var roomMembers = membersByRoom.Where(m => m.RoomId == rid).Select(m => m.UserId).ToList();
            ChatRoomPeerDto? peer = null;
            if (room.Type == PrivateRoomType && roomMembers.Count == 2)
            {
                var peerId = roomMembers.FirstOrDefault(id => id != currentUserId);
                if (peerId != 0 && users.TryGetValue(peerId, out var peerUser))
                {
                    var peerOnline = presenceByUser.TryGetValue(peerId, out var peerPr) &&
                        OnlinePresenceRules.IsEffectivelyOnline(peerPr.Status, peerPr.LastSeenAt, utcNow);
                    peer = new ChatRoomPeerDto
                    {
                        Id = peerUser.Id,
                        Username = peerUser.Username,
                        DisplayName = profiles.GetValueOrDefault(peerId)?.DisplayName,
                        AvatarUrl = profiles.GetValueOrDefault(peerId)?.AvatarUrl,
                        IsOnline = peerOnline
                    };
                }
            }
            Message? lastMsg = lastMessageByRoom.GetValueOrDefault(rid);
            MessageDto? lastDto = null;
            if (lastMsg != null)
            {
                var u = users.GetValueOrDefault(lastMsg.UserId);
                var p = profiles.GetValueOrDefault(lastMsg.UserId);
                lastDto = MapToMessageDto(lastMsg, u, p);
                lastDto.Reactions = new List<ReactionSummaryDto>();
            }
            myMemberByRoom.TryGetValue(rid, out var myMem);
            var unread = 0;
            if (myMem?.LastReadAt != null && lastMsg != null && lastMsg.CreatedAt > myMem.LastReadAt)
                unread = await _db.Messages.CountAsync(m => m.RoomId == rid && !m.IsDeleted && m.CreatedAt > myMem.LastReadAt);
            else if (myMem?.LastReadAt == null && lastMsg != null)
                unread = await _db.Messages.CountAsync(m => m.RoomId == rid && !m.IsDeleted);

            var msgTotal = messageCounts.GetValueOrDefault(rid);
            var onlineInRoom = roomMembers.Count(uid =>
                presenceByUser.TryGetValue(uid, out var pr) &&
                OnlinePresenceRules.IsEffectivelyOnline(pr.Status, pr.LastSeenAt, utcNow));

            result.Add(MapToRoomDto(room, peer, lastDto, unread, myMem?.Role, msgTotal, onlineInRoom));
        }
        return result;
    }

    private static ChatRoomDto MapToRoomDto(
        ChatRoom room,
        ChatRoomPeerDto? peer,
        MessageDto? lastMessage,
        int unreadCount,
        string? myRole = null,
        int messageCount = 0,
        int onlineMemberCount = 0)
    {
        return new ChatRoomDto
        {
            Id = room.Id,
            Name = room.Name,
            Slug = room.Slug,
            Type = room.Type,
            LevelId = room.LevelId,
            Description = room.Description,
            AvatarUrl = room.AvatarUrl,
            MaxMembers = room.MaxMembers,
            IsActive = room.IsActive,
            CreatedBy = room.CreatedBy,
            CreatedAt = room.CreatedAt,
            UpdatedAt = room.UpdatedAt,
            PeerUser = peer,
            LastMessage = lastMessage,
            UnreadCount = unreadCount,
            MessageCount = messageCount,
            OnlineMemberCount = onlineMemberCount,
            MyRole = myRole
        };
    }

    private static MessageDto MapToMessageDto(Message m, User? user, UserProfile? profile)
    {
        return new MessageDto
        {
            Id = m.Id,
            RoomId = m.RoomId,
            UserId = m.UserId,
            SenderUsername = user?.Username,
            SenderDisplayName = profile?.DisplayName,
            SenderAvatarUrl = profile?.AvatarUrl,
            Content = m.Content,
            Type = m.Type,
            ReplyToId = m.ReplyToId,
            IsPinned = m.IsPinned,
            PinnedBy = m.PinnedBy,
            PinnedAt = m.PinnedAt,
            IsDeleted = m.IsDeleted,
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt,
            Reactions = new List<ReactionSummaryDto>()
        };
    }
}
