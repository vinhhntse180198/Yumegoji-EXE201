using System.Threading.Tasks;
using backend.DTOs.Admin;
using backend.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Endpoint công khai (không cần đăng nhập) cho banner client.</summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    /// <summary>Thông báo đã xuất bản mới nhất (hoặc announcement = null).</summary>
    [HttpGet("system-announcements/latest")]
    public async Task<ActionResult<object>> GetLatestSystemAnnouncement([FromServices] IAdminService admin)
    {
        SystemAnnouncementPublicDto? dto = await admin.GetLatestPublishedAnnouncementAsync();
        return Ok(new { announcement = dto });
    }
}
