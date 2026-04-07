namespace backend.DTOs.Game;

/// <summary>Yêu cầu mở phiên game. <see cref="SetId"/>: null/bỏ field hoặc ≤0 = tự chọn bộ đề + cho phép nhánh bài học.</summary>
public record StartSessionRequest(
    string GameSlug,
    int? SetId,
    string Mode = "solo",
    int? QuestionCount = null,
    bool? UseLessonVocabulary = null);

public record SubmitAnswerRequest(
    int SessionId,
    int QuestionId,
    int QuestionOrder,
    int? ChosenIndex,
    int? ResponseMs,
    string? PowerUpUsed);

public record UsePowerUpRequest(int SessionId, string PowerUpSlug);

public record PurchasePowerUpRequest(string PowerUpSlug, int Quantity = 1);

/// <summary>Sau khi mua: số xu còn lại và số lượng vật phẩm trong túi.</summary>
public record PurchasePowerUpResultDto(int XuBalance, int QuantityOwned);

/// <summary>Kanji Memory chơi offline trên client — chỉ gọi khi đã ghép đủ cặp.</summary>
public record CompleteKanjiMemoryRequest(int TotalPairs, int MatchedPairs);

public record KanjiMemoryCompleteResultDto(
    int FinalScore,
    int CorrectCount,
    int TotalPairs,
    int ExpEarned,
    int XuEarned);

public record CreatePvpRoomRequest(string GameSlug, int? LevelId);

public record JoinPvpRoomRequest(string RoomCode);

public record QuestionDto(
    int Id,
    string QuestionType,
    string? QuestionText,
    string? HintText,
    string? AudioUrl,
    string? ImageUrl,
    string OptionsJson,
    int BaseScore,
    int Difficulty);

public record StartSessionResponse(
    int SessionId,
    int MaxHearts,
    int TimePerQuestionSeconds,
    IReadOnlyList<QuestionDto> Questions);

public record AnswerResultDto(
    bool IsCorrect,
    int? CorrectAnswerIndex,
    string? Explanation,
    int ScoreEarned,
    int ComboCount,
    int SpeedBonus,
    int TotalScoreSoFar,
    int HeartsRemaining);

public record SessionSummaryDto(
    int SessionId,
    int FinalScore,
    int CorrectCount,
    int TotalQuestions,
    decimal AccuracyPercent,
    int MaxCombo,
    int TimeSpentSeconds,
    int ExpEarned,
    int XuEarned,
    string Result);

public record GameInfoDto(
    int Id,
    string Slug,
    string Name,
    string? Description,
    string? SkillType,
    int MaxHearts,
    bool IsPvp,
    bool IsBossMode,
    int SortOrder,
    string? LevelMin,
    string? LevelMax);

public record CreateGameAdminRequest(
    string Slug,
    string Name,
    string? Description,
    string? SkillType,
    int MaxHearts = 3,
    bool IsPvp = false,
    bool IsBossMode = false,
    int SortOrder = 0,
    string? LevelMin = null,
    string? LevelMax = null);

public record PowerUpDto(
    int Id,
    string Slug,
    string Name,
    string? Description,
    string EffectType,
    int? XuPrice,
    bool IsPremium,
    int QuantityOwned);

public record InventoryDto(IReadOnlyList<PowerUpDto> Items);

public record LeaderboardEntryDto(
    int Rank,
    int UserId,
    string DisplayName,
    string? AvatarUrl,
    int Score,
    decimal AccuracyAvg,
    int GamesPlayed,
    int BestCombo,
    int? AvgDurationMs = null,
    string? LevelCode = null);

public record AchievementDto(
    int Id,
    string Slug,
    string Name,
    string? Description,
    bool Earned,
    DateTime? EarnedAt,
    int RewardExp = 0,
    int RewardXu = 0);

/// <summary>BXH tổng EXP trên tài khoản (users.exp).</summary>
public record ExpLeaderboardEntryDto(
    int Rank,
    int UserId,
    string DisplayName,
    string? AvatarUrl,
    int Exp,
    string? LevelCode);

public record DailyChallengeDto(
    int Id,
    string GameSlug,
    string Title,
    int BonusExp,
    int BonusXu,
    bool CompletedToday,
    int? BestScore);

public record PvpRoomDto(
    int RoomId,
    string RoomCode,
    string Status,
    int HostUserId,
    string HostDisplayName,
    int? GuestUserId,
    string? GuestDisplayName);

public record GameApiError(string Code, string Message);
