using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend.DTOs.Chatbot;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services.Chatbot;

public class SupportChatbotService : ISupportChatbotService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupportChatbotService> _logger;

    public SupportChatbotService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SupportChatbotService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GuestChatbotResponse> ReplyGuestAsync(string message, CancellationToken cancellationToken = default)
    {
        var trimmed = message?.Trim() ?? "";
        if (trimmed.Length == 0)
            return new GuestChatbotResponse { Reply = "Xin hãy nhập câu hỏi.", Source = "template" };

        var template = TryTemplateReply(trimmed);
        if (template != null)
            return new GuestChatbotResponse { Reply = template, Source = "template" };

        var apiKey = _configuration["OpenAI:ApiKey"]?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            return new GuestChatbotResponse
            {
                Reply = DefaultNoLlmReply(),
                Source = "template"
            };
        }

        try
        {
            var llm = await CallLlmAsync(trimmed, cancellationToken);
            return new GuestChatbotResponse { Reply = llm, Source = "llm" };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chatbot LLM failed, fallback template");
            return new GuestChatbotResponse { Reply = DefaultNoLlmReply(), Source = "template" };
        }
    }

    private static string? TryTemplateReply(string lower)
    {
        var t = lower.ToLowerInvariant();
        if (t.Contains("xin chào") || t == "hi" || t == "hello" || t == "chào")
            return "Chào bạn! Mình là chatbot YumeGo-ji. Bạn có thể hỏi về lộ trình JLPT, cách bắt đầu học N5, hoặc các tính năng trên web. Đăng ký tài khoản miễn phí để học bài chi tiết và chat với điều hành viên nhé!";
        if (t.Contains("đăng ký") || t.Contains("dang ky"))
            return "Bạn có thể đăng ký tài khoản miễn phí từ trang chủ — sau khi có tài khoản sẽ học bài, làm quiz và chat với điều hành viên.";
        if (t.Contains("moderator") || t.Contains("điều hành") || t.Contains("dieu hanh"))
            return "Khách (chưa đăng nhập) chỉ chat được với chatbot ở đây. Để nói chuyện trực tiếp với điều hành viên, hãy đăng ký/đăng nhập, mở Dashboard và chọn \"Mở chat với điều hành viên\".";
        return null;
    }

    private static string DefaultNoLlmReply() =>
        "Hiện chưa cấu hình AI (OpenAI:ApiKey). Bạn vẫn có thể xem lộ trình và đăng ký trên trang chủ; hoặc liên hệ điều hành viên sau khi đăng nhập.";

    private async Task<string> CallLlmAsync(string userMessage, CancellationToken cancellationToken)
    {
        var model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini";
        var baseUrl = (_configuration["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
        var key = _configuration["OpenAI:ApiKey"]!.Trim();

        var systemPrompt =
            "Bạn là chatbot hỗ trợ YumeGo-ji cho khách (chưa đăng ký tài khoản) về học tiếng Nhật và nền tảng. " +
            "Trả lời ngắn gọn, thân thiện, tiếng Việt. Không bịa đặt chính sách cụ thể nếu không chắc — gợi ý đăng ký hoặc hỏi điều hành viên.";

        var client = _httpClientFactory.CreateClient(nameof(SupportChatbotService));
        client.Timeout = TimeSpan.FromSeconds(90);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);

        var payload = new
        {
            model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userMessage }
            }
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        var resp = await client.SendAsync(req, cancellationToken);
        var respBody = await resp.Content.ReadAsStringAsync(cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Chatbot OpenAI-compatible error {Status}: {Body}", resp.StatusCode, respBody);
            throw new InvalidOperationException($"LLM HTTP {(int)resp.StatusCode}");
        }

        using var doc = JsonDocument.Parse(respBody);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("Empty LLM content");

        return content.Trim();
    }
}
