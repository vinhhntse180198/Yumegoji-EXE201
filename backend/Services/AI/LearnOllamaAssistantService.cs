using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using backend.DTOs.Learning;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services.AI;

public class LearnOllamaAssistantService : ILearnOllamaAssistantService
{
    private const int MaxMessages = 24;
    private const int MaxContentLength = 65000;
    private const int MaxImages = 4;
    private const int MaxImageBase64Length = 2_500_000;

    private static readonly string SystemPrompt =
        "Bạn là \"AI dùm tôi\" — trợ lý học tiếng Nhật trong ứng dụng Yumegoji. " +
        "Trả lời bằng tiếng Việt (trừ khi người dùng yêu cầu ví dụ tiếng Nhật). " +
        "Giải thích rõ ràng, ngắn gọn khi có thể; nếu có ảnh chụp bài tập, tài liệu hoặc kanji, hãy đọc và phân tích nội dung. " +
        "Không bịa đặt nguồn; nếu không đọc được ảnh, hãy nói thẳng.";

    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LearnOllamaAssistantService> _logger;

    public LearnOllamaAssistantService(
        IHttpClientFactory httpFactory,
        IConfiguration configuration,
        ILogger<LearnOllamaAssistantService> logger)
    {
        _httpFactory = httpFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LearnAiChatResponse> ChatAsync(LearnAiChatRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Messages == null || request.Messages.Count == 0)
            throw new ArgumentException("Cần ít nhất một tin nhắn.");

        if (request.Messages.Count > MaxMessages)
            throw new ArgumentException($"Tối đa {MaxMessages} tin nhắn mỗi lần gửi.");

        foreach (var m in request.Messages)
        {
            if (string.IsNullOrWhiteSpace(m.Role) || string.IsNullOrWhiteSpace(m.Content))
                throw new ArgumentException("Mỗi tin nhắn cần role và nội dung.");
            if (m.Content.Length > MaxContentLength)
                throw new ArgumentException($"Nội dung một tin nhắn tối đa {MaxContentLength} ký tự.");
        }

        var images = request.ImagesBase64 ?? new List<string>();
        if (images.Count > MaxImages)
            throw new ArgumentException($"Tối đa {MaxImages} ảnh mỗi lần.");

        foreach (var img in images)
        {
            if (string.IsNullOrWhiteSpace(img) || img.Length > MaxImageBase64Length)
                throw new ArgumentException("Ảnh base64 không hợp lệ hoặc quá lớn.");
        }

        var baseUrl = (_configuration["Ollama:BaseUrl"] ?? "http://127.0.0.1:11434").TrimEnd('/');
        var textModel = _configuration["Ollama:ChatModel"] ?? "llama3.2";
        var visionModel = _configuration["Ollama:VisionModel"] ?? textModel;
        var model = images.Count > 0 ? visionModel : textModel;

        var ollamaMessages = new List<Dictionary<string, object?>>
        {
            new()
            {
                ["role"] = "system",
                ["content"] = SystemPrompt
            }
        };

        var lastUserIndex = -1;
        for (var i = request.Messages.Count - 1; i >= 0; i--)
        {
            if (string.Equals(request.Messages[i].Role, "user", StringComparison.OrdinalIgnoreCase))
            {
                lastUserIndex = i;
                break;
            }
        }

        for (var i = 0; i < request.Messages.Count; i++)
        {
            var m = request.Messages[i];
            var rl = m.Role.ToLowerInvariant();
            var role = rl is "user" or "assistant" or "system" ? rl : "user";
            if (role == "system")
                continue;

            if (i == lastUserIndex && role == "user" && images.Count > 0)
            {
                ollamaMessages.Add(new Dictionary<string, object?>
                {
                    ["role"] = "user",
                    ["content"] = m.Content.Trim(),
                    ["images"] = images.Select(StripDataUrlPrefix).ToList()
                });
            }
            else
            {
                ollamaMessages.Add(new Dictionary<string, object?>
                {
                    ["role"] = role,
                    ["content"] = m.Content.Trim()
                });
            }
        }

        var payload = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["stream"] = false,
            ["messages"] = ollamaMessages
        };

        var client = _httpFactory.CreateClient(nameof(LearnOllamaAssistantService));
        using var content = new StringContent(
            JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
            Encoding.UTF8,
            "application/json");

        HttpResponseMessage resp;
        try
        {
            resp = await client.PostAsync($"{baseUrl}/api/chat", content, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không kết nối được Ollama tại {BaseUrl}", baseUrl);
            throw new InvalidOperationException(
                "Không gọi được Ollama. Hãy chạy `ollama serve` và kiểm tra Ollama:BaseUrl trong appsettings.", ex);
        }

        using (resp)
        {
            var body = await resp.Content.ReadAsStringAsync(cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Ollama HTTP {Status}: {Body}", (int)resp.StatusCode, body.Length > 500 ? body[..500] : body);
                throw new InvalidOperationException(
                    resp.StatusCode == System.Net.HttpStatusCode.NotFound
                        ? $"Model '{model}' có thể chưa được tải. Chạy: ollama pull {model}"
                        : "Ollama trả lỗi. Kiểm tra model trong cấu hình Ollama:ChatModel / Ollama:VisionModel.");
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var messageText = root.TryGetProperty("message", out var msgEl) && msgEl.TryGetProperty("content", out var cEl)
                ? cEl.GetString() ?? ""
                : "";

            return new LearnAiChatResponse
            {
                Message = string.IsNullOrWhiteSpace(messageText) ? "(Không có nội dung trả về)" : messageText.Trim(),
                Model = model
            };
        }
    }

    private static string StripDataUrlPrefix(string raw)
    {
        var s = raw.Trim();
        var idx = s.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
        return idx >= 0 ? s[(idx + 7)..] : s;
    }
}
