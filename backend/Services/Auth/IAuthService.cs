using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Auth;
using backend.DTOs.User;

namespace backend.Services.Auth;

/// <summary>Mô-đun 1: Đăng ký, đăng nhập, xác minh email, quên mật khẩu.</summary>
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);

    /// <summary>Đăng nhập / đăng ký nhanh bằng Google ID token (đã xác minh email).</summary>
    Task<AuthResponse> LoginWithGoogleAsync(string idToken);

    /// <summary>Tạo token đặt lại mật khẩu nếu email khớp user còn hoạt động.</summary>
    Task<PasswordResetRequestResult> RequestPasswordResetAsync(string email);

    /// <summary>Đặt lại mật khẩu bằng token hợp lệ, chưa dùng, chưa hết hạn.</summary>
    Task ResetPasswordWithTokenAsync(string token, string newPassword);

    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto?> UpdateUserAsync(int id, UpdateUserRequest request);
    /// <summary>Admin: xóa cứng user (không còn trong bảng users) và dọn dữ liệu liên quan.</summary>
    Task<bool> DeleteUserAsync(int id);
}

