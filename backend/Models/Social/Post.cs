using System;

namespace backend.Models.Social;

public class Post
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

