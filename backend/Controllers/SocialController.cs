using System;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Social;
using backend.Services.Social;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>API Mô-đun 6: Xã hội – Kết bạn, hồ sơ, thông báo.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.Member)]
public class SocialController : ControllerBase
{
    private readonly ISocialService _socialService;

    public SocialController(ISocialService socialService)
    {
        _socialService = socialService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }

    // ---------- Posts / Newsfeed ----------

    /// <summary>Tạo bài đăng mới (text + imageUrl).</summary>
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var post = await _socialService.CreatePostAsync(userId, body);
        return Ok(post);
    }

    /// <summary>Xóa bài đăng (chỉ chủ bài).</summary>
    [HttpDelete("posts/{postId:int}")]
    public async Task<IActionResult> DeletePost(int postId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.DeletePostAsync(userId, postId);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>Feed bài đăng (public, mới nhất trước).</summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetFeed([FromQuery] int limit = 20, [FromQuery] int? beforePostId = null)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetFeedAsync(userId, limit, beforePostId);
        return Ok(items);
    }

    /// <summary>Thêm bình luận vào bài đăng.</summary>
    [HttpPost("posts/{postId:int}/comments")]
    public async Task<IActionResult> AddComment(int postId, [FromBody] CreateCommentRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        try
        {
            var dto = await _socialService.AddCommentAsync(userId, postId, body);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Lấy danh sách bình luận của bài đăng.</summary>
    [HttpGet("posts/{postId:int}/comments")]
    public async Task<IActionResult> GetComments(int postId, [FromQuery] int limit = 50)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetCommentsAsync(userId, postId, limit);
        return Ok(items);
    }

    /// <summary>Toggle reaction (emoji) cho bài đăng.</summary>
    [HttpPost("posts/{postId:int}/reactions/toggle")]
    public async Task<IActionResult> ToggleReaction(int postId, [FromBody] PostReactionRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        if (string.IsNullOrWhiteSpace(body.Emoji))
            return BadRequest(new { message = "Emoji không hợp lệ." });
        try
        {
            var summary = await _socialService.ToggleReactionAsync(userId, postId, body.Emoji);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ---------- Friend Requests ----------
    // ---------- Friend Requests ----------

    /// <summary>Gửi lời mời kết bạn.</summary>
    [HttpPost("friend-requests")]
    public async Task<IActionResult> SendFriendRequest([FromBody] SendFriendRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        try
        {
            var dto = await _socialService.SendFriendRequestAsync(userId, body.ToUserId);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Danh sách lời mời đến (incoming).</summary>
    [HttpGet("friend-requests/incoming")]
    public async Task<IActionResult> GetIncoming()
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetIncomingRequestsAsync(userId);
        return Ok(items);
    }

    /// <summary>Danh sách lời mời đã gửi (outgoing).</summary>
    [HttpGet("friend-requests/outgoing")]
    public async Task<IActionResult> GetOutgoing()
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetOutgoingRequestsAsync(userId);
        return Ok(items);
    }

    /// <summary>Hủy lời mời (chỉ người gửi, khi pending).</summary>
    [HttpDelete("friend-requests/{requestId:int}")]
    public async Task<IActionResult> Cancel(int requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.CancelFriendRequestAsync(userId, requestId);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>Chấp nhận lời mời (chỉ người nhận).</summary>
    [HttpPost("friend-requests/{requestId:int}/accept")]
    public async Task<IActionResult> Accept(int requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        try
        {
            var dto = await _socialService.AcceptFriendRequestAsync(userId, requestId);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Từ chối lời mời (chỉ người nhận).</summary>
    [HttpPost("friend-requests/{requestId:int}/reject")]
    public async Task<IActionResult> Reject(int requestId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.RejectFriendRequestAsync(userId, requestId);
        if (!ok) return NotFound();
        return NoContent();
    }

    // ---------- Friends ----------

    /// <summary>Danh sách bạn bè.</summary>
    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends()
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetFriendsAsync(userId);
        return Ok(items);
    }

    /// <summary>Hủy kết bạn.</summary>
    [HttpDelete("friends/{friendId:int}")]
    public async Task<IActionResult> Unfriend(int friendId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.UnfriendAsync(userId, friendId);
        if (!ok) return NotFound();
        return NoContent();
    }

    // ---------- Block ----------

    /// <summary>Chặn người dùng.</summary>
    [HttpPost("blocks")]
    public async Task<IActionResult> Block([FromBody] BlockUserRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.BlockUserAsync(userId, body.BlockedUserId);
        if (!ok) return BadRequest(new { message = "Không thể chặn người dùng." });
        return NoContent();
    }

    /// <summary>Bỏ chặn người dùng.</summary>
    [HttpDelete("blocks/{blockedUserId:int}")]
    public async Task<IActionResult> Unblock(int blockedUserId)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var ok = await _socialService.UnblockUserAsync(userId, blockedUserId);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>Danh sách người đã chặn.</summary>
    [HttpGet("blocks")]
    public async Task<IActionResult> GetBlocks()
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetBlockedUsersAsync(userId);
        return Ok(items);
    }

    // ---------- Tìm kiếm / gợi ý / presence (5.3) ----------

    /// <summary>Tìm kiếm người dùng theo username hoặc display_name.</summary>
    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int limit = 20)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        if (string.IsNullOrWhiteSpace(q) || q.Length < 1)
            return BadRequest(new { message = "Tham số q không hợp lệ." });
        var items = await _socialService.SearchUsersAsync(userId, q, limit);
        return Ok(items);
    }

    /// <summary>Gợi ý kết bạn cùng trình độ (users.level_id).</summary>
    [HttpGet("friends/suggestions")]
    public async Task<IActionResult> FriendSuggestions([FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var items = await _socialService.GetFriendSuggestionsAsync(userId, limit);
        return Ok(items);
    }

    /// <summary>Cập nhật online/offline (bảng user_online_status). Gọi định kỳ từ client.</summary>
    [HttpPost("presence")]
    public async Task<IActionResult> UpdatePresence([FromBody] PresenceUpdateRequest body)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();
        var status = string.IsNullOrWhiteSpace(body.Status) ? "online" : body.Status.Trim();
        await _socialService.UpdatePresenceAsync(userId, status);
        return NoContent();
    }
}
