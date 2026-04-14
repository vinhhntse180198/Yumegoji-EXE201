using System;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.Data;
using backend.DTOs.User;
using backend.Models.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>Hồ sơ người dùng đang đăng nhập (display name, avatar,...).</summary>
[ApiController]
[Route("api/users/me/profile")]
[Authorize(Policy = AuthPolicies.Member)]
public class MeProfileController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public MeProfileController(ApplicationDbContext db)
    {
        _db = db;
    }

    private int GetUserId()
    {
        var s = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(s, out var id) ? id : 0;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        if (userId == 0) return Unauthorized();

        var isPremium = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.IsPremium)
            .FirstOrDefaultAsync();

        var profile = await _db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            return Ok(new
            {
                userId,
                isPremium,
                displayName = (string?)null,
                avatarUrl = (string?)null,
                coverUrl = (string?)null,
                bio = (string?)null,
                dateOfBirth = (DateTime?)null,
                theme = (string?)null
            });
        }

        return Ok(new
        {
            userId = profile.UserId,
            isPremium,
            displayName = profile.DisplayName,
            avatarUrl = profile.AvatarUrl,
            coverUrl = profile.CoverUrl,
            bio = profile.Bio,
            dateOfBirth = profile.DateOfBirth,
            theme = profile.Theme
        });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateMyProfileRequest request)
    {
        var userId = GetUserId();
        if (userId == 0) return Unauthorized();

        var now = DateTime.UtcNow;
        var profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };
            await _db.UserProfiles.AddAsync(profile);
        }

        if (request.DisplayName != null)
        {
            profile.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName;
        }

        if (request.AvatarUrl != null)
        {
            profile.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl;
        }

        if (request.CoverUrl != null)
        {
            profile.CoverUrl = string.IsNullOrWhiteSpace(request.CoverUrl) ? null : request.CoverUrl;
        }

        if (request.Bio != null)
        {
            profile.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio;
        }

        if (request.DateOfBirth.HasValue)
        {
            profile.DateOfBirth = request.DateOfBirth;
        }

        if (request.Theme != null)
        {
            profile.Theme = string.IsNullOrWhiteSpace(request.Theme) ? null : request.Theme;
        }

        profile.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            userId = profile.UserId,
            displayName = profile.DisplayName,
            avatarUrl = profile.AvatarUrl,
            coverUrl = profile.CoverUrl,
            bio = profile.Bio,
            dateOfBirth = profile.DateOfBirth,
            theme = profile.Theme
        });
    }
}
