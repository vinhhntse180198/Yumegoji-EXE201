using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Admin;

namespace backend.Services.Admin;

public interface IAdminService
{
    Task<AdminOverviewDto> GetOverviewAsync();
    Task<IReadOnlyList<SensitiveKeywordAdminDto>> ListSensitiveKeywordsAsync();
    Task<int> CreateSensitiveKeywordAsync(int adminUserId, CreateSensitiveKeywordRequest request);
    Task<bool> UpdateSensitiveKeywordAsync(int id, UpdateSensitiveKeywordRequest request);
    Task<bool> DeleteSensitiveKeywordAsync(int id);
}
