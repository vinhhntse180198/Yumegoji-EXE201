using backend.DTOs.Chatbot;
using backend.Services.Chatbot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Chatbot hỗ trợ — tách biệt API AI sinh bài / import tài liệu.</summary>
[ApiController]
[Route("api/[controller]")]
public class ChatbotController : ControllerBase
{
    private readonly ISupportChatbotService _chatbot;

    public ChatbotController(ISupportChatbotService chatbot)
    {
        _chatbot = chatbot;
    }

    /// <summary>Chatbot cho khách hoặc user (không bắt JWT). Có thể bổ sung rate limit sau.</summary>
    [HttpPost("guest")]
    [AllowAnonymous]
    public async Task<ActionResult<GuestChatbotResponse>> Guest(
        [FromBody] GuestChatbotRequest? body,
        CancellationToken cancellationToken)
    {
        if (body?.Message == null)
            return BadRequest(new { message = "Thiếu nội dung tin nhắn." });

        var res = await _chatbot.ReplyGuestAsync(body.Message.Trim(), cancellationToken);
        return Ok(res);
    }
}
