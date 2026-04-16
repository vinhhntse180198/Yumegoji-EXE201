using System.Threading;
using System.Threading.Tasks;

namespace backend.Services.Email;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string toEmail, string resetUrl, CancellationToken cancellationToken = default);
}
