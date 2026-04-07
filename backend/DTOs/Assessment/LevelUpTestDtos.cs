using System;
using System.Collections.Generic;

namespace backend.DTOs.Assessment;

public class LevelUpQuestionOptionDto
{
    public string Key { get; set; } = null!; // "a", "b", "c", "d"
    public string Text { get; set; } = null!;
}

public class LevelUpQuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public int Points { get; set; }
    public IReadOnlyList<LevelUpQuestionOptionDto> Options { get; set; } = Array.Empty<LevelUpQuestionOptionDto>();
}

public class LevelUpTestDefinitionDto
{
    public int TestId { get; set; }
    public string FromLevel { get; set; } = null!;
    public string ToLevel { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int TotalPoints { get; set; }
    public int PassScore { get; set; }
    public int TimeLimitSeconds { get; set; } = 1200; // 20 phút
    public IReadOnlyList<LevelUpQuestionDto> Questions { get; set; } = Array.Empty<LevelUpQuestionDto>();
}

public class LevelUpAnswerDto
{
    public int QuestionId { get; set; }
    public string SelectedKey { get; set; } = "";
}

public class LevelUpTestSubmitRequest
{
    public int TestId { get; set; }
    public IReadOnlyList<LevelUpAnswerDto> Answers { get; set; } = Array.Empty<LevelUpAnswerDto>();
}

public class LevelUpTestResultDto
{
    public int TestId { get; set; }
    public string FromLevel { get; set; } = null!;
    public string ToLevel { get; set; } = null!;
    public int Score { get; set; }
    public int MaxScore { get; set; }
    public bool IsPassed { get; set; }
}

