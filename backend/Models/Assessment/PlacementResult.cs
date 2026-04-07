using System;

namespace backend.Models.Assessment;

public class PlacementResult
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int CorrectCount { get; set; }
    public int TotalCount { get; set; }
    public string LevelLabel { get; set; } = null!; // N5 / N4 / N3
    public DateTime CreatedAt { get; set; }
}

