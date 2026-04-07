using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Assessment;

namespace backend.Services.Assessment;

/// <summary>Mô-đun 3: Kiểm tra đầu vào, kiểm tra nhanh theo bài, thi thử.</summary>
public interface IAssessmentService
{
    Task<PlacementTestDefinitionDto> GetPlacementTestAsync();
    Task<PlacementTestResultDto> SubmitPlacementTestAsync(int userId, PlacementTestSubmitRequest request);

    // Thi nâng level (khác với bài test đầu vào)
    Task<LevelUpTestDefinitionDto?> GetLevelUpTestAsync(int userId, string toLevel);
    Task<LevelUpTestResultDto> SubmitLevelUpTestAsync(int userId, LevelUpTestSubmitRequest request);
}
