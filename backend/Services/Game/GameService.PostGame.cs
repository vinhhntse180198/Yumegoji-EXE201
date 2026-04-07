using System.Linq;
using System.Text.Json;
using Dapper;
using Microsoft.Data.SqlClient;

namespace backend.Services.Game;

/// <summary>Cập nhật bảng xếp hạng + thành tích sau khi kết thúc phiên game (6.3 / 6.4).</summary>
public partial class GameService
{
    private sealed class GameSessionMetaRow
    {
        public int UserId { get; set; }
        public int GameId { get; set; }
        public string GameSlug { get; set; } = "";
        public int? LevelId { get; set; }
    }

    private async Task AfterGameSessionCompletedAsync(SqlConnection db, int sessionId, SpEndRow summary)
    {
        var meta = await db.QueryFirstOrDefaultAsync<GameSessionMetaRow>(
            """
            SELECT gs.user_id AS UserId, gs.game_id AS GameId, g.slug AS GameSlug, u.level_id AS LevelId
            FROM dbo.game_sessions gs
            INNER JOIN dbo.games g ON g.id = gs.game_id
            INNER JOIN dbo.users u ON u.id = gs.user_id
            WHERE gs.id = @sid
            """,
            new { sid = sessionId });

        if (meta is null)
            return;

        var utc = DateTime.UtcNow;
        var weekStart = GetUtcWeekStart(utc);
        var weekEnd = weekStart.AddDays(7);
        var monthStart = GetUtcMonthStart(utc);
        var monthEnd = monthStart.AddMonths(1);

        var weeklyGlobal = await EnsureLeaderboardPeriodAsync(db, "weekly", weekStart, weekEnd, null, null,
            "Tuần toàn hệ thống");
        var monthlyGlobal = await EnsureLeaderboardPeriodAsync(db, "monthly", monthStart, monthEnd, null, null,
            "Tháng toàn hệ thống");
        var weeklyGame = await EnsureLeaderboardPeriodAsync(db, "weekly", weekStart, weekEnd, meta.GameId, null,
            "Tuần theo game");

        var sessionAvgTop10Ms = await db.ExecuteScalarAsync<double?>(
            """
            SELECT AVG(CAST(x.response_ms AS FLOAT))
            FROM (
                SELECT TOP (10) response_ms
                FROM dbo.game_session_answers
                WHERE session_id = @sid AND response_ms IS NOT NULL
                ORDER BY question_order
            ) x
            """,
            new { sid = sessionId });

        var sessionAvgMsInt = sessionAvgTop10Ms is null ? (int?)null : (int)Math.Round(sessionAvgTop10Ms.Value);

        await UpsertLeaderboardEntryAsync(db, weeklyGlobal, meta.UserId, summary.final_score, summary.accuracy_percent,
            summary.max_combo, sessionAvgMsInt);
        await UpsertLeaderboardEntryAsync(db, monthlyGlobal, meta.UserId, summary.final_score, summary.accuracy_percent,
            summary.max_combo, sessionAvgMsInt);
        await UpsertLeaderboardEntryAsync(db, weeklyGame, meta.UserId, summary.final_score, summary.accuracy_percent,
            summary.max_combo, sessionAvgMsInt);

        if (meta.LevelId is > 0)
        {
            var weeklyLevel = await EnsureLeaderboardPeriodAsync(db, "weekly", weekStart, weekEnd, null, meta.LevelId,
                "Tuần theo cấp độ");
            await UpsertLeaderboardEntryAsync(db, weeklyLevel, meta.UserId, summary.final_score,
                summary.accuracy_percent, summary.max_combo, sessionAvgMsInt);
        }

        await EvaluateSessionAchievementsAsync(db, meta, summary, sessionId, sessionAvgTop10Ms);

        try
        {
            await EvaluateTotalExpAchievementsAsync(db, meta.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "EvaluateTotalExpAchievementsAsync failed after session {SessionId}", sessionId);
        }
    }

    private static int GetMinExpFromCriteriaJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return int.MaxValue;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("minExp", out var e))
                return e.GetInt32();
            if (doc.RootElement.TryGetProperty("min_exp", out var e2))
                return e2.GetInt32();
        }
        catch
        {
            /* ignore */
        }

        return int.MaxValue;
    }

    public async Task RefreshTotalExpAchievementsForUserAsync(int userId)
    {
        if (userId <= 0) return;
        using var db = CreateConnection();
        await db.OpenAsync();
        await EvaluateTotalExpAchievementsAsync(db, userId);
    }

    /// <summary>Thành tích mốc EXP (criteria_type = total_exp). Phần thưởng EXP có thể kích hoạt mốc tiếp theo — lặp tối đa 15 lần.</summary>
    private async Task EvaluateTotalExpAchievementsAsync(SqlConnection db, int userId)
    {
        for (var guard = 0; guard < 15; guard++)
        {
            var exp = await db.ExecuteScalarAsync<int>(
                "SELECT ISNULL(exp, 0) FROM dbo.users WHERE id = @u", new { u = userId });

            var rows = (await db.QueryAsync<(int id, string slug, string? criteriaJson)>(
                """
                SELECT a.id, a.slug, a.criteria_json
                FROM dbo.achievements a
                WHERE ISNULL(a.is_active, 1) = 1
                  AND LOWER(ISNULL(a.criteria_type, N'')) = N'total_exp'
                  AND NOT EXISTS (
                    SELECT 1 FROM dbo.user_achievements ua
                    WHERE ua.user_id = @u AND ua.achievement_id = a.id)
                """,
                new { u = userId })).ToList();

            if (rows.Count == 0)
                return;

            var eligible = rows
                .Select(r => (r, min: GetMinExpFromCriteriaJson(r.criteriaJson)))
                .Where(x => x.min <= exp)
                .OrderBy(x => x.min)
                .ThenBy(x => x.r.id)
                .ToList();

            if (eligible.Count == 0)
                return;

            await TryGrantAchievementBySlugAsync(db, userId, eligible[0].r.slug);
        }
    }

    private static DateTime GetUtcWeekStart(DateTime utcNow)
    {
        var d = utcNow.Date;
        var diff = (7 + (int)d.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        return DateTime.SpecifyKind(d.AddDays(-diff), DateTimeKind.Utc);
    }

    private static DateTime GetUtcMonthStart(DateTime utcNow)
    {
        var m = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return m;
    }

    private static async Task<int> EnsureLeaderboardPeriodAsync(
        SqlConnection db,
        string periodType,
        DateTime startsAt,
        DateTime endsAt,
        int? gameId,
        int? levelId,
        string label)
    {
        var existing = await db.ExecuteScalarAsync<int?>(
            """
            SELECT id
            FROM dbo.leaderboard_periods
            WHERE period_type = @pt
              AND starts_at = @s
              AND ((@gid IS NULL AND game_id IS NULL) OR game_id = @gid)
              AND ((@lid IS NULL AND level_id IS NULL) OR level_id = @lid)
            """,
            new { pt = periodType, s = startsAt, gid = gameId, lid = levelId });

        if (existing is not null)
            return existing.Value;

        return await db.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.leaderboard_periods (game_id, level_id, period_type, label, starts_at, ends_at, is_current)
            OUTPUT INSERTED.id
            VALUES (@gid, @lid, @pt, @lbl, @s, @e, 1)
            """,
            new
            {
                gid = gameId,
                lid = levelId,
                pt = periodType,
                lbl = label,
                s = startsAt,
                e = endsAt
            });
    }

    private static async Task UpsertLeaderboardEntryAsync(
        SqlConnection db,
        int periodId,
        int userId,
        int sessionScore,
        decimal sessionAccuracy,
        int sessionMaxCombo,
        int? sessionAvgMs)
    {
        var row = await db.QueryFirstOrDefaultAsync<LeaderboardRow>(
            """
            SELECT score, games_played, accuracy_avg, best_combo, avg_duration_ms
            FROM dbo.leaderboard_entries
            WHERE period_id = @p AND user_id = @u
            """,
            new { p = periodId, u = userId });

        if (row is null)
        {
            await db.ExecuteAsync(
                """
                INSERT INTO dbo.leaderboard_entries (period_id, user_id, score, rank, accuracy_avg, games_played, best_combo, avg_duration_ms, updated_at)
                VALUES (@p, @u, @score, NULL, @acc, 1, @combo, @avgms, SYSUTCDATETIME())
                """,
                new
                {
                    p = periodId,
                    u = userId,
                    score = sessionScore,
                    acc = sessionAccuracy,
                    combo = sessionMaxCombo,
                    avgms = sessionAvgMs
                });
            return;
        }

        var newGames = row.games_played + 1;
        var newScore = Math.Max(row.score, sessionScore);
        var newAcc = (row.accuracy_avg * row.games_played + sessionAccuracy) / newGames;
        var newCombo = Math.Max(row.best_combo, sessionMaxCombo);
        int? newAvgMs = row.avg_duration_ms;
        if (sessionAvgMs is not null)
        {
            newAvgMs = newAvgMs is null
                ? sessionAvgMs
                : Math.Min(newAvgMs.Value, sessionAvgMs.Value);
        }

        await db.ExecuteAsync(
            """
            UPDATE dbo.leaderboard_entries
            SET score = @score,
                games_played = @gp,
                accuracy_avg = @acc,
                best_combo = @combo,
                avg_duration_ms = @avgms,
                updated_at = SYSUTCDATETIME()
            WHERE period_id = @p AND user_id = @u
            """,
            new
            {
                p = periodId,
                u = userId,
                score = newScore,
                gp = newGames,
                acc = newAcc,
                combo = newCombo,
                avgms = newAvgMs
            });
    }

    private sealed class LeaderboardRow
    {
        public int score { get; set; }
        public int games_played { get; set; }
        public decimal accuracy_avg { get; set; }
        public int best_combo { get; set; }
        public int? avg_duration_ms { get; set; }
    }

    private async Task EvaluateSessionAchievementsAsync(
        SqlConnection db,
        GameSessionMetaRow meta,
        SpEndRow summary,
        int sessionId,
        double? avgTop10Ms)
    {
        if (meta.GameSlug.Equals("hiragana-match", StringComparison.OrdinalIgnoreCase)
            && summary.total_questions > 0
            && summary.correct_count == summary.total_questions)
            await TryGrantAchievementBySlugAsync(db, meta.UserId, "hiragana-master");

        if (meta.GameSlug.Equals("katakana-match", StringComparison.OrdinalIgnoreCase)
            && summary.total_questions > 0
            && summary.correct_count == summary.total_questions)
            await TryGrantAchievementBySlugAsync(db, meta.UserId, "katakana-master");

        if (summary.max_combo >= 5)
            await TryGrantAchievementBySlugAsync(db, meta.UserId, "combo-king");

        var answerCount = await db.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM dbo.game_session_answers WHERE session_id = @sid AND response_ms IS NOT NULL",
            new { sid = sessionId });

        if (answerCount >= 10 && avgTop10Ms is not null && avgTop10Ms < 2000)
            await TryGrantAchievementBySlugAsync(db, meta.UserId, "speed-demon");

        var distinctDays = await db.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(DISTINCT CAST(completed_at AS DATE))
            FROM dbo.user_daily_challenges
            WHERE user_id = @u AND completed_at IS NOT NULL
            """,
            new { u = meta.UserId });

        if (distinctDays >= 30)
            await TryGrantAchievementBySlugAsync(db, meta.UserId, "daily-dedication");
    }

    private async Task TryGrantAchievementBySlugAsync(SqlConnection db, int userId, string slug)
    {
        var ach = await db.QueryFirstOrDefaultAsync<(int id, int exp, int xu)?>(
            """
            SELECT id, reward_exp, reward_xu
            FROM dbo.achievements
            WHERE slug = @slug AND ISNULL(is_active, 1) = 1
            """,
            new { slug });

        if (ach is null)
            return;

        var exists = await db.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(1) FROM dbo.user_achievements WHERE user_id = @u AND achievement_id = @a
            """,
            new { u = userId, a = ach.Value.id });

        if (exists > 0)
            return;

        await db.ExecuteAsync(
            """
            INSERT INTO dbo.user_achievements (user_id, achievement_id, earned_at)
            VALUES (@u, @a, SYSUTCDATETIME())
            """,
            new { u = userId, a = ach.Value.id });

        if (ach.Value.exp > 0 || ach.Value.xu > 0)
        {
            await db.ExecuteAsync(
                "UPDATE dbo.users SET exp = exp + @e, xu = xu + @x WHERE id = @u",
                new { e = ach.Value.exp, x = ach.Value.xu, u = userId });
        }
    }
}
