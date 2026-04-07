using backend.DTOs.Chatbot;

namespace backend.Services.Chatbot;

public interface ISupportChatbotService
{
    Task<GuestChatbotResponse> ReplyGuestAsync(string message, CancellationToken cancellationToken = default);
}
