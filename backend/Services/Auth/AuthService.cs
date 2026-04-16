using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using backend.Authorization;
using backend.Data;
using backend.DTOs.Auth;
using backend.DTOs.User;
using backend.Models.User;
using backend.Services.Email;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using BC = BCrypt.Net.BCrypt;

namespace backend.Services.Auth;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext db,
        IConfiguration config,
        IWebHostEnvironment env,
        IEmailSender emailSender,
        ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _env = env;
        _emailSender = emailSender;
        _logger = logger;
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
        {
            if (string.IsNullOrEmpty(user.PasswordHash))
                throw new InvalidOperationException("Tài khoản đăng nhập bằng Google. Vui lòng dùng nút Đăng nhập Google.");
            throw new InvalidOperationException("Mật khẩu không đúng.");
        }

        return await CompleteLoginSessionAndBuildResponseAsync(user);
    }

    public async Task<AuthResponse> LoginWithGoogleAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(idToken))
            throw new InvalidOperationException("Thiếu mã xác thực Google.");

        var clientId = _config["GoogleAuth:ClientId"]?.Trim();
        if (string.IsNullOrEmpty(clientId))
            throw new InvalidOperationException("Server chưa cấu hình GoogleAuth:ClientId.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Xác minh Google ID token thất bại.");
            throw new InvalidOperationException("Không xác minh được tài khoản Google. Vui lòng thử lại.");
        }

        if (string.IsNullOrEmpty(payload.Email) || !payload.EmailVerified)
            throw new InvalidOperationException("Email Google chưa được xác minh. Chọn tài khoản Google khác.");

        var sub = payload.Subject?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(sub))
            throw new InvalidOperationException("Thiếu mã định danh Google (sub).");

        var email = payload.Email.Trim();
        var key = email.ToLowerInvariant();

        var user = await _db.Users
            .Where(u => u.DeletedAt == null && u.GoogleSub == sub)
            .FirstOrDefaultAsync();

        if (user == null)
        {
            user = await _db.Users
                .Where(u => u.DeletedAt == null && u.Email.ToLower() == key)
                .FirstOrDefaultAsync();

            if (user != null && string.IsNullOrEmpty(user.GoogleSub))
            {
                user.GoogleSub = sub;
                user.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        if (user == null)
            user = await CreateUserFromGoogleAsync(email, payload.Name, sub);

        if (user.IsLocked)
            throw new InvalidOperationException("Tài khoản đã bị khóa.");

        return await CompleteLoginSessionAndBuildResponseAsync(user);
    }

    public async Task<PasswordResetRequestResult> RequestPasswordResetAsync(string email)
    {
        var normalized = email?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(normalized))
            return new PasswordResetRequestResult();

        var key = normalized.ToLowerInvariant();
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.DeletedAt == null && u.Email.ToLower() == key);

        if (user == null)
            return new PasswordResetRequestResult();

        var rawToken = CreateUrlSafeToken();
        var now = DateTime.UtcNow;

        await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null)
            .ExecuteDeleteAsync();

        await _db.PasswordResetTokens.AddAsync(new PasswordResetToken
        {
            UserId = user.Id,
            Token = rawToken,
            ExpiresAt = now.AddHours(1),
            UsedAt = null,
            CreatedAt = now
        });
        await _db.SaveChangesAsync();

        var baseUrl = (_config["Frontend:PublicBaseUrl"] ?? string.Empty).Trim().TrimEnd('/');
        var resetUrl = string.IsNullOrEmpty(baseUrl)
            ? null
            : $"{baseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";

        if (!string.IsNullOrEmpty(resetUrl))
        {
            try
            {
                await _emailSender.SendPasswordResetAsync(user.Email, resetUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gửi email đặt lại mật khẩu thất bại cho {Email}", user.Email);
            }
        }

        string? devUrl = _env.IsDevelopment() ? resetUrl : null;
        return new PasswordResetRequestResult { DevelopmentResetUrl = devUrl };
    }

    public async Task ResetPasswordWithTokenAsync(string token, string newPassword)
    {
        var t = token?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(t))
            throw new InvalidOperationException("Thiếu mã đặt lại mật khẩu.");

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 6)
            throw new InvalidOperationException("Mật khẩu mới cần ít nhất 6 ký tự.");

        var row = await _db.PasswordResetTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == t);

        if (row == null || row.UsedAt != null)
            throw new InvalidOperationException("Liên kết không hợp lệ hoặc đã được sử dụng.");

        if (row.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại email.");

        var user = row.User;
        if (user.DeletedAt != null)
            throw new InvalidOperationException("Liên kết không hợp lệ.");

        if (user.IsLocked)
            throw new InvalidOperationException("Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.");

        user.PasswordHash = BC.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        row.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<AuthResponse> CompleteLoginSessionAndBuildResponseAsync(User user)
    {
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

    private async Task<User> CreateUserFromGoogleAsync(string email, string? displayName, string googleSub)
    {
        var now = DateTime.UtcNow;
        var baseUsername = SanitizeUsernameFromGoogle(displayName, email);
        var username = await EnsureUniqueUsernameAsync(baseUsername);
        var user = new User
        {
            Username = username,
            Email = email,
            GoogleSub = googleSub,
            PasswordHash = null,
            Role = "user",
            CreatedAt = now,
            UpdatedAt = now,
            IsEmailVerified = true
        };
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private static string SanitizeUsernameFromGoogle(string? displayName, string email)
    {
        var raw = !string.IsNullOrWhiteSpace(displayName)
            ? displayName.Trim().ToLowerInvariant().Replace(' ', '_')
            : email.Split('@')[0].ToLowerInvariant();

        var filtered = new string(raw.Where(static c => char.IsLetterOrDigit(c) || c == '_').Take(30).ToArray());
        if (filtered.Length == 0)
            filtered = "user_" + Guid.NewGuid().ToString("N")[..8];

        return filtered.Length > 50 ? filtered[..50] : filtered;
    }

    private async Task<string> EnsureUniqueUsernameAsync(string baseName)
    {
        var candidate = baseName.Length > 50 ? baseName[..50] : baseName;
        var attempt = 0;
        while (await _db.Users.AnyAsync(u => u.Username == candidate))
        {
            attempt++;
            var suffix = "_" + attempt;
            var maxLen = Math.Max(1, 50 - suffix.Length);
            var root = baseName.Length > maxLen ? baseName[..maxLen] : baseName;
            candidate = root + suffix;
        }

        return candidate;
    }

    private static string CreateUrlSafeToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
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

