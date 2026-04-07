namespace backend.DTOs.Chatbot;

/// <summary>Tin nhắn từ khách (hoặc user đã đăng nhập dùng chatbot) — tách khỏi module AI sinh bài.</summary>
public class GuestChatbotRequest
{
    public string? Message { get; set; }
}

/// <summary>Phản hồi chatbot.</summary>
public class GuestChatbotResponse
{
    public string Reply { get; set; } = "";
    /// <summary>llm (OpenAI/Ollama tương thích) | template (câu có sẵn)</summary>
    public string Source { get; set; } = "template";
}
