using System.Data;
using System.Text.Json;
using backend.DTOs.Game;
using backend.Models.Learning;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Game;

/// <summary>
/// Counter Quest: ưu tiên câu trắc nghiệm từ <see cref="LessonQuizQuestion"/> (bài học đã xuất bản),
/// lọc dạng trợ từ đếm (4 đáp án ngắn). Hết hoặc không đủ → <c>sp_StartGameSession</c> + seed SQL.
/// </summary>
public partial class GameService
{
    private const string LessonCounterQuestionType = "lesson_counter";
    private const string LessonCounterHintPrefix = "lq:";

    private async Task<StartSessionResponse?> TryStartCounterQuestFromLessonsAsync(
        int userId,
        StartSessionRequest req,
        SqlConnection db)
    {
        var want = Math.Clamp(req.QuestionCount ?? 10, 5, 25);

        List<LessonQuizQuestion> pool;
        try
        {
            pool = await BuildCounterQuizPoolForUserAsync(userId, want, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được quiz bài học (counter) cho user {UserId}", userId);
            return null;
        }

        if (pool.Count < 4)
        {
            _logger.LogInformation(
                "User {UserId} không đủ câu trợ từ từ bài học ({Count}) — dùng sp_StartGameSession.",
                userId,
                pool.Count);
            return null;
        }

        while (pool.Count > want)
            pool.RemoveAt(Random.Shared.Next(pool.Count));

        await using var tx = await db.BeginTransactionAsync();
        var tran = (IDbTransaction)tx;
        try
        {
            var gameId = await db.ExecuteScalarAsync<int?>(
                "SELECT id FROM dbo.games WHERE slug = @slug AND ISNULL(is_active, 1) = 1",
                new { slug = "counter-quest" },
                tran);
            if (gameId is null or 0)
            {
                await tx.RollbackAsync();
                return null;
            }

            var setId = await db.ExecuteScalarAsync<int?>(
                """
                SELECT TOP 1 gqs.id
                FROM dbo.game_question_sets gqs
                WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
                ORDER BY gqs.sort_order, gqs.id
                """,
                new { gid = gameId },
                tran);
            if (setId is null)
            {
                await tx.RollbackAsync();
                return null;
            }

            var maxHearts = await db.ExecuteScalarAsync<int>(
                "SELECT ISNULL(max_hearts, 3) FROM dbo.games WHERE id = @id",
                new { id = gameId },
                tran);

            var questionIds = new List<int>();
            foreach (var q in pool)
            {
                var qid = await EnsureLessonCounterQuestionAsync(db, tran, setId.Value, q);
                if (qid is > 0)
                    questionIds.Add(qid.Value);
            }

            if (questionIds.Count < 4)
            {
                await tx.RollbackAsync();
                return null;
            }

            Shuffle(questionIds);

            var sessionId = await db.QuerySingleAsync<int>(
                """
                INSERT INTO dbo.game_sessions (user_id, game_id, score, correct_count, total_questions, hearts_remaining, set_id, started_at)
                OUTPUT INSERTED.id
                VALUES (@uid, @gid, 0, 0, @tq, @mh, @sid, SYSUTCDATETIME())
                """,
                new
                {
                    uid = userId,
                    gid = gameId,
                    tq = questionIds.Count,
                    mh = maxHearts,
                    sid = setId.Value
                },
                tran);

            await tx.CommitAsync();

            var rows = new List<SpQuestionRow>();
            foreach (var qid in questionIds)
            {
                var row = await db.QueryFirstOrDefaultAsync<SpQuestionRow>(
                    """
                    SELECT id, question_type, question_text, hint_text, audio_url, image_url, options_json, base_score, difficulty
                    FROM dbo.game_questions WHERE id = @id
                    """,
                    new { id = qid });
                if (row is not null)
                    rows.Add(row);
            }

            var tpq = await db.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 time_per_question_s FROM dbo.game_question_sets WHERE id = @id",
                new { id = setId.Value });

            return new StartSessionResponse(
                sessionId,
                maxHearts,
                tpq ?? 12,
                rows.Select(q => new QuestionDto(
                    q.id,
                    q.question_type,
                    q.question_text,
                    q.hint_text,
                    q.audio_url,
                    q.image_url,
                    q.options_json ?? "[]",
                    q.base_score,
                    q.difficulty)).ToList());
        }
        catch (Exception ex)
        {
            try
            {
                await tx.RollbackAsync();
            }
            catch
            {
                /* ignore */
            }

            _logger.LogWarning(ex, "TryStartCounterQuestFromLessonsAsync failed for user {UserId}", userId);
            return null;
        }
    }

    private async Task<List<LessonQuizQuestion>> BuildCounterQuizPoolForUserAsync(int userId, int want, CancellationToken ct)
    {
        var lessonIds = await _learningDb.UserLessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.LessonId)
            .Distinct()
            .ToListAsync(ct);

        var fromProgress = await (
                from q in _learningDb.LessonQuizQuestions.AsNoTracking()
                join l in _learningDb.Lessons.AsNoTracking() on q.LessonId equals l.Id
                where l.IsPublished && lessonIds.Contains(q.LessonId)
                select q)
            .ToListAsync(ct);

