using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using backend.Authorization;
using backend.Data;
using backend.DTOs.Auth;
using backend.DTOs.User;
using backend.Models.User;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using BC = BCrypt.Net.BCrypt;

namespace backend.Services.Auth;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Username == request.Username || u.Email == request.Email))
        {
            throw new InvalidOperationException("Username hoặc email đã tồn tại.");
        }

        var now = DateTime.UtcNow;

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BC.HashPassword(request.Password),
            Role = "user",
            CreatedAt = now,
            UpdatedAt = now
        };

        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var needsPlacement = !ShouldSkipPlacementTest(user) &&
                               !await _db.PlacementResults.AnyAsync(r => r.UserId == user.Id);

        return new AuthResponse
        {
            AccessToken = token,
            User = MapToDto(user),
            NeedsPlacementTest = needsPlacement
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var loginKey = !string.IsNullOrWhiteSpace(request.UsernameOrEmail)
            ? request.UsernameOrEmail.Trim()
            : request.Email?.Trim();
        if (string.IsNullOrEmpty(loginKey))
            throw new InvalidOperationException("Vui lòng nhập email hoặc tên đăng nhập.");

        if (string.IsNullOrEmpty(request.Password))
            throw new InvalidOperationException("Vui lòng nhập mật khẩu.");

        var user = await _db.Users
            .Where(u => u.DeletedAt == null)
            .FirstOrDefaultAsync(u =>
                u.Username == loginKey ||
                u.Email == loginKey);

        if (user == null)
            throw new InvalidOperationException("Tài khoản không tồn tại.");

        if (user.IsLocked)
            throw new InvalidOperationException("Tài khoản đã bị khóa.");

        var passwordOk = false;
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            try
            {
                passwordOk = BC.Verify(request.Password, user.PasswordHash);
            }
            catch
            {
                // Hash trong DB không phải bcrypt hợp lệ — coi như sai mật khẩu, tránh 500.
                passwordOk = false;
            }
        }

        if (!passwordOk)
            throw new InvalidOperationException("Mật khẩu không đúng.");

        var now = DateTime.UtcNow;
        var today = now.Date;
        var lastStreakDate = user.LastStreakAt?.Date;

        if (!lastStreakDate.HasValue)
        {
            user.StreakDays = 1;
        }
        else if (lastStreakDate.Value == today)
        {
            // Đăng nhập nhiều lần trong cùng ngày: giữ nguyên streak hiện tại.
        }
        else if (lastStreakDate.Value == today.AddDays(-1))
        {
            user.StreakDays = Math.Max(0, user.StreakDays) + 1;
        }
        else
        {
            user.StreakDays = 1;
        }

        user.LastStreakAt = now;
        user.LastLoginAt = now;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        var needsPlacement = !ShouldSkipPlacementTest(user) &&
                               !await _db.PlacementResults.AnyAsync(r => r.UserId == user.Id);

        return new AuthResponse
        {
            AccessToken = token,
            User = MapToDto(user),
            NeedsPlacementTest = needsPlacement
        };
    }

    private static bool ShouldSkipPlacementTest(User user)
    {
        var r = user.Role ?? "";
        return r.Equals(AppRoles.Moderator, StringComparison.OrdinalIgnoreCase) ||
               r.Equals(AppRoles.Admin, StringComparison.OrdinalIgnoreCase);
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _db.Users
            .Where(u => u.DeletedAt == null)
            .ToListAsync();

        return users.Select(MapToDto);
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var user = await _db.Users
            .Where(u => u.DeletedAt == null && u.Id == id)
            .FirstOrDefaultAsync();

        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
        if (user == null) return null;

        if (!string.IsNullOrWhiteSpace(request.Username))
            user.Username = request.Username;

        if (!string.IsNullOrWhiteSpace(request.Email))
            user.Email = request.Email;

        if (!string.IsNullOrWhiteSpace(request.Role))
            user.Role = request.Role;

        if (request.LevelId.HasValue)
            user.LevelId = request.LevelId;

        if (request.IsLocked.HasValue)
            user.IsLocked = request.IsLocked.Value;

        if (request.IsPremium.HasValue)
            user.IsPremium = request.IsPremium.Value;

        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(user);
    }

    /// <summary>Xóa cứng user và dữ liệu liên quan (admin) — không còn bản ghi trong bảng users.</summary>
    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt == null);
        if (user == null) return false;

        // EnableRetryOnFailure → không được BeginTransaction ngoài execution strategy (SqlServerRetryingExecutionStrategy).
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var myMessageIds = await _db.Messages.Where(m => m.UserId == id).Select(m => m.Id).ToListAsync();

                // warnings.report_id → reports: xóa warnings trước reports. Gồm cả báo cáo user được giao làm moderator.
                var reportIdsTouchingUser = await _db.Reports.AsNoTracking()
                    .Where(r =>
                        r.ReporterId == id ||
                        r.ReportedUserId == id ||
                        r.AssignedModeratorId == id ||
                        (r.MessageId != null && myMessageIds.Contains(r.MessageId.Value)))
                    .Select(r => r.Id)
                    .ToListAsync();

                if (reportIdsTouchingUser.Count > 0)
                {
                    await _db.Warnings
                        .Where(w => w.ReportId != null && reportIdsTouchingUser.Contains(w.ReportId.Value))
                        .ExecuteDeleteAsync();
                }

                await _db.Warnings.Where(w => w.UserId == id || w.ModeratorId == id).ExecuteDeleteAsync();

                if (myMessageIds.Count > 0)
                {
                    await _db.Messages
                        .Where(m => m.ReplyToId != null && myMessageIds.Contains(m.ReplyToId.Value))
                        .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReplyToId, (int?)null));

                    await _db.Reports
                        .Where(r => r.MessageId != null && myMessageIds.Contains(r.MessageId.Value))
                        .ExecuteDeleteAsync();

                    await _db.MessageReactions.Where(r => myMessageIds.Contains(r.MessageId)).ExecuteDeleteAsync();

                    await _db.Messages.Where(m => m.UserId == id).ExecuteDeleteAsync();
                }

                await _db.Messages
                    .Where(m => m.PinnedBy == id)
                    .ExecuteUpdateAsync(s =>
                        s.SetProperty(m => m.IsPinned, false)
                            .SetProperty(m => m.PinnedBy, (int?)null)
                            .SetProperty(m => m.PinnedAt, (DateTime?)null));

                await _db.MessageReactions.Where(r => r.UserId == id).ExecuteDeleteAsync();

                await _db.ChatRoomMembers.Where(m => m.UserId == id).ExecuteDeleteAsync();

                await _db.FriendRequests.Where(fr => fr.FromUserId == id || fr.ToUserId == id).ExecuteDeleteAsync();

                await _db.Friendships.Where(f => f.UserId == id || f.FriendId == id).ExecuteDeleteAsync();

                await _db.BlockedUsers.Where(b => b.UserId == id || b.BlockedUserId == id).ExecuteDeleteAsync();

                await _db.Reports.Where(r => r.ReporterId == id || r.ReportedUserId == id).ExecuteDeleteAsync();

                await _db.Reports
                    .Where(r => r.AssignedModeratorId == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(r => r.AssignedModeratorId, (int?)null));

                await _db.UserLessonProgresses.Where(p => p.UserId == id).ExecuteDeleteAsync();

                await _db.UserBookmarks.Where(b => b.UserId == id).ExecuteDeleteAsync();

                await _db.UserProfiles.Where(p => p.UserId == id).ExecuteDeleteAsync();

                await _db.UserOnlineStatuses.Where(s => s.UserId == id).ExecuteDeleteAsync();

                await _db.Lessons.Where(l => l.CreatedBy == id).ExecuteUpdateAsync(s => s.SetProperty(l => l.CreatedBy, (int?)null));

                await _db.SensitiveKeywords.Where(k => k.CreatedBy == id).ExecuteUpdateAsync(s => s.SetProperty(k => k.CreatedBy, (int?)null));

                await _db.ChatRooms.Where(r => r.CreatedBy == id).ExecuteUpdateAsync(s => s.SetProperty(r => r.CreatedBy, (int?)null));

                // Bảng có user_id nhưng chưa khai báo trong EF (otps, v.v.) — bỏ qua nếu không tồn tại.
                await TryDeleteOptionalUserFkRowsAsync(_db, id);

                await _db.Users.Where(u => u.Id == id).ExecuteDeleteAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>Xóa hàng trong các bảng thường gặp ngoài DbContext; chỉ nuối lỗi “object not found” (208).</summary>
    private static async Task TryDeleteOptionalUserFkRowsAsync(ApplicationDbContext db, int userId)
    {
        foreach (var sql in OptionalUserScopedDeleteSql)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(sql, userId);
            }
            catch (Exception ex) when (SqlErrorNumber(ex) == 208)
            {
                // Invalid object name — bảng không có trong DB này
            }
        }
    }

    private static readonly string[] OptionalUserScopedDeleteSql =
    {
        "DELETE FROM [otps] WHERE [user_id] = {0}",
        "DELETE FROM [user_otps] WHERE [user_id] = {0}",
        "DELETE FROM [email_verification_tokens] WHERE [user_id] = {0}",
        "DELETE FROM [password_reset_tokens] WHERE [user_id] = {0}",
    };

    private static int? SqlErrorNumber(Exception ex)
    {
        for (var e = ex; e != null; e = e.InnerException!)
        {
            if (e is SqlException se)
                return se.Number;
        }

        return null;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSection = _config.GetSection("Jwt");
        var keyStr = jwtSection["Key"];
        if (string.IsNullOrWhiteSpace(keyStr))
            throw new InvalidOperationException("Thiếu cấu hình Jwt:Key trên server.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresMinutes = int.TryParse(jwtSection["ExpiresMinutes"], out var m) ? m : 60;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Email, user.Email)
        };

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            LevelId = user.LevelId,
            Exp = user.Exp,
            Xu = user.Xu,
            IsEmailVerified = user.IsEmailVerified,
            IsLocked = user.IsLocked,
            IsPremium = user.IsPremium,
            CreatedAt = user.CreatedAt
        };
    }
}

