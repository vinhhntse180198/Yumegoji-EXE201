using System;
using System.Security.Claims;
using System.Threading.Tasks;
using backend.Authorization;
using backend.DTOs.Auth;
using backend.DTOs.User;
using backend.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace backend.Controllers;

/// <summary>API Mô-đun 1: Xác thực – Đăng ký, đăng nhập, xác minh email, quên mật khẩu.</summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService authService, IWebHostEnvironment env)
    {
        _authService = authService;
        _env = env;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("users")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _authService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("users/{id:int}")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> GetUserById(int id)
    {
        var currentUserIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(currentUserIdString, out var currentUserId);
        var isAdmin = User.IsInRole(AppRoles.Admin);

        if (!isAdmin && currentUserId != id)
        {
            return Forbid();
        }

        var user = await _authService.GetUserByIdAsync(id);
        if (user == null) return NotFound();

        return Ok(user);
    }

    [HttpPut("users/{id:int}")]
    [Authorize(Policy = AuthPolicies.Member)]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var currentUserIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(currentUserIdString, out var currentUserId);
        var isAdmin = User.IsInRole(AppRoles.Admin);

        if (!isAdmin && currentUserId != id)
        {
            return Forbid();
        }

        var updated = await _authService.UpdateUserAsync(id, request);
        if (updated == null) return NotFound();

        return Ok(updated);
    }

    [HttpDelete("users/{id:int}")]
    [Authorize(Policy = AuthPolicies.AdminOnly)]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _ = int.TryParse(sub, out var adminId);
        if (adminId != 0 && id == adminId)
            return BadRequest(new { message = "Không thể xóa tài khoản admin đang đăng nhập." });

        try
        {
            var ok = await _authService.DeleteUserAsync(id);
            if (!ok) return NotFound();

            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            var sqlEx = ex.InnerException as SqlException ?? ex.InnerException?.InnerException as SqlException;
            var detail = _env.IsDevelopment() && sqlEx != null
                ? $"#{sqlEx.Number}: {sqlEx.Message}"
                : null;
            return Conflict(new
            {
                message =
                    "Không thể xóa tài khoản: còn dữ liệu liên quan trên database (ràng buộc khóa ngoại). Kiểm tra log server hoặc dọn bảng trỏ tới user này.",
                detail
            });
        }
    }
}

