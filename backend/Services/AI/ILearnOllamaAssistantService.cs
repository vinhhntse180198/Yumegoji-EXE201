using System.Threading;
using System.Threading.Tasks;
using backend.DTOs.Learning;

namespace backend.Services.AI;

public interface ILearnOllamaAssistantService
{
    Task<LearnAiChatResponse> ChatAsync(LearnAiChatRequest request, CancellationToken cancellationToken = default);
}
