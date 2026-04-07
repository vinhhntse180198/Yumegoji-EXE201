using System.Security.Cryptography;
using System.Text;
using backend.DTOs.Payment;
using Dapper;
using Microsoft.Data.SqlClient;

namespace backend.Services.Payment;

public class PaymentService : IPaymentService
{
    private const string DefaultBankCode = "ICB";
    private const string DefaultAccountNo = "105877558159";
    private const string DefaultAccountName = "HOANG NGUYEN THE VINH";
    private const int DefaultPremiumPriceVnd = 10000;
    private const int DefaultPremiumDurationDays = 30;

    private readonly string _connectionString;

    public PaymentService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection chưa cấu hình.");
    }

    private SqlConnection CreateConnection() => new(_connectionString);

    public async Task<PremiumConfigDto> GetPremiumConfigAsync()
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        return await EnsureConfigAsync(db);
    }

    public async Task<PremiumIntentDto> CreatePremiumIntentAsync(int userId)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        var cfg = await EnsureConfigAsync(db);
        if (!cfg.IsActive)
            throw new InvalidOperationException("Gói Premium hiện đang tạm khóa.");

        var token = await CreateUniqueTokenAsync(db);
        var now = DateTime.UtcNow;

        var requestId = await db.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.premium_payment_requests
                (user_id, token, amount_vnd, duration_days, status, created_at, bank_code, account_no, account_name)
            OUTPUT INSERTED.id
            VALUES (@uid, @token, @amount, @days, N'created', @now, @bank, @accNo, @accName)
            """,
            new
            {
                uid = userId,
                token,
                amount = cfg.PremiumPriceVnd,
                days = cfg.PremiumDurationDays,
                now,
                bank = cfg.BankCode,
                accNo = cfg.AccountNo,
                accName = cfg.AccountName
            });

        var qr = BuildVietQrUrl(cfg.BankCode, cfg.AccountNo, cfg.AccountName, cfg.PremiumPriceVnd, token);
        return new PremiumIntentDto(
            requestId,
            token,
            cfg.PremiumPriceVnd,
            cfg.PremiumDurationDays,
            cfg.BankCode,
            cfg.AccountNo,
            cfg.AccountName,
            qr,
            now,
            "created");
    }

    public async Task<PremiumIntentDto?> ConfirmPremiumIntentAsync(int userId, string token)
    {
        var t = NormalizeToken(token);
        if (string.IsNullOrEmpty(t))
            throw new InvalidOperationException("Thiếu token thanh toán.");

        using var db = CreateConnection();
        await db.OpenAsync();

        var row = await db.QueryFirstOrDefaultAsync<PremiumIntentRow>(
            """
            SELECT TOP 1 id AS RequestId, token AS Token, amount_vnd AS AmountVnd, duration_days AS DurationDays,
                   bank_code AS BankCode, account_no AS AccountNo, account_name AS AccountName,
                   created_at AS CreatedAtUtc, status AS Status
            FROM dbo.premium_payment_requests
            WHERE user_id = @uid AND token = @token
            ORDER BY id DESC
            """,
            new { uid = userId, token = t });
        if (row is null) return null;

        if (!string.Equals(row.Status, "approved", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(row.Status, "pending_review", StringComparison.OrdinalIgnoreCase))
        {
            await db.ExecuteAsync(
                """
                UPDATE dbo.premium_payment_requests
                SET status = N'pending_review', confirmed_at = SYSUTCDATETIME()
                WHERE id = @id
                """,
                new { id = row.RequestId });
            row = row with { Status = "pending_review" };
        }

        return new PremiumIntentDto(
            row.RequestId,
            row.Token,
            row.AmountVnd,
            row.DurationDays,
            row.BankCode,
            row.AccountNo,
            row.AccountName,
            BuildVietQrUrl(row.BankCode, row.AccountNo, row.AccountName, row.AmountVnd, row.Token),
            row.CreatedAtUtc,
            row.Status);
    }

    public async Task<PremiumIntentDto?> GetLatestPremiumIntentAsync(int userId)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        var row = await db.QueryFirstOrDefaultAsync<PremiumIntentRow>(
            """
            SELECT TOP 1 id AS RequestId, token AS Token, amount_vnd AS AmountVnd, duration_days AS DurationDays,
                   bank_code AS BankCode, account_no AS AccountNo, account_name AS AccountName,
                   created_at AS CreatedAtUtc, status AS Status
            FROM dbo.premium_payment_requests
            WHERE user_id = @uid
            ORDER BY id DESC
            """,
            new { uid = userId });
        if (row is null) return null;
        return new PremiumIntentDto(
            row.RequestId,
            row.Token,
            row.AmountVnd,
            row.DurationDays,
            row.BankCode,
            row.AccountNo,
            row.AccountName,
            BuildVietQrUrl(row.BankCode, row.AccountNo, row.AccountName, row.AmountVnd, row.Token),
            row.CreatedAtUtc,
            row.Status);
    }

    public async Task<PremiumConfigDto> AdminUpdatePremiumConfigAsync(UpdatePremiumConfigRequest request)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        var cfg = await EnsureConfigAsync(db);

        var next = cfg with
        {
            AccountNo = string.IsNullOrWhiteSpace(request.AccountNo) ? cfg.AccountNo : request.AccountNo.Trim(),
            AccountName = string.IsNullOrWhiteSpace(request.AccountName) ? cfg.AccountName : request.AccountName.Trim(),
            PremiumPriceVnd = request.PremiumPriceVnd is > 999 ? request.PremiumPriceVnd.Value : cfg.PremiumPriceVnd,
            PremiumDurationDays = request.PremiumDurationDays is > 0 ? request.PremiumDurationDays.Value : cfg.PremiumDurationDays,
            IsActive = request.IsActive ?? cfg.IsActive
        };

        await db.ExecuteAsync(
            """
            UPDATE dbo.premium_payment_config
            SET account_no = @accNo,
                account_name = @accName,
                premium_price_vnd = @amount,
                premium_duration_days = @days,
                is_active = @active,
                updated_at = SYSUTCDATETIME()
            WHERE id = 1
            """,
            new
            {
                accNo = next.AccountNo,
                accName = next.AccountName,
                amount = next.PremiumPriceVnd,
                days = next.PremiumDurationDays,
                active = next.IsActive
            });

        return next;
    }

    public async Task<IReadOnlyList<PremiumRequestDto>> AdminListPremiumRequestsAsync(string status = "pending_review")
    {
        var st = string.IsNullOrWhiteSpace(status) ? "pending_review" : status.Trim().ToLowerInvariant();
        using var db = CreateConnection();
        await db.OpenAsync();
        var rows = await db.QueryAsync<PremiumRequestDto>(
            """
            SELECT r.id AS Id, r.user_id AS UserId, u.username AS Username, r.token AS Token,
                   r.amount_vnd AS AmountVnd, r.duration_days AS DurationDays, r.status AS Status,
                   r.created_at AS CreatedAt, r.confirmed_at AS ConfirmedAt, r.approved_at AS ApprovedAt, r.note AS Note
            FROM dbo.premium_payment_requests r
            INNER JOIN dbo.users u ON u.id = r.user_id
            WHERE (@status = N'all' OR r.status = @status)
            ORDER BY r.id DESC
            """,
            new { status = st });
        return rows.ToList();
    }

    public async Task<bool> AdminApprovePremiumRequestAsync(int requestId, int adminUserId, string? note)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        using var tx = db.BeginTransaction();
        var row = await db.QueryFirstOrDefaultAsync<(int UserId, int DurationDays, string Status)?>(
            """
            SELECT user_id, duration_days, status
            FROM dbo.premium_payment_requests
            WHERE id = @id
            """,
            new { id = requestId }, tx);
        if (row is null) return false;
        if (string.Equals(row.Value.Status, "approved", StringComparison.OrdinalIgnoreCase))
        {
            tx.Commit();
            return true;
        }

        var now = DateTime.UtcNow;
        var expires = now.AddDays(Math.Max(1, row.Value.DurationDays));

        await db.ExecuteAsync(
            """
            UPDATE dbo.users
            SET is_premium = 1, updated_at = @now
            WHERE id = @uid
            """,
            new { now, uid = row.Value.UserId }, tx);

        await db.ExecuteAsync(
            """
            INSERT INTO dbo.premium_subscriptions (user_id, payment_request_id, started_at, expires_at, is_active)
            VALUES (@uid, @rid, @startAt, @endAt, 1)
            """,
            new { uid = row.Value.UserId, rid = requestId, startAt = now, endAt = expires }, tx);

        await db.ExecuteAsync(
            """
            UPDATE dbo.premium_payment_requests
            SET status = N'approved', approved_at = @now, approved_by = @adminId, note = @note
            WHERE id = @id
            """,
            new { id = requestId, now, adminId = adminUserId, note = (note ?? "").Trim() }, tx);

        tx.Commit();
        return true;
    }

    public async Task<bool> AdminRejectPremiumRequestAsync(int requestId, int adminUserId, string? note)
    {
        using var db = CreateConnection();
        await db.OpenAsync();
        var n = await db.ExecuteAsync(
            """
            UPDATE dbo.premium_payment_requests
            SET status = N'rejected', approved_at = SYSUTCDATETIME(), approved_by = @adminId, note = @note
            WHERE id = @id
            """,
            new { id = requestId, adminId = adminUserId, note = (note ?? "").Trim() });
        return n > 0;
    }

    private static string BuildVietQrUrl(string bankCode, string accountNo, string accountName, int amount, string token)
    {
        return $"https://img.vietqr.io/image/{bankCode}-{accountNo}-compact2.png?amount={amount}" +
               $"&addInfo={Uri.EscapeDataString(token)}&accountName={Uri.EscapeDataString(accountName)}";
    }

    private static string NormalizeToken(string token)
    {
        return string.IsNullOrWhiteSpace(token) ? "" : token.Trim();
    }

    private async Task<string> CreateUniqueTokenAsync(SqlConnection db)
    {
        for (var i = 0; i < 20; i++)
        {
            var token = CreateToken12();
            var exists = await db.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM dbo.premium_payment_requests WHERE token = @t",
                new { t = token });
            if (exists == 0) return token;
        }
        throw new InvalidOperationException("Không tạo được token thanh toán, thử lại.");
    }

    /// <summary>Token tổng 12 ký tự: NAP + 5 ký tự ngẫu nhiên + Yume.</summary>
    private static string CreateToken12()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<byte> bytes = stackalloc byte[5];
        RandomNumberGenerator.Fill(bytes);
        var sb = new StringBuilder("NAP", 12);
        for (var i = 0; i < 5; i++)
            sb.Append(chars[bytes[i] % chars.Length]);
        sb.Append("Yume");
        return sb.ToString();
    }

    private async Task<PremiumConfigDto> EnsureConfigAsync(SqlConnection db)
    {
        var row = await db.QueryFirstOrDefaultAsync<PremiumConfigDto>(
            """
            SELECT TOP 1 bank_code AS BankCode, account_no AS AccountNo, account_name AS AccountName,
                         premium_price_vnd AS PremiumPriceVnd, premium_duration_days AS PremiumDurationDays,
                         CAST(ISNULL(is_active, 1) AS BIT) AS IsActive
            FROM dbo.premium_payment_config
            WHERE id = 1
            """);
        if (row is not null) return row;

        await db.ExecuteAsync(
            """
            INSERT INTO dbo.premium_payment_config
                (id, bank_code, account_no, account_name, premium_price_vnd, premium_duration_days, is_active, updated_at)
            VALUES (1, @bank, @accNo, @accName, @price, @days, 1, SYSUTCDATETIME())
            """,
            new
            {
                bank = DefaultBankCode,
                accNo = DefaultAccountNo,
                accName = DefaultAccountName,
                price = DefaultPremiumPriceVnd,
                days = DefaultPremiumDurationDays
            });

        return new PremiumConfigDto(
            DefaultBankCode,
            DefaultAccountNo,
            DefaultAccountName,
            DefaultPremiumPriceVnd,
            DefaultPremiumDurationDays,
            true);
    }

    private sealed record PremiumIntentRow(
        int RequestId,
        string Token,
        int AmountVnd,
        int DurationDays,
        string BankCode,
        string AccountNo,
        string AccountName,
        DateTime CreatedAtUtc,
        string Status);
}
