using backend.DTOs.Game;

namespace backend.Services.Game;

public interface IGameService
{
    Task<IReadOnlyList<GameInfoDto>> GetGamesAsync();
    Task<IReadOnlyList<GameInfoDto>> GetAdminGamesAsync();
    Task<GameInfoDto> CreateGameAsync(CreateGameAdminRequest req);
    Task<bool> DeleteGameAsync(int gameId);
    Task<StartSessionResponse> StartSessionAsync(int userId, StartSessionRequest req);
    Task<AnswerResultDto> SubmitAnswerAsync(int userId, SubmitAnswerRequest req);
    Task<SessionSummaryDto> EndSessionAsync(int userId, int sessionId);
    Task<InventoryDto> GetInventoryAsync(int userId);
    Task<PurchasePowerUpResultDto> PurchasePowerUpAsync(int userId, PurchasePowerUpRequest req);
    Task<KanjiMemoryCompleteResultDto> CompleteKanjiMemoryAsync(int userId, CompleteKanjiMemoryRequest req);
    Task<UsePowerUpResultDto> UsePowerUpAsync(int userId, UsePowerUpRequest req);
    Task<IReadOnlyList<LeaderboardEntryDto>> GetLeaderboardAsync(
        string? gameSlug,
        string period = "weekly",
        string sortBy = "score",
        int? levelId = null,
        int? viewerUserId = null,
        bool friendsOnly = false);

    Task<IReadOnlyList<AchievementDto>> GetAchievementsAsync(int userId);
    /// <summary>Đánh giá lại thành tích mốc EXP (total_exp) — dùng backfill sau khi seed DB.</summary>
    Task RefreshTotalExpAchievementsForUserAsync(int userId);
    Task<IReadOnlyList<ExpLeaderboardEntryDto>> GetExpLeaderboardAsync(int limit = 20);
    Task<DailyChallengeDto?> GetTodayChallengeAsync(int userId);
    Task<PvpRoomDto> CreatePvpRoomAsync(int userId, CreatePvpRoomRequest req);
    Task<PvpRoomDto> JoinPvpRoomAsync(int userId, JoinPvpRoomRequest req);
    Task<PvpRoomDto?> GetPvpRoomAsync(string roomCode);
    Task<IReadOnlyList<SessionSummaryDto>> GetHistoryAsync(int userId, int page = 1, int pageSize = 20);
}
