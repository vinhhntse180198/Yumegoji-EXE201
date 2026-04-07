using System.Security.Claims;
using backend.Authorization;
using backend.DTOs.Payment;
using backend.Services.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>API Mô-đun 9: Thanh toán – Gói Premium, vật phẩm game.</summary>
[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _payment;

    public PaymentController(IPaymentService payment)
    {
        _payment = payment;
    }

    private int GetUserId()
    {
        var s = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(s, out var id) ? id : 0;
    }

    [HttpGet("premium/config")]
    [AllowAnonymous]
    public async Task<ActionResult<PremiumConfigDto>> GetPremiumConfig()
    {
        return Ok(await _payment.GetPremiumConfigAsync());
    }

    [HttpPost("premium/intent")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PremiumIntentDto>> CreatePremiumIntent([FromBody] CreatePremiumIntentRequest _)
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        try
        {
            return Ok(await _payment.CreatePremiumIntentAsync(uid));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("premium/confirm")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PremiumIntentDto>> ConfirmPremiumIntent([FromBody] ConfirmPremiumPaymentRequest body)
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        try
        {
            var dto = await _payment.ConfirmPremiumIntentAsync(uid, body.Token);
            return dto is null ? NotFound(new { message = "Không tìm thấy yêu cầu theo token." }) : Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("premium/me/latest")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<ActionResult<PremiumIntentDto>> GetMyLatestPremiumIntent()
    {
        var uid = GetUserId();
        if (uid == 0) return Unauthorized();
        var dto = await _payment.GetLatestPremiumIntentAsync(uid);
        return dto is null ? NoContent() : Ok(dto);
    }

    [HttpGet("admin/premium/config")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<ActionResult<PremiumConfigDto>> AdminGetPremiumConfig()
    {
        return Ok(await _payment.GetPremiumConfigAsync());
    }

    [HttpPut("admin/premium/config")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<ActionResult<PremiumConfigDto>> AdminUpdatePremiumConfig([FromBody] UpdatePremiumConfigRequest body)
    {
        return Ok(await _payment.AdminUpdatePremiumConfigAsync(body));
    }

    [HttpGet("admin/premium/requests")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<PremiumRequestDto>>> AdminListPremiumRequests([FromQuery] string status = "pending_review")
    {
        return Ok(await _payment.AdminListPremiumRequestsAsync(status));
    }

    [HttpPost("admin/premium/requests/{id:int}/approve")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<IActionResult> AdminApproveRequest(int id, [FromBody] ResolvePremiumRequest body)
    {
        var ok = await _payment.AdminApprovePremiumRequestAsync(id, GetUserId(), body.Note);
        return ok ? Ok(new { ok = true }) : NotFound();
    }

    [HttpPost("admin/premium/requests/{id:int}/reject")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<IActionResult> AdminRejectRequest(int id, [FromBody] ResolvePremiumRequest body)
    {
        var ok = await _payment.AdminRejectPremiumRequestAsync(id, GetUserId(), body.Note);
        return ok ? Ok(new { ok = true }) : NotFound();
    }
}
