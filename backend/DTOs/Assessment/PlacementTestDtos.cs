using System;
using System.Collections.Generic;

namespace backend.DTOs.Assessment;

public class PlacementQuestionOptionDto
{
    public string Key { get; set; } = null!; // "a", "b", "c", "d"
    public string Text { get; set; } = null!;
}

public class PlacementQuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public IReadOnlyList<PlacementQuestionOptionDto> Options { get; set; } = Array.Empty<PlacementQuestionOptionDto>();
}

public class PlacementTestDefinitionDto
{
    public int TotalQuestions { get; set; }
    public int TimeLimitSeconds { get; set; } = 1200;
    public IReadOnlyList<PlacementQuestionDto> Questions { get; set; } = Array.Empty<PlacementQuestionDto>();
}

public class PlacementAnswerDto
{
    public int QuestionId { get; set; }
    public string SelectedKey { get; set; } = null!;
}

public class PlacementTestSubmitRequest
{
    public IReadOnlyList<PlacementAnswerDto> Answers { get; set; } = Array.Empty<PlacementAnswerDto>();
}

public class PlacementTestResultDto
{
    public int CorrectCount { get; set; }
    public int TotalCount { get; set; }
    public string LevelLabel { get; set; } = null!; // "N5", "N4", "N3"
}

