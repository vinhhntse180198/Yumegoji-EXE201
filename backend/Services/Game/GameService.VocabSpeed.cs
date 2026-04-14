using System.Data;
using System.Text.Json;
using backend.DTOs.Game;
using backend.Models.Learning;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Game;

/// <summary>
/// Vocabulary Speed Quiz + pool chung Flashcard Battle: từ vựng và kanji từ bài học (ưu tiên bài truy cập gần đây),
/// lưu câu hỏi game dạng lesson_vocab.
/// </summary>
public partial class GameService
{
    private const string LessonVocabQuestionType = "lesson_vocab";

    private async Task<StartSessionResponse?> TryStartVocabularySpeedFromLessonsAsync(
        int userId,
        StartSessionRequest req,
        SqlConnection db)
    {
        var want = Math.Clamp(req.QuestionCount ?? 10, 5, 25);

        List<LessonQuizTerm> pool;
        try
        {
            pool = await BuildLessonTermsPoolForUserAsync(userId, want, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được từ vựng từ bài học cho user {UserId}", userId);
            return null;
        }

        if (pool.Count < 1)
        {
            _logger.LogInformation("User {UserId} không đủ từ vựng bài học ({Count}) — dùng sp_StartGameSession.", userId, pool.Count);
            return null;
        }

        while (pool.Count > want)
            pool.RemoveAt(Random.Shared.Next(pool.Count));

        var allMeanings = pool
            .Select(PickMeaning)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (allMeanings.Count < 4)
            return null;

        await using var tx = await db.BeginTransactionAsync();
        var tran = (IDbTransaction)tx;
        try
        {
            var gameId = await db.ExecuteScalarAsync<int?>(
                "SELECT id FROM dbo.games WHERE slug = @slug AND ISNULL(is_active, 1) = 1",
                new { slug = "vocabulary-speed-quiz" },
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
            foreach (var term in pool)
            {
                var qid = await EnsureLessonVocabQuestionAsync(db, tran, setId.Value, term, allMeanings);
                if (qid is > 0)
                    questionIds.Add(qid.Value);
            }

            if (questionIds.Count < 1)
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
                tpq ?? 8,
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

            _logger.LogWarning(ex, "TryStartVocabularySpeedFromLessonsAsync failed for user {UserId}", userId);
            return null;
        }
    }

    /// <summary>Một mục (từ vựng hoặc kanji) lấy từ bài học để dựng câu hỏi lesson_vocab.</summary>
    private sealed record LessonQuizTerm(string WordJp, string? MeaningVi, string? MeaningEn, string? Reading);

    private static LessonQuizTerm FromVocabulary(VocabularyItem v) => new(
        v.WordJp.Trim(),
        string.IsNullOrWhiteSpace(v.MeaningVi) ? null : v.MeaningVi.Trim(),
        string.IsNullOrWhiteSpace(v.MeaningEn) ? null : v.MeaningEn.Trim(),
        string.IsNullOrWhiteSpace(v.Reading) ? null : v.Reading.Trim());

    private static LessonQuizTerm? FromKanji(KanjiItem k)
    {
        var w = k.KanjiChar?.Trim();
        if (string.IsNullOrEmpty(w))
            return null;

        var reading = CombineKanjiReadings(k);
        return new LessonQuizTerm(
            w,
            string.IsNullOrWhiteSpace(k.MeaningVi) ? null : k.MeaningVi.Trim(),
            string.IsNullOrWhiteSpace(k.MeaningEn) ? null : k.MeaningEn.Trim(),
            reading);
    }

    private static string? CombineKanjiReadings(KanjiItem k)
    {
        var on = k.ReadingsOn?.Trim();
        var kun = k.ReadingsKun?.Trim();
        if (string.IsNullOrEmpty(on) && string.IsNullOrEmpty(kun))
            return null;
        if (string.IsNullOrEmpty(on))
            return kun;
        if (string.IsNullOrEmpty(kun))
            return on;
        return $"{on} / {kun}";
    }

    /// <summary>
    /// Ưu tiên bài học user đã mở gần đây (LastAccessedAt), gồm từ vựng + kanji; sau đó bổ sung từ khoá học đã publish.
    /// </summary>
    private async Task<List<LessonQuizTerm>> BuildLessonTermsPoolForUserAsync(int userId, int want, CancellationToken ct)
    {
        var lessonAccessOrder = await _learningDb.UserLessonProgresses.AsNoTracking()
            .Where(p => p.UserId == userId)
            .GroupBy(p => p.LessonId)
            .Select(g => new { LessonId = g.Key, Last = g.Max(x => x.LastAccessedAt) })
            .OrderByDescending(x => x.Last)
            .Select(x => x.LessonId)
            .ToListAsync(ct);

        var priority = lessonAccessOrder.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);

        var pool = new List<LessonQuizTerm>();
        var inPool = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void TryAdd(LessonQuizTerm t)
        {
            var w = t.WordJp.Trim();
            if (w.Length == 0 || inPool.Contains(w))
                return;
            if (string.IsNullOrWhiteSpace(PickMeaning(t)))
                return;
            pool.Add(t);
            inPool.Add(w);
        }

        if (lessonAccessOrder.Count > 0)
        {
            var vocabProgress = await (
                    from v in _learningDb.VocabularyItems.AsNoTracking()
                    join l in _learningDb.Lessons.AsNoTracking() on v.LessonId equals l.Id
                    where v.LessonId != null && l.IsPublished && lessonAccessOrder.Contains(v.LessonId.Value)
                    select new { v, LessonId = v.LessonId!.Value })
                .ToListAsync(ct);

            vocabProgress.Sort((a, b) =>
                priority.GetValueOrDefault(a.LessonId, 999).CompareTo(priority.GetValueOrDefault(b.LessonId, 999)));

            foreach (var x in vocabProgress)
                TryAdd(FromVocabulary(x.v));

            var kanjiProgress = await (
                    from k in _learningDb.KanjiItems.AsNoTracking()
                    join l in _learningDb.Lessons.AsNoTracking() on k.LessonId equals l.Id
                    where k.LessonId != null && l.IsPublished && lessonAccessOrder.Contains(k.LessonId.Value)
                    select new { k, LessonId = k.LessonId!.Value })
                .ToListAsync(ct);

            kanjiProgress.Sort((a, b) =>
                priority.GetValueOrDefault(a.LessonId, 999).CompareTo(priority.GetValueOrDefault(b.LessonId, 999)));

            foreach (var x in kanjiProgress)
            {
                var t = FromKanji(x.k);
                if (t != null)
                    TryAdd(t);
            }
        }

        if (pool.Count < Math.Max(want, 4))
        {
            var publishedVocab = await (
                    from v in _learningDb.VocabularyItems.AsNoTracking()
                    join l in _learningDb.Lessons.AsNoTracking() on v.LessonId equals l.Id
                    where v.LessonId != null && l.IsPublished
                    select v)
                .ToListAsync(ct);

            foreach (var v in publishedVocab.OrderBy(_ => Random.Shared.Next()))
            {
                TryAdd(FromVocabulary(v));
                if (pool.Count >= Math.Max(want, 16))
                    break;
            }
        }

        if (pool.Count < Math.Max(want, 4))
        {
            var publishedKanji = await (
                    from k in _learningDb.KanjiItems.AsNoTracking()
                    join l in _learningDb.Lessons.AsNoTracking() on k.LessonId equals l.Id
                    where k.LessonId != null && l.IsPublished
                    select k)
                .ToListAsync(ct);

            foreach (var k in publishedKanji.OrderBy(_ => Random.Shared.Next()))
            {
                var t = FromKanji(k);
                if (t != null)
                    TryAdd(t);
                if (pool.Count >= Math.Max(want, 16))
                    break;
            }
        }

        return pool;
    }

    private static string PickMeaning(LessonQuizTerm v) =>
        !string.IsNullOrWhiteSpace(v.MeaningVi)
            ? v.MeaningVi!.Trim()
            : (!string.IsNullOrWhiteSpace(v.MeaningEn) ? v.MeaningEn!.Trim() : v.WordJp.Trim());

    private static async Task<int?> EnsureLessonVocabQuestionAsync(
        SqlConnection db,
        IDbTransaction tran,
        int setId,
        LessonQuizTerm v,
        IReadOnlyList<string> meaningPool)
    {
        var word = v.WordJp.Trim();
        var existing = await db.ExecuteScalarAsync<int?>(
            """
            SELECT TOP 1 id FROM dbo.game_questions
            WHERE set_id = @sid AND question_type = @qt AND question_text = @qtext
            """,
            new { sid = setId, qt = LessonVocabQuestionType, qtext = word },
            tran);
        if (existing is > 0)
            return existing;

        var right = PickMeaning(v);
        if (string.IsNullOrWhiteSpace(right))
            return null;

        var wrong = meaningPool
            .Where(m => !string.Equals(m, right, StringComparison.OrdinalIgnoreCase))
            .OrderBy(_ => Random.Shared.Next())
            .Take(3)
            .ToList();

        for (var k = 0; wrong.Count < 3 && k < 20; k++)
        {
            var pad = $"Đáp án {Random.Shared.Next(100, 999)}";
            if (!wrong.Any(x => string.Equals(x, pad, StringComparison.OrdinalIgnoreCase))
                && !string.Equals(pad, right, StringComparison.OrdinalIgnoreCase))
                wrong.Add(pad);
        }

        if (wrong.Count < 3)
            return null;

        var options = new List<string> { right, wrong[0], wrong[1], wrong[2] };
        Shuffle(options);
        var correctIndex = options.FindIndex(o => string.Equals(o, right, StringComparison.Ordinal));

        var optsJson = JsonSerializer.Serialize(options.Select(t => new { text = t }));
        var expl = string.IsNullOrWhiteSpace(v.Reading) ? right : $"{word} ({v.Reading}) — {right}";

        var inserted = await db.QuerySingleAsync<int>(
            """
            INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
            OUTPUT INSERTED.id
            VALUES (@sid, @qt, @qtext, @opts, @ci, @ex, 100, 1, 1, 0)
            """,
            new
            {
                sid = setId,
                qt = LessonVocabQuestionType,
                qtext = word,
                opts = optsJson,
                ci = correctIndex,
                ex = expl
            },
            tran);

        return inserted;
    }

    private static void Shuffle<T>(IList<T> list)
    {
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
