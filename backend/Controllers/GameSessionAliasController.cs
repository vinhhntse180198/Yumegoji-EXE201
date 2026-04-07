using System.Security.Claims;
using backend.Authorization;
using backend.DTOs.Game;
using backend.Services.Game;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace backend.Controllers;

/// <summary>
/// Một số proxy/client cũ gọi <c>/api/game-session/{id}/end</c> thay vì <c>/api/game/session/{id}/end</c>.
/// Giữ endpoint này để tránh 404/500 do sai đường dẫn.
/// </summary>
[ApiController]
[Route("api/game-session")]
public class GameSessionAliasController : ControllerBase
{
    private readonly IGameService _game;

    public GameSessionAliasController(IGameService game)
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

    [HttpPost("{sessionId:int}/end")]
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
}
