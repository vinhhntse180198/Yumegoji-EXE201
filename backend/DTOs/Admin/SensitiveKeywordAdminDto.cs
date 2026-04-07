using System;

namespace backend.DTOs.Admin;

public class SensitiveKeywordAdminDto
{
    public int Id { get; set; }
    public string Keyword { get; set; } = null!;
    public int Severity { get; set; }
    public bool IsActive { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSensitiveKeywordRequest
{
    public string Keyword { get; set; } = null!;
    public int Severity { get; set; } = 1;
}

public class UpdateSensitiveKeywordRequest
{
    public string? Keyword { get; set; }
    public int? Severity { get; set; }
    public bool? IsActive { get; set; }
}
