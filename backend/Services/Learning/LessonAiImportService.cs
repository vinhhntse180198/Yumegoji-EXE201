using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using backend.DTOs.Learning;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services.Learning;

public class LessonAiImportService : ILessonAiImportService
{
    private const int MaxSourceChars = 48_000;
    /// <summary>Xem trước văn bản đã gửi AI (UI moderator) — không cắt quá ngắn.</summary>
    private const int AiResponseExtractPreviewChars = 12_000;

    private static readonly JsonSerializerOptions DraftJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LessonAiImportService> _logger;

    public LessonAiImportService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<LessonAiImportService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GenerateLessonDraftResponseDto> GenerateDraftAsync(
        string plainText,
        string? lessonKind = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = plainText?.Trim() ?? "";
        if (trimmed.Length == 0)
            throw new InvalidOperationException("Không có nội dung văn bản để gửi cho AI.");

        string? warning = null;
        if (trimmed.Length > MaxSourceChars)
        {
            trimmed = trimmed.Substring(0, MaxSourceChars);
            warning = $"Đã chỉ gửi {MaxSourceChars:N0} ký tự đầu của tài liệu để giới hạn token.";
        }

        var provider = (_configuration["LessonImport:Provider"] ?? "auto").Trim().ToLowerInvariant();
        var hasOpenAiKey = !string.IsNullOrWhiteSpace(_configuration["OpenAI:ApiKey"]);

        if (provider == "openai" || (provider == "auto" && hasOpenAiKey))
            return await GenerateWithOpenAiAsync(trimmed, warning, lessonKind, cancellationToken);

        if (provider == "ollama" || (provider == "auto" && !hasOpenAiKey))
            return await GenerateWithOllamaAsync(trimmed, warning, lessonKind, cancellationToken);

        throw new InvalidOperationException(
            "Cấu hình LessonImport:Provider không hợp lệ. Dùng: auto | openai | ollama.");
    }

