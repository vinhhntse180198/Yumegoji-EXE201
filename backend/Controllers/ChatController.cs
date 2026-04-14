using System;
using System.Globalization;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Chat;
using backend.Services.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>API Mô-đun 5: Trò chuyện – Phòng chat, chat 1vs1, nhóm, tin nhắn, reaction, ghim (theo DB).</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthPolicies.Member)]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IWebHostEnvironment _env;

    public ChatController(IChatService chatService, IWebHostEnvironment env)
    {
        _chatService = chatService;
        _env = env;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out var id) ? id : 0;
    }

    private bool IsSiteModerator() =>
        User.IsInRole(AppRoles.Admin) || User.IsInRole(AppRoles.Moderator);

    /// <summary>Đặc tả phòng 5.1 (slug/level seed trong DB).</summary>
    [HttpGet("room-catalog")]
    public ActionResult GetRoomCatalog()
    {
        return Ok(_chatService.GetRoomCategories());
    }

    [HttpPost("direct")]
    public async Task<IActionResult> GetOrCreateDirect([FromBody] GetOrCreateDirectRequest request)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        try
        {
            var room = await _chatService.GetOrCreateDirectRoomAsync(currentUserId, request.PeerUserId);
            return Ok(room);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Học viên mở chat 1-1 hỗ trợ với moderator (hoặc admin nếu chưa có moderator) — widget YumeGo-ji.</summary>
    [HttpPost("support/moderator")]
    public async Task<IActionResult> CreateModeratorSupportRoom()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        try
        {
            var room = await _chatService.GetOrCreateModeratorSupportRoomAsync(currentUserId);
            return Ok(room);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetMyRooms([FromQuery] string? type = null, [FromQuery] int limit = 50)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var rooms = await _chatService.GetMyRoomsAsync(currentUserId, type, limit);
        return Ok(rooms);
    }

    /// <summary>Phòng công khai (public/level/group); lọc slug, levelId (N5/N4/N3).</summary>
    [HttpGet("public-rooms")]
    public async Task<IActionResult> GetPublicRooms(
        [FromQuery] string? type = "public",
        [FromQuery] string? slug = null,
        [FromQuery] int? levelId = null,
        [FromQuery] int limit = 50)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var rooms = await _chatService.GetPublicRoomsAsync(currentUserId, type, slug, levelId, limit);
        return Ok(rooms);
    }

    [HttpGet("public-rooms/{roomId:int}")]
    public async Task<IActionResult> GetPublicRoom(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var room = await _chatService.GetPublicRoomByIdAsync(roomId, currentUserId);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpGet("rooms/{roomId:int}/presence")]
    public async Task<IActionResult> GetPresence(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var p = await _chatService.GetRoomPresenceAsync(roomId, currentUserId);
        if (p == null) return NotFound();
        return Ok(p);
    }

    [HttpGet("rooms/{roomId:int}/members")]
    public async Task<IActionResult> GetRoomMembers(int roomId, [FromQuery] int limit = 200, [FromQuery] bool includeOnline = false)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var withOnline = includeOnline && IsSiteModerator();
        var members = await _chatService.GetRoomMembersAsync(roomId, currentUserId, limit, withOnline);
        return Ok(members);
    }

    [HttpGet("rooms/{roomId:int}")]
    public async Task<IActionResult> GetRoom(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var room = await _chatService.GetRoomByIdAsync(roomId, currentUserId);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        try
        {
            var room = await _chatService.CreateRoomAsync(currentUserId, request);
            return CreatedAtAction(nameof(GetRoom), new { roomId = room.Id }, room);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("rooms/{roomId:int}")]
    public async Task<IActionResult> UpdateRoom(int roomId, [FromBody] UpdateRoomRequest request)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var room = await _chatService.UpdateRoomAsync(roomId, currentUserId, request);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpDelete("rooms/{roomId:int}")]
    public async Task<IActionResult> DeleteRoom(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var (ok, forbidden) = await _chatService.DeleteRoomAsync(roomId, currentUserId);
        if (forbidden)
        {
            return StatusCode(403, new { message = "Chỉ admin hoặc người tạo nhóm mới có thể xóa nhóm." });
        }

        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("rooms/{roomId:int}/join")]
    public async Task<IActionResult> JoinRoom(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.JoinRoomAsync(roomId, currentUserId);
        if (!ok) return BadRequest(new { message = "Không thể tham gia phòng." });
        return NoContent();
    }

    [HttpPost("rooms/{roomId:int}/leave")]
    public async Task<IActionResult> LeaveRoom(int roomId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.LeaveRoomAsync(roomId, currentUserId);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>Mời bạn bè vào nhóm (group/private); max_members theo phòng.</summary>
    [HttpPost("rooms/{roomId:int}/invite")]
    public async Task<IActionResult> InviteMember(int roomId, [FromBody] InviteMemberRequest body)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.InviteMemberToRoomAsync(roomId, currentUserId, body.TargetUserId);
        if (!ok) return BadRequest(new { message = "Không thể mời (phải là admin phòng, bạn bè, và chưa đủ số tối đa)." });
        return NoContent();
    }

    /// <summary>Admin nhóm kick thành viên (type=group). Tự rời dùng POST .../leave.</summary>
    [HttpDelete("rooms/{roomId:int}/members/{userId:int}")]
    public async Task<IActionResult> RemoveMember(int roomId, int userId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.RemoveMemberFromRoomAsync(roomId, currentUserId, userId);
        if (!ok) return BadRequest(new { message = "Không thể xóa thành viên (chỉ admin nhóm, không áp dụng chat 1-1)." });
        return NoContent();
    }

    [HttpGet("rooms/{roomId:int}/messages")]
    public async Task<IActionResult> GetMessages(int roomId, [FromQuery] string? cursor = null, [FromQuery] string? limit = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        // Bind limit dạng string — tránh 400 khi query lỗi (limit=, limit=abc) với int trực tiếp
        var lim = 30;
        if (!string.IsNullOrWhiteSpace(limit) &&
            int.TryParse(limit, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            lim = Math.Clamp(parsed, 1, 100);
        var result = await _chatService.GetMessagesAsync(roomId, currentUserId, cursor, lim, IsSiteModerator());
        return Ok(result);
    }

    /// <summary>Gửi tin nhắn; trả về cảnh báo từ khóa nhạy cảm (sensitive_keywords).</summary>
    [HttpPost("rooms/{roomId:int}/messages")]
    public async Task<IActionResult> SendMessage(int roomId, [FromBody] SendMessageRequest? request)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        if (request == null)
            return BadRequest(new { message = "Thiếu body JSON (content, type, replyToId)." });
        // Swagger mặc định type = "string" (placeholder) — ép về text
        if (string.IsNullOrWhiteSpace(request.Type) ||
            request.Type.Equals("string", StringComparison.OrdinalIgnoreCase))
            request.Type = "text";
        try
        {
            var result = await _chatService.SendMessageAsync(roomId, currentUserId, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new
            {
                message = "Không lưu được tin nhắn (replyToId/FK hoặc ràng buộc DB). Kiểm tra đã join phòng và migration.",
                detail = _env.IsDevelopment() ? ex.InnerException?.Message ?? ex.Message : null
            });
        }
    }

    [HttpPut("rooms/{roomId:int}/messages/{messageId:int}")]
    public async Task<IActionResult> UpdateMessage(int roomId, int messageId, [FromBody] UpdateMessageRequest body)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var msg = await _chatService.UpdateMessageAsync(roomId, messageId, currentUserId, body.Content);
        if (msg == null) return NotFound();
        return Ok(msg);
    }

    [HttpDelete("rooms/{roomId:int}/messages/{messageId:int}")]
    public async Task<IActionResult> DeleteMessage(int roomId, int messageId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.DeleteMessageAsync(roomId, messageId, currentUserId);
        if (!ok) return NotFound();
        return NoContent();
    }

    /// <summary>Moderator phòng hoặc moderator/admin hệ thống xóa tin (kiểm duyệt).</summary>
    [HttpDelete("rooms/{roomId:int}/messages/{messageId:int}/moderate")]
    public async Task<IActionResult> DeleteMessageAsModerator(int roomId, int messageId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.DeleteMessageAsModeratorAsync(roomId, messageId, currentUserId, IsSiteModerator());
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("rooms/{roomId:int}/messages/{messageId:int}/reactions")]
    public async Task<IActionResult> AddReaction(int roomId, int messageId, [FromBody] ReactionBody body)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var msg = await _chatService.AddReactionAsync(roomId, messageId, currentUserId, body.Emoji);
        if (msg == null) return NotFound();
        return Ok(msg);
    }

    [HttpDelete("rooms/{roomId:int}/messages/{messageId:int}/reactions")]
    public async Task<IActionResult> RemoveReaction(int roomId, int messageId, [FromQuery] string emoji)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.RemoveReactionAsync(roomId, messageId, currentUserId, emoji);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("rooms/{roomId:int}/messages/{messageId:int}/pin")]
    public async Task<IActionResult> PinMessage(int roomId, int messageId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.PinMessageAsync(roomId, messageId, currentUserId, IsSiteModerator());
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpDelete("rooms/{roomId:int}/messages/{messageId:int}/pin")]
    public async Task<IActionResult> UnpinMessage(int roomId, int messageId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.UnpinMessageAsync(roomId, messageId, currentUserId, IsSiteModerator());
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPost("rooms/{roomId:int}/read")]
    public async Task<IActionResult> MarkRead(int roomId, [FromBody] MarkReadRequest? body = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == 0) return Unauthorized();
        var ok = await _chatService.MarkRoomReadAsync(roomId, currentUserId, body?.LastReadMessageId);
        if (!ok) return NotFound();
        return NoContent();
    }
}
