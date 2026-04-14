using backend.Data;

namespace backend.Services.Learning;

/// <summary>Nghiệp vụ học tập — tách file: Catalog, Progress, Staff, Mappers.</summary>
public partial class LearningService : ILearningService
{
    private readonly ApplicationDbContext _db;

    public LearningService(ApplicationDbContext db)
    {
        _db = db;
    }
}
