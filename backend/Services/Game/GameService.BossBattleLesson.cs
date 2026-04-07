using System.Data;
using backend.DTOs.Game;
using Dapper;
using Microsoft.Data.SqlClient;

namespace backend.Services.Game;

/// <summary>
/// Boss Battle: cùng pool từ vựng/kanji bài học như Flashcard; ghi vào bộ đề game <c>boss-battle</c>.
/// </summary>
public partial class GameService
{
    private async Task<StartSessionResponse?> TryStartBossBattleFromLessonsAsync(
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
            _logger.LogWarning(ex, "Không đọc được từ vựng bài học cho Boss Battle (user {UserId})", userId);
            return null;
        }

        if (pool.Count < 1)
        {
            _logger.LogInformation(
                "User {UserId} không đủ từ vựng cho Boss Battle ({Count}) — dùng sp_StartGameSession.",
                userId,
                pool.Count);
            return null;
        }

        while (pool.Count > want)
            pool.RemoveAt(Random.Shared.Next(pool.Count));

        var allMeanings = pool
            .Select(PickMeaning)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (allMeanings.Count < 1)
            return null;

        await using var tx = await db.BeginTransactionAsync();
        var tran = (IDbTransaction)tx;
        try
        {
            var gameId = await db.ExecuteScalarAsync<int?>(
                """
                SELECT id FROM dbo.games
                WHERE LOWER(REPLACE(REPLACE(LTRIM(RTRIM(slug)), N'_', N'-'), N' ', N'')) = N'boss-battle'
                  AND ISNULL(is_active, 1) = 1
                """,
                new { },
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

            _logger.LogWarning(ex, "TryStartBossBattleFromLessonsAsync failed for user {UserId}", userId);
            return null;
        }
    }
}
