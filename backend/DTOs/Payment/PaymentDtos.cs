namespace backend.DTOs.Payment;

public record PremiumConfigDto(
    string BankCode,
    string AccountNo,
    string AccountName,
    int PremiumPriceVnd,
    int PremiumDurationDays,
    bool IsActive);

public record PremiumIntentDto(
    int RequestId,
    string Token,
    int AmountVnd,
    int DurationDays,
    string BankCode,
    string AccountNo,
    string AccountName,
    string QrImageUrl,
    DateTime CreatedAtUtc,
    string Status);

public record CreatePremiumIntentRequest;

public record ConfirmPremiumPaymentRequest(string Token);

public record PremiumRequestDto(
    int Id,
    int UserId,
    string Username,
    string Token,
    int AmountVnd,
    int DurationDays,
    string Status,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    DateTime? ApprovedAt,
    string? Note);

public record UpdatePremiumConfigRequest(
    string? AccountNo,
    string? AccountName,
    int? PremiumPriceVnd,
    int? PremiumDurationDays,
    bool? IsActive);

public record ResolvePremiumRequest(string? Note);