        var pool = fromProgress.Where(LooksLikeCounterQuiz).GroupBy(q => q.Id).Select(g => g.First()).ToList();

        if (pool.Count < Math.Max(want, 8))
        {
            var have = pool.Select(p => p.Id).ToHashSet();
            var more = await (
                    from q in _learningDb.LessonQuizQuestions.AsNoTracking()
                    join l in _learningDb.Lessons.AsNoTracking() on q.LessonId equals l.Id
                    where l.IsPublished && !have.Contains(q.Id)
                    select q)
                .ToListAsync(ct);

            foreach (var q in more.OrderBy(_ => Random.Shared.Next()))
            {
                if (!LooksLikeCounterQuiz(q))
                    continue;
                pool.Add(q);
                have.Add(q.Id);
                if (pool.Count >= Math.Max(want, 16))
                    break;
            }
        }

        return pool;
    }

    private static bool LooksLikeCounterQuiz(LessonQuizQuestion q)
    {
        if (string.IsNullOrWhiteSpace(q.Question) || string.IsNullOrWhiteSpace(q.OptionsJson))
            return false;

        var opts = ParseLessonQuizOptionStrings(q.OptionsJson);
        if (opts is null || opts.Count != 4)
            return false;

        var cleaned = opts.Select(o => o.Trim()).Where(s => s.Length > 0).ToList();
        if (cleaned.Count != 4)
            return false;

        if (cleaned.Any(o => o.Length > 8))
            return false;

        if (cleaned.Any(o => o.Contains(' ', StringComparison.Ordinal)))
            return false;

        static bool HasClassifierKanji(string s)
        {
            const string classifierChars = "枚台匹本人個冊羽頭束軒缶杯足皿丁回歳階口";
            foreach (var c in s)
            {
                if (classifierChars.Contains(c))
                    return true;
            }

            return false;
        }

        var qu = q.Question.Trim();
        var qLower = qu.ToLowerInvariant();
        var topicHint =
            qLower.Contains("đếm", StringComparison.OrdinalIgnoreCase)
            || qLower.Contains("trợ từ", StringComparison.OrdinalIgnoreCase)
            || qLower.Contains("chiếc", StringComparison.OrdinalIgnoreCase)
            || qLower.Contains("cái ", StringComparison.OrdinalIgnoreCase)
            || qLower.Contains("con ", StringComparison.OrdinalIgnoreCase)
            || qLower.Contains("quyển", StringComparison.OrdinalIgnoreCase)
            || qu.Contains('枚', StringComparison.Ordinal)
            || qu.Contains('台', StringComparison.Ordinal)
            || qu.Contains('匹', StringComparison.Ordinal)
            || qu.Contains('本', StringComparison.Ordinal)
            || qu.Contains('個', StringComparison.Ordinal)
            || qu.Contains('人', StringComparison.Ordinal)
            || qu.Contains('冊', StringComparison.Ordinal);

        return cleaned.Any(HasClassifierKanji) || topicHint;
    }

    private static List<string>? ParseLessonQuizOptionStrings(string optionsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(optionsJson);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array)
                return null;

            var list = new List<string>();
            foreach (var el in root.EnumerateArray())
            {
                switch (el.ValueKind)
                {
                    case JsonValueKind.String:
                        list.Add(el.GetString() ?? "");
                        break;
                    case JsonValueKind.Object when el.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String:
                        list.Add(t.GetString() ?? "");
                        break;
                }
            }

            return list.Count == 4 ? list : null;
        }
        catch
        {
            return null;
        }
    }

    private static async Task<int?> EnsureLessonCounterQuestionAsync(
        SqlConnection db,
        IDbTransaction tran,
        int setId,
        LessonQuizQuestion q)
    {
        var hint = $"{LessonCounterHintPrefix}{q.Id}";
        var existing = await db.ExecuteScalarAsync<int?>(
            """
            SELECT TOP 1 id FROM dbo.game_questions
            WHERE set_id = @sid AND question_type = @qt AND hint_text = @hint
            """,
            new { sid = setId, qt = LessonCounterQuestionType, hint },
            tran);
        if (existing is > 0)
            return existing;

        var opts = ParseLessonQuizOptionStrings(q.OptionsJson);
        if (opts is null || opts.Count != 4)
            return null;

        var ci = q.CorrectIndex;
        if (ci < 0 || ci > 3)
            return null;

        var optsJson = JsonSerializer.Serialize(opts.Select(t => new { text = t.Trim() }));
        var qtext = q.Question.Trim();
        if (qtext.Length > 500)
            qtext = qtext[..500];

        var inserted = await db.QuerySingleAsync<int>(
            """
            INSERT INTO dbo.game_questions (set_id, question_type, question_text, hint_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
            OUTPUT INSERTED.id
            VALUES (@sid, @qt, @qtext, @hint, @opts, @ci, @ex, 100, 1, 1, 0)
            """,
            new
            {
                sid = setId,
                qt = LessonCounterQuestionType,
                qtext,
                hint,
                opts = optsJson,
                ci,
                ex = $"Bài học — quiz #{q.Id}"
            },
            tran);

        return inserted;
    }
}
