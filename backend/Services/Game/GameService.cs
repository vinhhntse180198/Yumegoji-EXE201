using System.Data;
using System.Text.Json;
using backend.Data;
using backend.DTOs.Game;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services.Game;

public partial class GameService : IGameService
{
    /// <summary>Số lượng mỗi loại power-up khi user chưa có vật phẩm (tổng túi = 0).</summary>
    private const int StarterPowerUpQuantityPerType = 10;

    /// <summary>Gói Miễn phí: tối đa phiên game bắt đầu trong ngày (UTC). Premium không giới hạn.</summary>
    private const int FreeTierDailyGameSessionLimit = 20;

    private readonly string _connectionString;
    private readonly ILogger<GameService> _logger;
    private readonly ApplicationDbContext _learningDb;

    public GameService(IConfiguration config, ILogger<GameService> logger, ApplicationDbContext learningDb)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection chưa cấu hình.");
        _logger = logger;
        _learningDb = learningDb;
    }

    private SqlConnection CreateConnection() => new(_connectionString);

    private async Task<bool> IsUserPremiumAsync(int userId)
    {
        if (userId < 1) return false;
        return await _learningDb.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.IsPremium)
            .FirstOrDefaultAsync();
    }

    /// <summary>Slug trong DB (spec) dùng dấu gạch ngang; client có thể gửi gạch dưới.</summary>
    private static string NormalizePowerUpSlug(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return "";
        return slug.Trim().Replace('_', '-').ToLowerInvariant();
    }

    /// <summary>Slug game trong dbo.games — chuẩn hoá giống power-up (gạch dưới → gạch ngang).</summary>
    private static string NormalizeGameSlug(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return "";
        return slug.Trim().Replace('_', '-').ToLowerInvariant();
    }

    private static bool IsFlashcardBattleSlug(string normalizedSlug) =>
        string.Equals(normalizedSlug, "flashcard-vocabulary", StringComparison.OrdinalIgnoreCase)
        || string.Equals(normalizedSlug, "flashcard-battle", StringComparison.OrdinalIgnoreCase);

    /// <summary>Swagger/UI hay gửi setId = 0; coi như không chọn bộ đề (dùng auto + nhánh bài học).</summary>
    private static int? NormalizeOptionalSetId(int? setId) =>
        setId is > 0 ? setId : null;

    /// <summary>Nếu user chưa có vật phẩm nào (tổng quantity = 0), cấp gói mở đầu để dùng power-up khi chơi.</summary>
    private static async Task EnsureStarterInventoryIfEmptyAsync(SqlConnection db, int userId)
    {
        var sum = await db.ExecuteScalarAsync<int?>(
            "SELECT SUM(quantity) FROM dbo.user_inventory WHERE user_id = @u",
            new { u = userId }) ?? 0;
        if (sum > 0)
            return;

        /* Không cấp 50:50 miễn phí — tính năng gợi ý chưa mở; tránh hiển thị số túi gây nhầm. */
        const string slugNorm = """
            LOWER(REPLACE(REPLACE(LTRIM(RTRIM(p.slug)), N'_', N'-'), N' ', N''))
            """;

        await db.ExecuteAsync(
            $"""
            UPDATE i
            SET i.quantity = @qty, i.updated_at = SYSUTCDATETIME()
            FROM dbo.user_inventory i
            INNER JOIN dbo.power_ups p ON p.id = i.power_up_id
            WHERE i.user_id = @u
              AND {slugNorm} <> N'fifty-fifty'
            """,
            new { u = userId, qty = StarterPowerUpQuantityPerType });

        await db.ExecuteAsync(
            $"""
            INSERT INTO dbo.user_inventory (user_id, power_up_id, quantity, updated_at)
            SELECT @u, p.id, @qty, SYSUTCDATETIME()
            FROM dbo.power_ups p
            WHERE ISNULL(p.is_active, 1) = 1
              AND {slugNorm} <> N'fifty-fifty'
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.user_inventory i
                  WHERE i.user_id = @u AND i.power_up_id = p.id)
            """,
            new { u = userId, qty = StarterPowerUpQuantityPerType });
    }

    public async Task<IReadOnlyList<GameInfoDto>> GetGamesAsync()
    {
        const string sql = """
            SELECT id AS Id, slug AS Slug, name AS Name, description AS Description,
                   skill_type AS SkillType, max_hearts AS MaxHearts,
                   CAST(ISNULL(is_pvp, 0) AS BIT) AS IsPvp,
                   CAST(ISNULL(is_boss_mode, 0) AS BIT) AS IsBossMode,
                   ISNULL(sort_order, 0) AS SortOrder,
                   level_min AS LevelMin,
                   level_max AS LevelMax
            FROM dbo.games
            WHERE ISNULL(is_active, 1) = 1
              AND LOWER(LTRIM(RTRIM(slug))) NOT IN (N'fill-in-blank', N'fill-blank')
            ORDER BY ISNULL(sort_order, 0), id
            """;
        using var db = CreateConnection();
        var rows = await db.QueryAsync<GameInfoDto>(sql);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<GameInfoDto>> GetAdminGamesAsync()
    {
        const string sql = """
            SELECT id AS Id, slug AS Slug, name AS Name, description AS Description,
                   skill_type AS SkillType, ISNULL(max_hearts, 3) AS MaxHearts,
                   CAST(ISNULL(is_pvp, 0) AS BIT) AS IsPvp,
                   CAST(ISNULL(is_boss_mode, 0) AS BIT) AS IsBossMode,
                   ISNULL(sort_order, 0) AS SortOrder,
                   level_min AS LevelMin,
                   level_max AS LevelMax
            FROM dbo.games
            WHERE ISNULL(is_active, 1) = 1
            ORDER BY ISNULL(sort_order, 0), id
            """;
        using var db = CreateConnection();
        var rows = await db.QueryAsync<GameInfoDto>(sql);
        return rows.ToList();
    }

    public async Task<GameInfoDto> CreateGameAsync(CreateGameAdminRequest req)
    {
        var slug = NormalizeGameSlug(req.Slug);
        if (string.IsNullOrWhiteSpace(slug))
            throw new InvalidOperationException("Slug game không hợp lệ.");
        var name = (req.Name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Tên game không được để trống.");

        using var db = CreateConnection();
        await db.OpenAsync();
        var exists = await db.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM dbo.games WHERE LOWER(LTRIM(RTRIM(slug))) = @s",
            new { s = slug });
        if (exists > 0)
            throw new InvalidOperationException("Slug game đã tồn tại.");

        var id = await db.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.games
                (slug, name, description, skill_type, max_hearts, is_pvp, is_boss_mode, sort_order, level_min, level_max, is_active)
            OUTPUT INSERTED.id
            VALUES (@slug, @name, @desc, @skill, @hearts, @pvp, @boss, @sort, @lmin, @lmax, 1)
            """,
            new
            {
                slug,
                name,
                desc = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
                skill = string.IsNullOrWhiteSpace(req.SkillType) ? null : req.SkillType.Trim(),
                hearts = Math.Clamp(req.MaxHearts, 1, 10),
                pvp = req.IsPvp,
                boss = req.IsBossMode,
                sort = req.SortOrder,
                lmin = string.IsNullOrWhiteSpace(req.LevelMin) ? null : req.LevelMin.Trim(),
                lmax = string.IsNullOrWhiteSpace(req.LevelMax) ? null : req.LevelMax.Trim()
            });

        return new GameInfoDto(
            id,
            slug,
            name,
            string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            string.IsNullOrWhiteSpace(req.SkillType) ? null : req.SkillType.Trim(),
            Math.Clamp(req.MaxHearts, 1, 10),
            req.IsPvp,
            req.IsBossMode,
            req.SortOrder,
            string.IsNullOrWhiteSpace(req.LevelMin) ? null : req.LevelMin.Trim(),
            string.IsNullOrWhiteSpace(req.LevelMax) ? null : req.LevelMax.Trim());
    }

    public async Task<bool> DeleteGameAsync(int gameId)
    {
        using var db = CreateConnection();
        var n = await db.ExecuteAsync(
            "UPDATE dbo.games SET is_active = 0 WHERE id = @id AND ISNULL(is_active, 1) = 1",
            new { id = gameId });
        return n > 0;
    }

    public async Task<StartSessionResponse> StartSessionAsync(int userId, StartSessionRequest req)
    {
        var gameSlug = NormalizeGameSlug(req.GameSlug);
        if (string.IsNullOrEmpty(gameSlug))
            throw new InvalidOperationException("Thiếu game slug.");

        var effectiveSetId = NormalizeOptionalSetId(req.SetId);

        using var db = CreateConnection();
        await db.OpenAsync();

        try
        {
            await EnsureStarterInventoryIfEmptyAsync(db, userId);

            if (!await IsUserPremiumAsync(userId))
            {
                var today = DateTime.UtcNow.Date;
                var cnt = await db.ExecuteScalarAsync<int>(
                    """
                    SELECT COUNT(*) FROM dbo.game_sessions
                    WHERE user_id = @u AND started_at >= @dayStart
                    """,
                    new { u = userId, dayStart = today });
                if (cnt >= FreeTierDailyGameSessionLimit)
                    throw new InvalidOperationException(
                        "Gói Miễn phí: đã đạt giới hạn lượt chơi trong ngày. Nâng cấp Premium để không giới hạn.");

                var isPvp = await db.ExecuteScalarAsync<bool?>(
                    """
                    SELECT CAST(ISNULL(is_pvp, 0) AS BIT)
                    FROM dbo.games
                    WHERE LOWER(LTRIM(RTRIM(slug))) = LOWER(@slug) AND ISNULL(is_active, 1) = 1
                    """,
                    new { slug = gameSlug });
                if (isPvp is null)
                    throw new InvalidOperationException("Game không tồn tại hoặc đã tắt.");
                if (isPvp == true)
                    throw new InvalidOperationException("Giải đấu PvP chỉ dành cho gói Premium.");
            }

            if (string.Equals(gameSlug, "vocabulary-speed-quiz", StringComparison.OrdinalIgnoreCase)
                && effectiveSetId is null
                && req.UseLessonVocabulary != false)
            {
                var fromLessons = await TryStartVocabularySpeedFromLessonsAsync(userId, req, db);
                if (fromLessons is not null)
                    return fromLessons;
            }

            if (string.Equals(gameSlug, "counter-quest", StringComparison.OrdinalIgnoreCase)
                && effectiveSetId is null
                && req.UseLessonVocabulary != false)
            {
                var fromLessons = await TryStartCounterQuestFromLessonsAsync(userId, req, db);
                if (fromLessons is not null)
                    return fromLessons;
            }

            if (IsFlashcardBattleSlug(gameSlug)
                && effectiveSetId is null
                && req.UseLessonVocabulary != false)
            {
                var fromLessons = await TryStartFlashcardBattleFromLessonsAsync(userId, req, gameSlug, db);
                if (fromLessons is not null)
                    return fromLessons;
            }

            if (string.Equals(gameSlug, "boss-battle", StringComparison.OrdinalIgnoreCase)
                && effectiveSetId is null
                && req.UseLessonVocabulary != false)
            {
                var fromLessons = await TryStartBossBattleFromLessonsAsync(userId, req, db);
                if (fromLessons is not null)
                    return fromLessons;
            }

            int? questionCountForSp = null;
            if (string.Equals(gameSlug, "sentence-builder", StringComparison.OrdinalIgnoreCase)
                && req.QuestionCount is int sbq && sbq > 0)
                questionCountForSp = Math.Clamp(sbq, 1, 25);
            else if (string.Equals(gameSlug, "daily-challenge", StringComparison.OrdinalIgnoreCase))
            {
                var want = req.QuestionCount is int dc && dc > 0 ? dc : 10;
                questionCountForSp = Math.Clamp(want, 5, 25);
            }
            else if (string.Equals(gameSlug, "counter-quest", StringComparison.OrdinalIgnoreCase))
            {
                var want = req.QuestionCount is int cq && cq > 0 ? cq : 10;
                questionCountForSp = Math.Clamp(want, 5, 25);
            }
            else if (IsFlashcardBattleSlug(gameSlug))
            {
                var want = req.QuestionCount is int fq && fq > 0 ? fq : 10;
                questionCountForSp = Math.Clamp(want, 5, 25);
            }
            else if (string.Equals(gameSlug, "boss-battle", StringComparison.OrdinalIgnoreCase))
            {
                var want = req.QuestionCount is int bq && bq > 0 ? bq : 10;
                questionCountForSp = Math.Clamp(want, 5, 25);
            }

            await using var multi = await db.QueryMultipleAsync(
                "dbo.sp_StartGameSession",
                new
                {
                    user_id = userId,
                    game_slug = gameSlug,
                    set_id = effectiveSetId,
                    question_count = questionCountForSp,
                },
                commandType: CommandType.StoredProcedure);

            var info = await multi.ReadFirstOrDefaultAsync<SpStartRow>();
            if (info is null)
                throw new InvalidOperationException("Không nhận được thông tin phiên từ sp_StartGameSession.");

            var questions = (await multi.ReadAsync<SpQuestionRow>()).ToList();

            if (!string.Equals(req.Mode, "solo", StringComparison.OrdinalIgnoreCase))
            {
                await db.ExecuteAsync(
                    "UPDATE dbo.game_sessions SET mode = @mode WHERE id = @id",
                    new { mode = req.Mode, id = info.session_id });
            }

            var tpq = await db.ExecuteScalarAsync<int?>(
                """
                SELECT TOP (1) time_per_question_s
                FROM dbo.game_question_sets
                WHERE id = (SELECT set_id FROM dbo.game_sessions WHERE id = @sid)
                """,
                new { sid = info.session_id });

            return new StartSessionResponse(
                info.session_id,
                info.max_hearts,
                tpq ?? 10,
                questions.Select(q => new QuestionDto(
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
        catch (SqlException ex)
        {
            _logger.LogWarning(ex, "sp_StartGameSession failed for slug {Slug}", gameSlug);
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<AnswerResultDto> SubmitAnswerAsync(int userId, SubmitAnswerRequest req)
    {
        if (req.SessionId < 1)
            throw new ArgumentException("SessionId không hợp lệ.");
        if (req.QuestionId < 1)
            throw new ArgumentException("QuestionId không hợp lệ — hãy bắt đầu phiên mới.");
        if (req.QuestionOrder < 1)
            throw new ArgumentException("QuestionOrder không hợp lệ.");

        using var db = CreateConnection();
        await db.OpenAsync();

        var sessionUserId = await db.ExecuteScalarAsync<int?>(
            "SELECT user_id FROM dbo.game_sessions WHERE id = @id AND ended_at IS NULL",
            new { id = req.SessionId });

        if (sessionUserId != userId)
            throw new UnauthorizedAccessException("Session không hợp lệ.");

        var powerNorm = string.IsNullOrWhiteSpace(req.PowerUpUsed)
            ? null
            : NormalizePowerUpSlug(req.PowerUpUsed);
        if (string.IsNullOrEmpty(powerNorm))
            powerNorm = null;

        /* double-points: chỉ trừ túi khi trả lời đúng (xem khối sau sp_SubmitAnswer). */
        if (powerNorm is not null && powerNorm != "double-points")
        {
            await DeductPowerUpAsync(db, userId, powerNorm, req.SessionId);
            if (powerNorm == "heart")
                await RestoreOneHeartAsync(db, req.SessionId);
        }

        SpAnswerRow result;
        try
        {
            result = await db.QueryFirstAsync<SpAnswerRow>(
                "dbo.sp_SubmitAnswer",
                new
                {
                    session_id = req.SessionId,
                    question_id = req.QuestionId,
                    question_order = req.QuestionOrder,
                    chosen_index = req.ChosenIndex,
                    response_ms = req.ResponseMs,
                    power_up_used = powerNorm
                },
                commandType: CommandType.StoredProcedure);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "sp_SubmitAnswer failed for session {SessionId}", req.SessionId);
            throw;
        }

        if (powerNorm == "double-points" && result.is_correct)
            await DeductPowerUpAsync(db, userId, "double-points", req.SessionId);

        var isCorrect = result.is_correct;
        var usedPower = string.IsNullOrWhiteSpace(req.PowerUpUsed)
            ? null
            : NormalizePowerUpSlug(req.PowerUpUsed);
        if (string.IsNullOrEmpty(usedPower))
            usedPower = null;
        var loseHeartOnWrong = !isCorrect && !string.Equals(usedPower, "skip", StringComparison.OrdinalIgnoreCase);
        var hearts = await GetHeartsRemainingAsync(db, req.SessionId, loseHeartOnWrong);

        var explanation = await db.ExecuteScalarAsync<string?>(
            "SELECT explanation FROM dbo.game_questions WHERE id = @id",
            new { id = req.QuestionId });

        var totalScore = await db.ExecuteScalarAsync<int?>(
            "SELECT SUM(score_earned) FROM dbo.game_session_answers WHERE session_id = @id",
            new { id = req.SessionId }) ?? 0;

        if (hearts == 0)
            await FinalizeSessionAsync(this, db, req.SessionId);

        return new AnswerResultDto(
            isCorrect,
            result.correct_index,
            explanation,
            result.score_earned,
            result.combo,
            result.speed_bonus,
            totalScore,
            hearts);
    }

    public async Task<SessionSummaryDto> EndSessionAsync(int userId, int sessionId)
    {
        using var db = CreateConnection();
        await db.OpenAsync();

        var sessionUserId = await db.ExecuteScalarAsync<int?>(
            "SELECT user_id FROM dbo.game_sessions WHERE id = @id",
            new { id = sessionId });
        if (sessionUserId != userId)
            throw new UnauthorizedAccessException("Session không hợp lệ.");

        return await FinalizeSessionAsync(this, db, sessionId);
    }

    /// <summary>Kanji Memory chạy toàn bộ trên client; khi thắng, client gọi để cộng EXP/xu (cùng quy tắc: 10 EXP/cặp, trần 100; 1 xu/cặp).</summary>
    public async Task<KanjiMemoryCompleteResultDto> CompleteKanjiMemoryAsync(int userId, CompleteKanjiMemoryRequest req)
    {
        var total = req.TotalPairs;
        var matched = req.MatchedPairs;
        if (total is < 4 or > 8)
            throw new ArgumentException("Số cặp phải từ 4 đến 8.");
        if (matched != total)
            throw new ArgumentException("Chỉ ghi nhận phần thưởng khi ghép đủ mọi cặp.");

        var expReward = Math.Min(100, total * 10);
        var xuReward = total;
        var finalScore = Math.Min(100, (int)Math.Round(100.0 * matched / total));

        using var db = CreateConnection();
        await db.OpenAsync();
        var n = await db.ExecuteAsync(
            "UPDATE dbo.users SET exp = exp + @e, xu = xu + @x WHERE id = @u",
            new { e = expReward, x = xuReward, u = userId });
        if (n != 1)
            throw new InvalidOperationException("Không cập nhật được tài khoản.");

        try
        {
            await EvaluateTotalExpAchievementsAsync(db, userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "EvaluateTotalExpAchievementsAsync failed after Kanji Memory user {UserId}", userId);
        }

        return new KanjiMemoryCompleteResultDto(finalScore, matched, total, expReward, xuReward);
    }

    public async Task<InventoryDto> GetInventoryAsync(int userId)
    {
        const string sql = """
            SELECT p.id AS Id,
                   REPLACE(REPLACE(LOWER(LTRIM(RTRIM(p.slug))), N'_', N'-'), N' ', N'') AS Slug,
                   p.name AS Name, p.description AS Description,
                   p.effect_type AS EffectType,
                   p.xu_price AS XuPrice,
                   CAST(ISNULL(p.is_premium, 0) AS BIT) AS IsPremium,
                   ISNULL(i.quantity, 0) AS QuantityOwned
            FROM dbo.power_ups p
            LEFT JOIN dbo.user_inventory i ON i.power_up_id = p.id AND i.user_id = @uid
            WHERE ISNULL(p.is_active, 1) = 1
            ORDER BY ISNULL(p.sort_order, 0), p.id
            """;
        using var db = CreateConnection();
        await db.OpenAsync();
        await EnsureStarterInventoryIfEmptyAsync(db, userId);
        var items = await db.QueryAsync<PowerUpDto>(sql, new { uid = userId });
        return new InventoryDto(items.ToList());
    }

    public async Task<PurchasePowerUpResultDto> PurchasePowerUpAsync(int userId, PurchasePowerUpRequest req)
    {
        var norm = NormalizePowerUpSlug(req.PowerUpSlug);
        if (string.IsNullOrEmpty(norm))
            throw new ArgumentException("Thiếu mã vật phẩm (slug).");

        var qty = req.Quantity < 1 ? 1 : req.Quantity > 99 ? 99 : req.Quantity;

        using var db = CreateConnection();
        await db.OpenAsync();
        await EnsureStarterInventoryIfEmptyAsync(db, userId);

        using var tx = db.BeginTransaction();
        try
        {
            var pu = await db.QueryFirstOrDefaultAsync<PurchasePowerUpRow>(
                """
                SELECT TOP 1 id AS Id, xu_price AS XuPrice
                FROM dbo.power_ups
                WHERE ISNULL(is_active, 1) = 1
                  AND REPLACE(REPLACE(LOWER(LTRIM(RTRIM(slug))), N'_', N'-'), N' ', N'') = @slug
                """,
                new { slug = norm },
                tx);
            if (pu is null)
                throw new ArgumentException($"Không tìm thấy vật phẩm '{norm}'.");

            if (!pu.XuPrice.HasValue || pu.XuPrice.Value < 1)
                throw new InvalidOperationException("Vật phẩm này chưa được bán bằng xu.");

            var totalCost = pu.XuPrice.Value * qty;

            var paid = await db.ExecuteAsync(
                """
                UPDATE dbo.users
                SET xu = xu - @cost
                WHERE id = @uid AND xu >= @cost
                """,
                new { cost = totalCost, uid = userId },
                tx);
            if (paid != 1)
                throw new InvalidOperationException("Không đủ xu để mua.");

            var invUpd = await db.ExecuteAsync(
                """
                UPDATE dbo.user_inventory
                SET quantity = quantity + @q, updated_at = SYSUTCDATETIME()
                WHERE user_id = @uid AND power_up_id = @pid
                """,
                new { q = qty, uid = userId, pid = pu.Id },
                tx);

            if (invUpd == 0)
            {
                await db.ExecuteAsync(
                    """
                    INSERT INTO dbo.user_inventory (user_id, power_up_id, quantity, updated_at)
                    VALUES (@uid, @pid, @q, SYSUTCDATETIME())
                    """,
                    new { uid = userId, pid = pu.Id, q = qty },
                    tx);
            }

            var xuBalance = await db.ExecuteScalarAsync<int>(
                "SELECT xu FROM dbo.users WHERE id = @uid",
                new { uid = userId },
                tx);
            var quantityOwned = await db.ExecuteScalarAsync<int>(
                """
                SELECT ISNULL(quantity, 0) FROM dbo.user_inventory
                WHERE user_id = @uid AND power_up_id = @pid
                """,
                new { uid = userId, pid = pu.Id },
                tx);

            tx.Commit();
            return new PurchasePowerUpResultDto(xuBalance, quantityOwned);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<UsePowerUpResultDto> UsePowerUpAsync(int userId, UsePowerUpRequest req)
    {
        using var db = CreateConnection();
        await db.OpenAsync();

        var sessionUserId = await db.ExecuteScalarAsync<int?>(
            "SELECT user_id FROM dbo.game_sessions WHERE id = @id AND ended_at IS NULL",
            new { id = req.SessionId });
        if (sessionUserId != userId)
            throw new UnauthorizedAccessException("Session không hợp lệ.");

        var norm = NormalizePowerUpSlug(req.PowerUpSlug);
        if (string.IsNullOrEmpty(norm))
            throw new ArgumentException("Thiếu power-up slug.");

        IReadOnlyList<int>? fiftyHidden = null;
        if (norm == "fifty-fifty")
        {
            if (req.QuestionId is null or < 1)
                throw new ArgumentException("50:50 cần gửi questionId của câu hiện tại.");

            var answered = await db.ExecuteScalarAsync<int>(
                """
                SELECT COUNT(1) FROM dbo.game_session_answers
                WHERE session_id = @sid AND question_id = @qid
                """,
                new { sid = req.SessionId, qid = req.QuestionId.Value });
            if (answered > 0)
                throw new InvalidOperationException("Đã trả lời câu này — không dùng 50:50.");

            const string qSql = """
                SELECT gq.correct_index, gq.options_json
                FROM dbo.game_sessions gs
                INNER JOIN dbo.game_questions gq
                  ON gq.id = @qid AND gq.set_id = gs.set_id
                WHERE gs.id = @sid AND gs.ended_at IS NULL
                """;
            var qRows = (await db.QueryAsync<(int correct_index, string? options_json)>(
                    qSql,
                    new { sid = req.SessionId, qid = req.QuestionId.Value }))
                .ToList();
            if (qRows.Count == 0)
                throw new InvalidOperationException("Câu hỏi không thuộc phiên hiện tại.");

            var qrow = qRows[0];
            var optionCount = CountOptionEntriesFromJson(qrow.options_json);
            if (optionCount < 2)
                throw new InvalidOperationException("Câu hỏi không đủ đáp án để dùng 50:50.");

            var correct = Math.Clamp(qrow.correct_index, 0, optionCount - 1);
            fiftyHidden = PickFiftyFiftyHiddenIndices(optionCount, correct);
        }

        await DeductPowerUpAsync(db, userId, norm, req.SessionId);
        if (norm == "heart")
            await RestoreOneHeartAsync(db, req.SessionId);

        return new UsePowerUpResultDto(fiftyHidden);
    }

    private static int CountOptionEntriesFromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return 0;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Array)
                return root.GetArrayLength();
            if (root.ValueKind == JsonValueKind.Object)
            {
                if (root.TryGetProperty("options", out var o) && o.ValueKind == JsonValueKind.Array)
                    return o.GetArrayLength();
                if (root.TryGetProperty("Options", out var o2) && o2.ValueKind == JsonValueKind.Array)
                    return o2.GetArrayLength();
            }
        }
        catch (JsonException)
        {
            return 0;
        }

        return 0;
    }

    private static int[] PickFiftyFiftyHiddenIndices(int optionCount, int correctIndex)
    {
        var wrong = new List<int>(optionCount);
        for (var i = 0; i < optionCount; i++)
        {
            if (i != correctIndex)
                wrong.Add(i);
        }

        var rnd = Random.Shared;
        for (var i = wrong.Count - 1; i > 0; i--)
        {
            var j = rnd.Next(i + 1);
            (wrong[i], wrong[j]) = (wrong[j], wrong[i]);
        }

        var take = Math.Min(2, wrong.Count);
        return wrong.Take(take).ToArray();
    }

    public async Task<IReadOnlyList<LeaderboardEntryDto>> GetLeaderboardAsync(
        string? gameSlug,
        string period = "weekly",
        string sortBy = "score",
        int? levelId = null,
        int? viewerUserId = null,
        bool friendsOnly = false)
    {
        sortBy = sortBy?.Trim().ToLowerInvariant() switch
        {
            "accuracy" => "accuracy",
            "speed" => "speed",
            _ => "score"
        };

        period = period?.Trim().ToLowerInvariant() switch
        {
            "monthly" => "monthly",
            _ => "weekly"
        };

        var orderSql = sortBy switch
        {
            "accuracy" => "le.accuracy_avg DESC, le.score DESC",
            "speed" => "CASE WHEN le.avg_duration_ms IS NULL THEN 1 ELSE 0 END, le.avg_duration_ms ASC, le.score DESC",
            _ => "le.score DESC, le.accuracy_avg DESC"
        };

        using var db = CreateConnection();
        await db.OpenAsync();

        try
        {
            IReadOnlyList<int> friendIds = Array.Empty<int>();
            if (friendsOnly)
            {
                if (viewerUserId is null or <= 0)
                    return Array.Empty<LeaderboardEntryDto>();

                const string friendsSql = """
                    SELECT DISTINCT CASE WHEN f.user_id = @me THEN f.friend_id ELSE f.user_id END AS fid
                    FROM dbo.friendships f
                    WHERE f.user_id = @me OR f.friend_id = @me
                    """;
                friendIds = (await db.QueryAsync<int>(friendsSql, new { me = viewerUserId.Value })).ToList();
                if (friendIds.Count == 0)
                    return Array.Empty<LeaderboardEntryDto>();
            }

            var levelClause = levelId.HasValue
                ? "AND lp.level_id = @levelId"
                : "AND lp.level_id IS NULL";

            var friendClause = friendsOnly ? "AND le.user_id IN @friendIds" : "";

            gameSlug = string.IsNullOrWhiteSpace(gameSlug) ? null : NormalizeGameSlug(gameSlug);

            var sql = $"""
                SELECT TOP (100)
                       0 AS Rank,
                       le.user_id AS UserId,
                       ISNULL(NULLIF(LTRIM(RTRIM(up.display_name)), N''), u.username) AS DisplayName,
                       up.avatar_url AS AvatarUrl,
                       le.score AS Score,
                       ISNULL(le.accuracy_avg, 0) AS AccuracyAvg,
                       le.games_played AS GamesPlayed,
                       le.best_combo AS BestCombo,
                       le.avg_duration_ms AS AvgDurationMs,
                       lv.code AS LevelCode
                FROM dbo.leaderboard_entries le
                INNER JOIN dbo.leaderboard_periods lp ON lp.id = le.period_id
                INNER JOIN dbo.users u ON u.id = le.user_id
                LEFT JOIN dbo.user_profiles up ON up.user_id = le.user_id
                LEFT JOIN dbo.levels lv ON lv.id = u.level_id
                LEFT JOIN dbo.games g ON g.id = lp.game_id
                WHERE lp.period_type = @period
                  AND lp.starts_at <= @utcNow
                  AND (lp.ends_at IS NULL OR lp.ends_at > @utcNow)
                  AND ISNULL(LTRIM(RTRIM(LOWER(u.role))), N'user') = N'user'
                  AND ISNULL(u.is_locked, 0) = 0
                  AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'admin%'
                  AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'staff%'
                  AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'moderator%'
                  AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'demo%'
                  AND (@gameSlug IS NULL OR g.slug = @gameSlug)
                  {levelClause}
                  {friendClause}
                ORDER BY {orderSql}
                """;

            var utcNow = DateTime.UtcNow;
            var list = (await db.QueryAsync<LeaderboardEntryDto>(sql, new
            {
                period,
                gameSlug,
                levelId,
                friendIds,
                utcNow
            })).ToList();

            for (var i = 0; i < list.Count; i++)
                list[i] = list[i] with { Rank = i + 1 };
            return list;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetLeaderboardAsync failed (bảng leaderboard / user_profiles / levels chưa đồng bộ?)");
            return Array.Empty<LeaderboardEntryDto>();
        }
    }

    public async Task<IReadOnlyList<AchievementDto>> GetAchievementsAsync(int userId)
    {
        const string sql = """
            SELECT a.id AS Id, a.slug AS Slug, a.name AS Name, a.description AS Description,
                   CAST(CASE WHEN ua.id IS NULL THEN 0 ELSE 1 END AS BIT) AS Earned,
                   ua.earned_at AS EarnedAt,
                   ISNULL(a.reward_exp, 0) AS RewardExp,
                   ISNULL(a.reward_xu, 0) AS RewardXu
            FROM dbo.achievements a
            LEFT JOIN dbo.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = @uid
            WHERE ISNULL(a.is_active, 1) = 1
            ORDER BY ISNULL(a.sort_order, 0), a.id
            """;
        try
        {
            using var db = CreateConnection();
            var rows = await db.QueryAsync<AchievementDto>(sql, new { uid = userId });
            return rows.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetAchievementsAsync failed for user {UserId}", userId);
            return Array.Empty<AchievementDto>();
        }
    }

    public async Task<IReadOnlyList<ExpLeaderboardEntryDto>> GetExpLeaderboardAsync(int limit = 20)
    {
        limit = Math.Clamp(limit, 1, 100);
        const string sql = """
            SELECT TOP (@lim)
                   0 AS Rank,
                   u.id AS UserId,
                   ISNULL(NULLIF(LTRIM(RTRIM(up.display_name)), N''), u.username) AS DisplayName,
                   up.avatar_url AS AvatarUrl,
                   ISNULL(u.exp, 0) AS Exp,
                   lv.code AS LevelCode
            FROM dbo.users u
            LEFT JOIN dbo.user_profiles up ON up.user_id = u.id
            LEFT JOIN dbo.levels lv ON lv.id = u.level_id
            WHERE u.deleted_at IS NULL
              AND ISNULL(LTRIM(RTRIM(LOWER(u.role))), N'user') = N'user'
              AND ISNULL(u.is_locked, 0) = 0
              AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'admin%'
              AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'staff%'
              AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'moderator%'
              AND LOWER(ISNULL(u.username, N'')) NOT LIKE N'demo%'
            ORDER BY ISNULL(u.exp, 0) DESC, u.id ASC
            """;
        try
        {
            using var db = CreateConnection();
            var list = (await db.QueryAsync<ExpLeaderboardEntryDto>(sql, new { lim = limit })).ToList();
            for (var i = 0; i < list.Count; i++)
                list[i] = list[i] with { Rank = i + 1 };
            return list;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetExpLeaderboardAsync failed");
            return Array.Empty<ExpLeaderboardEntryDto>();
        }
    }

    public async Task<DailyChallengeDto?> GetTodayChallengeAsync(int userId)
    {
        var today = DateTime.UtcNow.Date;
        const string sql = """
            SELECT dc.id AS Id, g.slug AS GameSlug, dc.title AS Title,
                   dc.bonus_exp AS BonusExp, dc.bonus_xu AS BonusXu,
                   CAST(CASE WHEN udc.completed_at IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS CompletedToday,
                   udc.best_score AS BestScore
            FROM dbo.daily_challenges dc
            INNER JOIN dbo.games g ON g.id = dc.game_id
            LEFT JOIN dbo.user_daily_challenges udc
                   ON udc.daily_challenge_id = dc.id AND udc.user_id = @uid
            WHERE dc.challenge_date = @today AND ISNULL(dc.is_active, 1) = 1
            """;
        try
        {
            using var db = CreateConnection();
            return await db.QueryFirstOrDefaultAsync<DailyChallengeDto>(sql, new { uid = userId, today });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GetTodayChallengeAsync failed for user {UserId}", userId);
            return null;
        }
    }

    public async Task<PvpRoomDto> CreatePvpRoomAsync(int userId, CreatePvpRoomRequest req)
    {
        using var db = CreateConnection();
        await db.OpenAsync();

        var slug = NormalizeGameSlug(req.GameSlug);
        var gameId = await db.ExecuteScalarAsync<int?>(
            "SELECT id FROM dbo.games WHERE slug = @slug AND ISNULL(is_active, 1) = 1",
            new { slug });
        if (gameId is null)
            throw new ArgumentException($"Game '{slug}' không tồn tại hoặc chưa kích hoạt.");

        var roomCode = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        if (req.LevelId.HasValue)
        {
            await db.ExecuteAsync(
                """
                INSERT INTO dbo.pvp_rooms (room_code, game_id, host_user_id, level_id, status)
                VALUES (@code, @gid, @uid, @lid, N'waiting')
                """,
                new { code = roomCode, gid = gameId, uid = userId, lid = req.LevelId.Value });
        }
        else
        {
            await db.ExecuteAsync(
                """
                INSERT INTO dbo.pvp_rooms (room_code, game_id, host_user_id, status)
                VALUES (@code, @gid, @uid, N'waiting')
                """,
                new { code = roomCode, gid = gameId, uid = userId });
        }

        var room = await GetPvpRoomByCodeAsync(db, roomCode);
        return room ?? throw new InvalidOperationException("Không đọc lại được phòng PvP vừa tạo.");
    }

    public async Task<PvpRoomDto> JoinPvpRoomAsync(int userId, JoinPvpRoomRequest req)
    {
        using var db = CreateConnection();
        await db.OpenAsync();

        var roomId = await db.ExecuteScalarAsync<int?>(
            """
            SELECT id FROM dbo.pvp_rooms
            WHERE room_code = @code AND status = N'waiting' AND guest_user_id IS NULL
            """,
            new { code = req.RoomCode.Trim().ToUpperInvariant() });

        if (roomId is null)
            throw new InvalidOperationException("Phòng không tồn tại, đã đầy hoặc đã bắt đầu.");

        await db.ExecuteAsync(
            """
            UPDATE dbo.pvp_rooms
            SET guest_user_id = @uid, status = N'active', started_at = SYSUTCDATETIME()
            WHERE id = @rid
            """,
            new { uid = userId, rid = roomId });

        var room = await GetPvpRoomByCodeAsync(db, req.RoomCode.Trim().ToUpperInvariant());
        return room ?? throw new InvalidOperationException("Không đọc lại được phòng PvP.");
    }

    public async Task<PvpRoomDto?> GetPvpRoomAsync(string roomCode)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        return await GetPvpRoomByCodeAsync(db, roomCode.Trim().ToUpperInvariant());
    }

    public async Task<IReadOnlyList<SessionSummaryDto>> GetHistoryAsync(int userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var offset = (page - 1) * pageSize;

        const string sql = """
            SELECT gs.id AS SessionId,
                   gs.score AS FinalScore,
                   gs.correct_count AS CorrectCount,
                   gs.total_questions AS TotalQuestions,
                   CAST(CASE WHEN gs.total_questions > 0
                        THEN (gs.correct_count * 100.0 / gs.total_questions)
                        ELSE 0 END AS DECIMAL(5,2)) AS AccuracyPercent,
                   ISNULL(gs.max_combo, 0) AS MaxCombo,
                   ISNULL(gs.time_spent_seconds, 0) AS TimeSpentSeconds,
                   ISNULL(gs.exp_earned, 0) AS ExpEarned,
                   ISNULL(gs.xu_earned, 0) AS XuEarned,
                   CAST(N'completed' AS NVARCHAR(32)) AS Result
            FROM dbo.game_sessions gs
            WHERE gs.user_id = @uid AND gs.ended_at IS NOT NULL
            ORDER BY gs.started_at DESC
            OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
            """;

        using var db = CreateConnection();
        var rows = await db.QueryAsync<SessionSummaryDto>(sql, new { uid = userId, offset, size = pageSize });
        return rows.ToList();
    }

    private static async Task<SessionSummaryDto> FinalizeSessionAsync(GameService self, SqlConnection db, int sessionId)
    {
        var existing = await db.QueryFirstOrDefaultAsync<SpEndRow>(
            """
            SELECT score AS final_score, correct_count, total_questions,
                   CAST(CASE WHEN total_questions > 0 THEN (correct_count * 100.0 / total_questions) ELSE 0 END AS DECIMAL(5,2)) AS accuracy_percent,
                   ISNULL(max_combo, 0) AS max_combo,
                   ISNULL(time_spent_seconds, 0) AS time_spent_seconds,
                   ISNULL(exp_earned, 0) AS exp_earned,
                   ISNULL(xu_earned, 0) AS xu_earned
            FROM dbo.game_sessions
            WHERE id = @id AND ended_at IS NOT NULL
            """,
            new { id = sessionId });

        if (existing is not null)
            return MapEndResult(sessionId, existing);

        var result = await db.QueryFirstAsync<SpEndRow>(
            "dbo.sp_EndGameSession",
            new { session_id = sessionId },
            commandType: CommandType.StoredProcedure);

        /* Cột result có thể chưa có trên DB cũ — lỗi 207 sẽ làm hỏng cả kết thúc phiên. */
        try
        {
            await db.ExecuteAsync(
                "UPDATE dbo.game_sessions SET result = N'completed' WHERE id = @id AND result IS NULL",
                new { id = sessionId });
        }
        catch (SqlException ex)
        {
            self._logger.LogWarning(ex, "Bỏ qua cập nhật game_sessions.result (thiếu cột hoặc lỗi SQL) session {SessionId}", sessionId);
        }

        try
        {
            await self.AfterGameSessionCompletedAsync(db, sessionId, result);
        }
        catch (Exception ex)
        {
            self._logger.LogWarning(ex, "AfterGameSessionCompleted failed for session {SessionId}", sessionId);
        }

        return MapEndResult(sessionId, result);
    }

    private static SessionSummaryDto MapEndResult(int sessionId, SpEndRow r) =>
        new(
            sessionId,
            r.final_score,
            r.correct_count,
            r.total_questions,
            r.accuracy_percent,
            r.max_combo,
            r.time_spent_seconds,
            r.exp_earned,
            r.xu_earned,
            "completed");

    private static async Task<int> GetHeartsRemainingAsync(SqlConnection db, int sessionId, bool loseHeart)
    {
        var session = await db.QueryFirstAsync<(int? hearts_remaining, int hearts_lost, int game_id)>(
            "SELECT hearts_remaining, ISNULL(hearts_lost, 0), game_id FROM dbo.game_sessions WHERE id = @id",
            new { id = sessionId });

        var maxHearts = await db.ExecuteScalarAsync<int>(
            "SELECT ISNULL(max_hearts, 3) FROM dbo.games WHERE id = @id",
            new { id = session.game_id });

        if (!loseHeart)
            return session.hearts_remaining ?? maxHearts;

        var current = session.hearts_remaining ?? maxHearts;
        var newVal = Math.Max(0, current - 1);

        await db.ExecuteAsync(
            """
            UPDATE dbo.game_sessions
            SET hearts_remaining = @h,
                hearts_lost = ISNULL(hearts_lost, 0) + 1
            WHERE id = @id
            """,
            new { h = newVal, id = sessionId });

        return newVal;
    }

    private static async Task RestoreOneHeartAsync(SqlConnection db, int sessionId)
    {
        await db.ExecuteAsync(
            """
            UPDATE gs
            SET gs.hearts_remaining = CASE
                WHEN gs.hearts_remaining IS NULL THEN g.max_hearts
                WHEN gs.hearts_remaining + 1 > g.max_hearts THEN g.max_hearts
                ELSE gs.hearts_remaining + 1
            END
            FROM dbo.game_sessions gs
            INNER JOIN dbo.games g ON g.id = gs.game_id
            WHERE gs.id = @sid
            """,
            new { sid = sessionId });
    }

    private async Task DeductPowerUpAsync(SqlConnection db, int userId, string normalizedSlug, int sessionId)
    {
        var powerUpId = await db.ExecuteScalarAsync<int?>(
            """
            SELECT TOP 1 id FROM dbo.power_ups
            WHERE ISNULL(is_active, 1) = 1
              AND REPLACE(REPLACE(LOWER(LTRIM(RTRIM(slug))), N'_', N'-'), N' ', N'') = @slug
            """,
            new { slug = normalizedSlug });
        if (powerUpId is null)
            throw new ArgumentException($"Power-up '{normalizedSlug}' không tồn tại.");

        var qty = await db.ExecuteScalarAsync<int>(
            """
            SELECT ISNULL(
                (SELECT quantity FROM dbo.user_inventory WHERE user_id = @uid AND power_up_id = @pid), 0)
            """,
            new { uid = userId, pid = powerUpId });

        if (qty <= 0)
            throw new InvalidOperationException($"Không đủ vật phẩm '{normalizedSlug}' trong túi đồ.");

        await db.ExecuteAsync(
            """
            UPDATE dbo.user_inventory
            SET quantity = quantity - 1, updated_at = SYSUTCDATETIME()
            WHERE user_id = @uid AND power_up_id = @pid AND quantity > 0
            """,
            new { uid = userId, pid = powerUpId });

        await db.ExecuteAsync(
            """
            INSERT INTO dbo.game_session_powerups (session_id, power_up_id, used_at_order, used_at)
            SELECT @sid, @pid,
                   ISNULL((SELECT MAX(used_at_order) FROM dbo.game_session_powerups WHERE session_id = @sid), 0) + 1,
                   SYSUTCDATETIME()
            """,
            new { sid = sessionId, pid = powerUpId });
    }

    private static async Task<PvpRoomDto?> GetPvpRoomByCodeAsync(SqlConnection db, string code)
    {
        return await db.QueryFirstOrDefaultAsync<PvpRoomDto>(
            """
            SELECT r.id AS RoomId, r.room_code AS RoomCode, r.status AS Status,
                   r.host_user_id AS HostUserId,
                   ISNULL(up.display_name, hu.username) AS HostDisplayName,
                   r.guest_user_id AS GuestUserId,
                   ISNULL(gp.display_name, gu.username) AS GuestDisplayName
            FROM dbo.pvp_rooms r
            INNER JOIN dbo.users hu ON hu.id = r.host_user_id
            LEFT JOIN dbo.user_profiles up ON up.user_id = r.host_user_id
            LEFT JOIN dbo.users gu ON gu.id = r.guest_user_id
            LEFT JOIN dbo.user_profiles gp ON gp.user_id = r.guest_user_id
            WHERE r.room_code = @code
            """,
            new { code });
    }

    private sealed class SpStartRow
    {
        public int session_id { get; set; }
        public int max_hearts { get; set; }
        public int? set_id { get; set; }
    }

    private sealed class SpQuestionRow
    {
        public int id { get; set; }
        public string question_type { get; set; } = null!;
        public string? question_text { get; set; }
        public string? hint_text { get; set; }
        public string? audio_url { get; set; }
        public string? image_url { get; set; }
        public string? options_json { get; set; }
        public int base_score { get; set; }
        public int difficulty { get; set; }
    }

    private sealed class SpAnswerRow
    {
        public bool is_correct { get; set; }
        public int? correct_index { get; set; }
        public int score_earned { get; set; }
        public int combo { get; set; }
        public int speed_bonus { get; set; }
    }

    private sealed class SpEndRow
    {
        public int final_score { get; set; }
        public int correct_count { get; set; }
        public int total_questions { get; set; }
        public decimal accuracy_percent { get; set; }
        public int max_combo { get; set; }
        public int time_spent_seconds { get; set; }
        public int exp_earned { get; set; }
        public int xu_earned { get; set; }
    }

    private sealed class PurchasePowerUpRow
    {
        public int Id { get; set; }
        public int? XuPrice { get; set; }
    }
}
