namespace backend.DTOs.Chat;

public class ReactionBody
{
    /// <summary>like, love, haha, wow, sad, angry hoặc emoji unicode</summary>
    public string Emoji { get; set; } = null!;
}