    /// <summary>Prompt chung — nhấn mạnh không làm sai kana/kanji (vd あ ≠ か).</summary>
    private static string BuildSystemPrompt(string? lessonKind)
    {
        var focus = NormalizeLessonKind(lessonKind);
        var focusBlock = focus switch
        {
            "vocabulary" => """

                TRỌNG TÂM (moderator chọn «từ vựng»):
                - Ưu tiên vocabulary đầy đủ (tối đa 25 mục), mỗi mục wordJp + reading + meaningVi khớp nguồn.
                - contentHtml: lặp cấu trúc rõ — mỗi từ một khối: dòng 1 từ Nhật, dòng 2 phiên âm kana, dòng 3 nghĩa tiếng Việt (dùng <p> hoặc <table> đơn giản).
                - grammar/quiz có thể ít nếu tài liệu chỉ là danh sách từ.
                """,
            "grammar" => """

                TRỌNG TÂM (moderator chọn «ngữ pháp»):
                - Ưu tiên grammar: pattern, meaningVi, examples (câu tiếng Nhật nguyên văn từ nguồn khi có).
                - contentHtml: giải thích mẫu câu, cấu trúc; vocabulary chỉ từ xuất hiện trong ví dụ.
                """,
            "reading" => """

                TRỌNG TÂM (moderator chọn «bài đọc»):
                - Ưu tiên contentHtml: đoạn đọc tiếng Nhật (nguyên văn), sau đó từ khó / gợi ý dịch; chia h2/h3 rõ.
                - vocabulary: chỉ từ khó trong bài; grammar tối thiểu nếu có điểm ngữ pháp nổi bật.
                """,
            _ => """

                TỰ NHẬN DIỆN LOẠI TÀI LIỆU (moderator chọn «AI tự chọn»):
                - Xác định đây chủ yếu là từ vựng, ngữ pháp hay bài đọc; chọn cấu trúc JSON/HTML phù hợp, không trộn lộn xộn.
                - List từ: bảng/khối từ — đọc kana — nghĩa. Bài đọc: giữ đoạn văn trước, từ khó sau.
                """
        };

        return """
            Bạn là trợ lý biên soạn giáo trình tiếng Nhật cho nền tảng học online.

            QUY TẮC TIẾNG NHẬT (bắt buộc — vi phạm là lỗi nghiêm trọng):
            - Sao chép NGUYÊN VĂN mọi ký tự tiếng Nhật từ tài liệu (hiragana, katakana, kanji). Không được thay bằng ký tự trông giống hoặc âm khác.
            - Ví dụ: あ (a) phải vẫn là あ; không được viết thành か, さ, な…
            - vocabulary.wordJp: đúng chữ như trong tài liệu.
            - vocabulary.reading: CHỈ hiragana (hoặc katakana nếu từ gốc là katakana) — là cách đọc ĐÚNG của wordJp.
              Nếu wordJp đã toàn hiragana (vd あ, いち, こんにちは), reading phải trùng hoặc bỏ trống; không bịa âm khác.
            - Không dùng romaji (Latin) trong reading trừ khi tài liệu gốc chỉ có romaji.
            - Nếu không chắc cách đọc kanji, bỏ qua mục từ đó hoặc chỉ ghi wordJp + nghĩa; không đoán bừa.

            Trả về MỘT đối tượng JSON (không markdown, không ```) với các khóa:
            - title: string, tiêu đề bài học ngắn (có thể song ngữ).
            - slugSuggestion: string, slug Latin thường, gạch ngang (vd lesson-n5-chao-hoi).
            - contentHtml: string, HTML đơn giản (chỉ h2, h3, p, ul, li, strong, table nếu thật sự cần).
            ĐỊNH DẠNG contentHtml (bắt buộc — tránh HTML «vỡ» như bọc từng dấu ngoặc):
            - CẤM tách dấu ( hoặc ) ra thẻ riêng (vd cấm: <em>(</em><strong>時</strong><em>)</em>). Viết ngoặc tròn full-width （ ） bên trong một thẻ hoặc sát chữ.
            - CẤM đóng/mở <strong> lệch tầng; mỗi <p> tối đa vài thẻ, không lồng vô ích.
            Chọn MỘT trong hai mẫu cho mỗi mục từ (copy đúng cấu trúc, thay nội dung):
            Mẫu A — một dòng: <p><strong>見る</strong>（みる）— xem, nhìn</p>
            Mẫu B — ba thẻ p liền nhau (dòng 1 = từ/kanji, dòng 2 = chỉ kana đọc, dòng 3 = nghĩa tiếng Việt):
            <p><strong>勉強</strong></p><p>べんきょう</p><p>học, ôn bài</p>
            Các dòng (1)(2)(3) ở trên chỉ là mô tả vai trò — KHÔNG ghi chữ «(1) từ/kanji» vào HTML thật.
            - estimatedMinutes: số nguyên 5–45.
            - vocabulary: mảng object (wordJp, reading, meaningVi) tối đa 25 mục — bám từ có trong tài liệu.
            - grammar: mảng object (pattern, meaningVi, examples) — examples là mảng câu tiếng Nhật (nguyên văn từ nguồn khi có thể).
            - quiz: mảng object (question, options gồm 4 chuỗi, correctIndex 0..3) tối đa 12 câu.
            QUIZ — CHỈ CHUỖI THUẦN (plain text): question và từng phần tử options KHÔNG chứa thẻ HTML (cấm <strong>, <p>, …). Chỉ chữ hỏi/đáp án bằng tiếng Nhật hoặc tiếng Việt, đúng chủ đề bài; không sinh tiếng Trung trừ khi tài liệu nguồn có.
            Nếu thiếu thông tin, dùng mảng rỗng. correctIndex hợp lệ với options.

            """ + focusBlock;
    }

    private static string NormalizeLessonKind(string? lessonKind)
    {
        var s = (lessonKind ?? "auto").Trim().ToLowerInvariant();
        return s switch
        {
            "vocabulary" or "tu-vung" or "tuvung" => "vocabulary",
            "grammar" or "ngu-phap" or "nguphap" => "grammar",
            "reading" or "bai-doc" or "baidoc" => "reading",
            _ => "auto"
        };
    }

    /// <summary>Chuỗi rỗng từ env/appsettings không được coi là null — Ollama báo «model is required».</summary>
    private string ResolveOllamaModel()
    {
        foreach (var key in new[] { "LessonImport:OllamaModel", "Ollama:ChatModel" })
        {
            var v = _configuration[key];
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }

        return "llama3.2";
    }

    private async Task<GenerateLessonDraftResponseDto> GenerateWithOpenAiAsync(
        string trimmed,
        string? warning,
        string? lessonKind,
        CancellationToken cancellationToken)
    {
        var key = _configuration["OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException(
                "LessonImport:Provider=openai nhưng chưa cấu hình OpenAI:ApiKey. " +
                "Đặt LessonImport:Provider=ollama hoặc thêm ApiKey.");
        }

