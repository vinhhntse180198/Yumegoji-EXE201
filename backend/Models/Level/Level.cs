namespace backend.Models.Level;

public class Level
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int SortOrder { get; set; } = 1;
}
