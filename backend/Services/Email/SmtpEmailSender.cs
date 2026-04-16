using System;
using System.Threading;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace backend.Services.Email;

/// <summary>Gửi email qua SMTP (Gmail, Outlook, Mailtrap,…). Nếu <c>Smtp:Host</c> trống thì không gửi.</summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default)
    {
        var host = _config["Smtp:Host"]?.Trim();
        if (string.IsNullOrEmpty(host))
        {
            _logger.LogWarning("Smtp:Host trống — bỏ qua gửi email đặt lại mật khẩu.");
            return;
        }

        var fromEmail = _config["Smtp:FromEmail"]?.Trim();
        if (string.IsNullOrEmpty(fromEmail))
        {
            _logger.LogWarning("Smtp:FromEmail trống — bỏ qua gửi email đặt lại mật khẩu.");
            return;
        }

        var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var smtpUser = _config["Smtp:User"]?.Trim() ?? string.Empty;
        var smtpPassword = _config["Smtp:Password"] ?? string.Empty;
        var fromName = _config["Smtp:FromName"]?.Trim() ?? "YumeGo-ji";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "[YumeGo-ji] Đặt lại mật khẩu";

        var builder = new BodyBuilder
        {
            HtmlBody =
                "<p>Xin chào,</p>" +
                "<p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản YumeGo-ji.</p>" +
                $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(resetUrl)}\">Bấm vào đây để đặt lại mật khẩu</a> — liên kết hết hạn sau 1 giờ.</p>" +
                "<p>Nếu không phải bạn, hãy bỏ qua email này.</p>"
        };
        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls, cancellationToken);
        try
        {
            if (!string.IsNullOrEmpty(smtpUser))
                await client.AuthenticateAsync(smtpUser, smtpPassword, cancellationToken);
            await client.SendAsync(message, cancellationToken);
        }
        finally
        {
            if (client.IsConnected)
                await client.DisconnectAsync(true, cancellationToken);
        }
    }
}
