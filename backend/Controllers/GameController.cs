using System.Security.Claims;
using backend.Authorization;
using backend.DTOs.Game;
using backend.Services.Game;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace backend.Controllers;

/// <summary>API mô-đun Game — Dapper + stored procedure (sp_StartGameSession, sp_SubmitAnswer, sp_EndGameSession).</summary>
[ApiController]
[Route("api/game")]
public class GameController : ControllerBase
{
    private readonly IGameService _game;

    public GameController(IGameService game)
    {
        _game = game;
    }

    private int GetUserId()
    {
        var s = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(s, out var id) || id == 0)
            throw new UnauthorizedAccessException("Thiếu hoặc sai claim user id trong JWT.");
        return id;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<GameInfoDto>>> GetGames()
    {
        return Ok(await _game.GetGamesAsync());
    }

    [HttpGet("admin/games")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<GameInfoDto>>> GetAdminGames()
    {
        return Ok(await _game.GetAdminGamesAsync());
    }

    [HttpPost("admin/games")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<ActionResult<GameInfoDto>> CreateGame([FromBody] CreateGameAdminRequest body)
    {
        try
        {
            return Ok(await _game.CreateGameAsync(body));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("GAME_ADMIN", ex.Message));
        }
    }

    [HttpDelete("admin/games/{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<IActionResult> DeleteGame(int id)
    {
        var ok = await _game.DeleteGameAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("session/start")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<StartSessionResponse>> StartSession([FromBody] StartSessionRequest req)
    {
        try
        {
            return Ok(await _game.StartSessionAsync(GetUserId(), req));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("GAME_ERROR", ex.Message));
        }
    }

    [HttpPost("session/answer")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<AnswerResultDto>> SubmitAnswer([FromBody] SubmitAnswerRequest req)
    {
        try
        {
            return Ok(await _game.SubmitAnswerAsync(GetUserId(), req));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new GameApiError("SESSION_INVALID", "Session không thuộc tài khoản này."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("POWERUP_ERROR", ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new GameApiError("POWERUP_ERROR", ex.Message));
        }
        catch (SqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new GameApiError("GAME_ANSWER_SQL", ex.Message));
        }
    }

    [HttpPost("session/{sessionId:int}/end")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<SessionSummaryDto>> EndSession(int sessionId)
    {
        try
        {
            return Ok(await _game.EndSessionAsync(GetUserId(), sessionId));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new GameApiError("SESSION_INVALID", "Session không thuộc tài khoản này."));
        }
        catch (SqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new GameApiError("GAME_END_SQL", ex.Message));
        }
    }

    [HttpPost("kanji-memory/complete")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<KanjiMemoryCompleteResultDto>> CompleteKanjiMemory([FromBody] CompleteKanjiMemoryRequest req)
    {
        try
        {
            return Ok(await _game.CompleteKanjiMemoryAsync(GetUserId(), req));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new GameApiError("KANJI_MEMORY", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("KANJI_MEMORY", ex.Message));
        }
        catch (SqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new GameApiError("KANJI_MEMORY_SQL", ex.Message));
        }
    }

    [HttpGet("inventory")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<InventoryDto>> GetInventory()
    {
        return Ok(await _game.GetInventoryAsync(GetUserId()));
    }

    [HttpPost("inventory/purchase")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PurchasePowerUpResultDto>> PurchasePowerUp([FromBody] PurchasePowerUpRequest req)
    {
        try
        {
            return Ok(await _game.PurchasePowerUpAsync(GetUserId(), req));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new GameApiError("SHOP_ERROR", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("SHOP_ERROR", ex.Message));
        }
        catch (SqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new GameApiError("SHOP_SQL", ex.Message));
        }
    }

    [HttpPost("inventory/use")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<UsePowerUpResultDto>> UsePowerUp([FromBody] UsePowerUpRequest req)
    {
        try
        {
            return Ok(await _game.UsePowerUpAsync(GetUserId(), req));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new GameApiError("SESSION_INVALID", "Session không hợp lệ."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("POWERUP_ERROR", ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new GameApiError("POWERUP_ERROR", ex.Message));
        }
    }

    [HttpGet("leaderboard")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntryDto>>> GetLeaderboard(
        [FromQuery] string? gameSlug,
        [FromQuery] string period = "weekly",
        [FromQuery] string sortBy = "score",
        [FromQuery] int? levelId = null,
        [FromQuery] bool friendsOnly = false)
    {
        int? viewerId = null;
        if (friendsOnly)
        {
            if (User?.Identity?.IsAuthenticated != true)
            {
                return Unauthorized(new GameApiError("AUTH_REQUIRED",
                    "Cần đăng nhập để xem bảng xếp hạng bạn bè."));
            }

            viewerId = GetUserId();
        }

        return Ok(await _game.GetLeaderboardAsync(gameSlug, period, sortBy, levelId, viewerId, friendsOnly));
    }

    [HttpGet("achievements")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<IReadOnlyList<AchievementDto>>> GetMyAchievements()
    {
        var uid = GetUserId();
        try
        {
            await _game.RefreshTotalExpAchievementsForUserAsync(uid);
        }
        catch
        {
            /* bỏ qua nếu DB chưa seed achievements */
        }

        return Ok(await _game.GetAchievementsAsync(uid));
    }

    /// <summary>Top người chơi theo EXP tích lũy (bảng users.exp).</summary>
    [HttpGet("exp-leaderboard")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ExpLeaderboardEntryDto>>> GetExpLeaderboard([FromQuery] int limit = 20)
    {
        return Ok(await _game.GetExpLeaderboardAsync(limit));
    }

    [HttpGet("daily-challenge")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<DailyChallengeDto>> GetDailyChallenge()
    {
        var dto = await _game.GetTodayChallengeAsync(GetUserId());
        return dto is null ? NoContent() : Ok(dto);
    }

    [HttpPost("pvp/create")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PvpRoomDto>> CreatePvpRoom([FromBody] CreatePvpRoomRequest req)
    {
        try
        {
            var room = await _game.CreatePvpRoomAsync(GetUserId(), req);
            return CreatedAtAction(nameof(GetPvpRoom), new { code = room.RoomCode }, room);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new GameApiError("GAME_NOT_FOUND", ex.Message));
        }
    }

    [HttpPost("pvp/join")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PvpRoomDto>> JoinPvpRoom([FromBody] JoinPvpRoomRequest req)
    {
        try
        {
            return Ok(await _game.JoinPvpRoomAsync(GetUserId(), req));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new GameApiError("ROOM_ERROR", ex.Message));
        }
    }

    [HttpGet("pvp/{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<PvpRoomDto>> GetPvpRoom(string code)
    {
        var room = await _game.GetPvpRoomAsync(code);
        return room is null ? NotFound() : Ok(room);
    }

    [HttpGet("history")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<IReadOnlyList<SessionSummaryDto>>> GetHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _game.GetHistoryAsync(GetUserId(), page, pageSize));
    }
}
