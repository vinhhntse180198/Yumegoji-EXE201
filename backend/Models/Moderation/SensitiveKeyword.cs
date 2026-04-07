using System;

namespace backend.Models.Moderation;

public class SensitiveKeyword
{
    public int Id { get; set; }
    public string Keyword { get; set; } = null!;
    public int Severity { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