        var model = _configuration["OpenAI:Model"] ?? "gpt-4o-mini";
        var baseUrl = (_configuration["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1").TrimEnd('/');
        var systemPrompt = BuildSystemPrompt(lessonKind);

        var client = _httpClientFactory.CreateClient(nameof(LessonAiImportService));
        client.Timeout = TimeSpan.FromMinutes(6);
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key.Trim());

        var payload = new
        {
            model,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = "Nội dung tài liệu gốc (giữ nguyên mọi ký tự tiếng Nhật):\n\n" + trimmed }
            }
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        req.Content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage resp;
        try
        {
            resp = await client.SendAsync(req, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI HTTP failed");
            throw new InvalidOperationException("Không kết nối được dịch vụ AI. Kiểm tra mạng và OpenAI:BaseUrl.", ex);
        }

        using (resp)
        {
            var respBody = await resp.Content.ReadAsStringAsync(cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI error {Status}: {Body}", resp.StatusCode, respBody);
                throw new InvalidOperationException(
                    $"API OpenAI trả lỗi {(int)resp.StatusCode}. Kiểm tra ApiKey và model.");
            }

            using var doc = JsonDocument.Parse(respBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            var draft = ParseDraftFromAiContent(content);
            SanitizeDraft(draft);

            var previewLen = Math.Min(AiResponseExtractPreviewChars, trimmed.Length);
            return new GenerateLessonDraftResponseDto
            {
                ExtractedCharacterCount = trimmed.Length,
                ExtractedPreview = previewLen > 0 ? trimmed[..previewLen] : null,
                Warning = warning,
                Draft = draft
            };
        }
    }

    private int ResolveOllamaMaxSourceChars()
    {
        var s = _configuration["LessonImport:OllamaMaxSourceChars"];
        if (int.TryParse(s, out var n) && n is >= 4_000 and <= MaxSourceChars)
            return n;
        // Mặc định = giới hạn chung (trước đây 18k khiến PPTX dài chỉ AI thấy phần đầu).
        return MaxSourceChars;
    }

    private async Task<GenerateLessonDraftResponseDto> GenerateWithOllamaAsync(
        string trimmed,
        string? warning,
        string? lessonKind,
        CancellationToken cancellationToken)
    {
        var ollamaCap = ResolveOllamaMaxSourceChars();
        if (trimmed.Length > ollamaCap)
        {
            var note =
                $"Ollama: chỉ dùng {ollamaCap:N0} ký tự đầu (cấu hình LessonImport:OllamaMaxSourceChars, tối đa {MaxSourceChars:N0}). Tài liệu dài có thể cần OpenAI hoặc chia nhiều lần import.";
            warning = CombineWarnings(warning, note);
            trimmed = trimmed.Substring(0, ollamaCap);
        }

        var baseUrl = (_configuration["Ollama:BaseUrl"] ?? "http://127.0.0.1:11434").TrimEnd('/');
        var model = ResolveOllamaModel();
        var systemPrompt = BuildSystemPrompt(lessonKind);

        string? lastErrorBody = null;
        HttpStatusCode? lastStatus = null;

        for (var attempt = 0; attempt < 2; attempt++)
        {
            var useJsonFormat = attempt == 0;
            HttpResponseMessage resp;
            try
            {
                resp = await PostOllamaChatRequestAsync(
                    baseUrl,
                    model,
                    systemPrompt,
                    trimmed,
                    useJsonFormat,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Ollama HTTP failed for lesson import");
                throw new InvalidOperationException(
                    "Không gọi được Ollama. Chạy `ollama serve`, `ollama pull " + model +
                    "` và kiểm tra Ollama:BaseUrl (API backend phải truy cập được máy chạy Ollama).", ex);
            }

            using (resp)
            {
                var body = await resp.Content.ReadAsStringAsync(cancellationToken);
                lastStatus = resp.StatusCode;
                lastErrorBody = body;

                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Ollama lesson import HTTP {Status} (formatJson={Format}): {Body}",
                        (int)resp.StatusCode,
                        useJsonFormat,
                        body.Length > 800 ? body[..800] : body);

                    if (useJsonFormat)
                        continue;

                    throw BuildOllamaHttpException(model, resp.StatusCode, body);
                }

                string? messageText;
                try
                {
                    messageText = ExtractOllamaMessageText(body);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Ollama response shape unexpected");
                    if (useJsonFormat)
                        continue;
                    throw new InvalidOperationException(
                        "Ollama trả về không đúng định dạng (thiếu message.content). Cập nhật Ollama hoặc đổi model.", ex);
                }

                try
                {
                    var draft = ParseDraftFromAiContent(messageText);
                    SanitizeDraft(draft);
                    var previewLen = Math.Min(AiResponseExtractPreviewChars, trimmed.Length);
                    var fmtNote = useJsonFormat
                        ? $"AI: Ollama ({model})."
                        : $"AI: Ollama ({model}) — gọi không dùng format=json (một số phiên bản Ollama lỗi với JSON mode).";
                    return new GenerateLessonDraftResponseDto
                    {
                        ExtractedCharacterCount = trimmed.Length,
                        ExtractedPreview = previewLen > 0 ? trimmed[..previewLen] : null,
                        Warning = CombineWarnings(warning, fmtNote),
                        Draft = draft
                    };
                }
                catch (InvalidOperationException ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Ollama content không parse được JSON (formatJson={Format})",
                        useJsonFormat);
                    if (useJsonFormat)
                        continue;
                    throw;
                }
            }
        }

        throw BuildOllamaHttpException(model, lastStatus ?? HttpStatusCode.BadGateway, lastErrorBody ?? "");
    }

    private async Task<HttpResponseMessage> PostOllamaChatRequestAsync(
        string baseUrl,
        string model,
        string systemPrompt,
        string userContent,
        bool useJsonFormat,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(model))
            model = "llama3.2";

        var payload = new Dictionary<string, object?>
        {
            ["model"] = model,
            ["stream"] = false,
            ["messages"] = new object[]
            {
                new { role = "system", content = systemPrompt },
                new
                {
                    role = "user",
                    content = "Nội dung tài liệu gốc (giữ nguyên mọi ký tự tiếng Nhật):\n\n" + userContent
                }
            }
        };

        if (useJsonFormat)
            payload["format"] = "json";

        var client = _httpClientFactory.CreateClient(nameof(LessonAiImportService));
        client.Timeout = TimeSpan.FromMinutes(10);

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/chat")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
                Encoding.UTF8,
                "application/json")
        };

        return await client.SendAsync(req, cancellationToken);
    }

    private static string ExtractOllamaMessageText(string body)
    {
        using var doc = JsonDocument.Parse(body);
        if (!doc.RootElement.TryGetProperty("message", out var msgEl))
            throw new InvalidOperationException("missing message");
        if (!msgEl.TryGetProperty("content", out var cEl))
            throw new InvalidOperationException("missing content");
        return cEl.GetString() ?? "";
    }

    private InvalidOperationException BuildOllamaHttpException(string model, HttpStatusCode status, string body)
    {
        var snippet = body.Length > 400 ? body[..400] + "…" : body;
        if (status == HttpStatusCode.NotFound)
        {
            return new InvalidOperationException(
                $"Model '{model}' có thể chưa tải. Chạy: ollama pull {model}");
        }

        return new InvalidOperationException(
            $"Ollama trả HTTP {(int)status}. Kiểm tra model và phiên bản Ollama (nên ≥ 0.1.32 cho format=json). " +
            $"Chi tiết: {snippet}");
    }

    private static string? CombineWarnings(string? a, string b)
    {
        if (string.IsNullOrWhiteSpace(a)) return b;
        return $"{a} {b}";
    }

    private static string NormalizeAiJsonContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return "";
        var s = content.Trim().TrimStart('\uFEFF')
            .Replace('\u201c', '"').Replace('\u201d', '"');
        if (s.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = s.IndexOf('\n');
            if (firstNl >= 0)
                s = s[(firstNl + 1)..].TrimStart();
            var end = s.LastIndexOf("```", StringComparison.Ordinal);
            if (end > 0)
                s = s[..end].Trim();
        }

        return s.Trim();
    }

    /// <summary>LLM đôi khi thêm lời dẫn trước/sau JSON — trích object ngoài cùng (có tôn trọng chuỗi).</summary>
    private static string? TryExtractFirstJsonObject(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var start = s.IndexOf('{');
        if (start < 0) return null;
        var depth = 0;
        var inString = false;
        var escape = false;
        for (var i = start; i < s.Length; i++)
        {
            var c = s[i];
            if (escape)
            {
                escape = false;
                continue;
            }

            if (inString)
            {
                if (c == '\\')
                    escape = true;
                else if (c == '"')
                    inString = false;
                continue;
            }

            switch (c)
            {
                case '"':
                    inString = true;
                    break;
                case '{':
                    depth++;
                    break;
                case '}':
                    depth--;
                    if (depth == 0)
                        return s.Substring(start, i - start + 1);
                    break;
            }
        }

        return null;
    }

    private AiLessonDraftDto ParseDraftFromAiContent(string? content)
    {
        var normalized = NormalizeAiJsonContent(content);
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException("AI không trả nội dung JSON.");

        if (TryDeserializeAiDraft(normalized, out var draft))
            return draft;

        var extracted = TryExtractFirstJsonObject(normalized);
        if (!string.IsNullOrEmpty(extracted) &&
            !string.Equals(extracted, normalized, StringComparison.Ordinal) &&
            TryDeserializeAiDraft(extracted, out var draft2))
        {
            _logger.LogInformation("Lesson AI: đã parse JSON sau khi trích object (bỏ phần thừa trước/sau).");
            return draft2;
        }

        _logger.LogWarning("AI JSON parse failed: {Snippet}",
            normalized.Length > 240 ? normalized[..240] : normalized);
        throw new InvalidOperationException(
            "AI trả JSON không đọc được. Thử model khác (OpenAI gpt-4o-mini / Ollama có hỗ trợ JSON) hoặc rút ngắn tài liệu (giới hạn nguồn: LessonImport:OllamaMaxSourceChars, tối đa 48k).");
    }

    private static bool TryDeserializeAiDraft(string json, out AiLessonDraftDto draft)
    {
        draft = null!;
        try
        {
            var d = JsonSerializer.Deserialize<AiLessonDraftDto>(json, DraftJsonOptions);
            if (d == null)
                return false;
            draft = d;
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string StripHtmlToPlain(string? s)
    {
        if (string.IsNullOrWhiteSpace(s))
            return "";
        var noTags = Regex.Replace(s, "<[^>]+>", " ");
        var decoded = WebUtility.HtmlDecode(noTags) ?? "";
        return Regex.Replace(decoded.Trim(), @"\s+", " ");
    }

    private static void SanitizeDraft(AiLessonDraftDto draft)
    {
        if (string.IsNullOrWhiteSpace(draft.Title))
            draft.Title = "Bài học (chưa đặt tên)";
        draft.SlugSuggestion = Slugify(string.IsNullOrWhiteSpace(draft.SlugSuggestion) ? draft.Title : draft.SlugSuggestion);
        if (draft.EstimatedMinutes < 1) draft.EstimatedMinutes = 15;
        if (draft.EstimatedMinutes > 120) draft.EstimatedMinutes = 120;
        if (string.IsNullOrWhiteSpace(draft.ContentHtml))
            draft.ContentHtml = "<p>(Chưa có nội dung HTML — vui lòng chỉnh tay.)</p>";

        // Hiragana-only wordJp: reading trùng wordJp nếu model để reading sai dạng Latin hoặc rỗng
        foreach (var v in draft.Vocabulary)
        {
            if (string.IsNullOrWhiteSpace(v.WordJp))
                continue;
            var w = v.WordJp.Trim();
            if (IsMostlyHiraganaOrKatakana(w) && string.IsNullOrWhiteSpace(v.Reading))
                v.Reading = w;
        }

        foreach (var q in draft.Quiz)
        {
            q.Question = StripHtmlToPlain(q.Question);
            for (var i = 0; i < q.Options.Count; i++)
                q.Options[i] = StripHtmlToPlain(q.Options[i]);

            while (q.Options.Count < 4)
                q.Options.Add("—");
            if (q.Options.Count > 8)
                q.Options = q.Options.GetRange(0, 8);
            if (q.CorrectIndex < 0 || q.CorrectIndex >= q.Options.Count)
                q.CorrectIndex = 0;
        }
    }

    private static bool IsMostlyHiraganaOrKatakana(string s)
    {
        foreach (var c in s)
        {
            if (c is >= '\u3040' and <= '\u30ff' or >= '\u31f0' and <= '\u31ff')
                continue;
            if (!char.IsWhiteSpace(c) && !char.IsPunctuation(c) && c != 'ー')
                return false;
        }

        return s.Length > 0;
    }

    private static string Slugify(string s)
    {
        var sb = new StringBuilder();
        foreach (var c in s.Normalize(NormalizationForm.FormD))
        {
            if (char.GetUnicodeCategory(c) == System.Globalization.UnicodeCategory.NonSpacingMark)
                continue;
            if (char.IsLetterOrDigit(c))
                sb.Append(char.ToLowerInvariant(c));
            else if (c is ' ' or '-' or '_')
                sb.Append('-');
        }

        var slug = sb.ToString();
        while (slug.Contains("--", StringComparison.Ordinal))
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return slug.Trim('-');
    }
}
