using System;
using System.Collections.Generic;

namespace backend.Models.Assessment;

public class LevelUpTest
{
    public int Id { get; set; }
    public string FromLevel { get; set; } = null!; // 'N5'
    public string ToLevel { get; set; } = null!;   // 'N4'
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int TotalPoints { get; set; }
    public int PassScore { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<LevelUpQuestion> Questions { get; set; } = new List<LevelUpQuestion>();
}

public class LevelUpQuestion
{
    public int Id { get; set; }
    public int TestId { get; set; }
    public int OrderIndex { get; set; }
    public string Text { get; set; } = null!;
    public string Type { get; set; } = "single_choice";
    public int Points { get; set; }

    public LevelUpTest Test { get; set; } = null!;
    public ICollection<LevelUpQuestionOption> Options { get; set; } = new List<LevelUpQuestionOption>();
}

public class LevelUpQuestionOption
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public string OptionKey { get; set; } = null!; // 'a','b','c','d'
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }

    public LevelUpQuestion Question { get; set; } = null!;
}

public class LevelUpResult
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TestId { get; set; }
    public string FromLevel { get; set; } = null!;
    public string ToLevel { get; set; } = null!;
    public int Score { get; set; }
    public int MaxScore { get; set; }
    public bool IsPassed { get; set; }
    public DateTime CreatedAt { get; set; }
}

