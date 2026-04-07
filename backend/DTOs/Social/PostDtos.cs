using System;
using System.Collections.Generic;

namespace backend.DTOs.Social;

public class CreatePostRequest
{
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
}

public class CreateCommentRequest
{
    public string Content { get; set; } = null!;
}

public class PostAuthorDto
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
}

public class PostCommentDto
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public PostAuthorDto Author { get; set; } = null!;
}

public class PostReactionSummaryDto
{
    public int PostId { get; set; }
    public Dictionary<string, int> Counts { get; set; } = new();
}

public class PostDto
{
    public int Id { get; set; }
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsOwner { get; set; }
    public DateTime CreatedAt { get; set; }

    public PostAuthorDto Author { get; set; } = null!;
    public int CommentCount { get; set; }
    public PostReactionSummaryDto Reactions { get; set; } = new();
}

