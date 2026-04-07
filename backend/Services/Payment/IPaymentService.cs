using backend.DTOs.Payment;

namespace backend.Services.Payment;

/// <summary>Mô-đun 9: Gói Premium, mua vật phẩm trong game.</summary>
public interface IPaymentService
{
    Task<PremiumIntentDto> CreatePremiumIntentAsync(int userId);
    Task<PremiumIntentDto?> ConfirmPremiumIntentAsync(int userId, string token);
    Task<PremiumIntentDto?> GetLatestPremiumIntentAsync(int userId);
    Task<PremiumConfigDto> GetPremiumConfigAsync();

    Task<PremiumConfigDto> AdminUpdatePremiumConfigAsync(UpdatePremiumConfigRequest request);
    Task<IReadOnlyList<PremiumRequestDto>> AdminListPremiumRequestsAsync(string status = "pending_review");
    Task<bool> AdminApprovePremiumRequestAsync(int requestId, int adminUserId, string? note);
    Task<bool> AdminRejectPremiumRequestAsync(int requestId, int adminUserId, string? note);
}
