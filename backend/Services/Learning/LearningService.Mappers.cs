using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using backend.Data;
using backend.DTOs.Learning;
using backend.Models.Learning;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Learning;

public partial class LearningService
{

    private static VocabularyItemDto MapVocab(VocabularyItem v) => new()
    {
        Id = v.Id,
        LessonId = v.LessonId,
        WordJp = v.WordJp,
        Reading = v.Reading,
        MeaningVi = v.MeaningVi,
        MeaningEn = v.MeaningEn,
        ExampleSentence = v.ExampleSentence,
        AudioUrl = v.AudioUrl,
        SortOrder = v.SortOrder
    };

    private static KanjiItemDto MapKanji(KanjiItem k) => new()
    {
        Id = k.Id,
        LessonId = k.LessonId,
        Character = k.KanjiChar,
        ReadingsOn = k.ReadingsOn,
        ReadingsKun = k.ReadingsKun,
        MeaningVi = k.MeaningVi,
        MeaningEn = k.MeaningEn,
        StrokeCount = k.StrokeCount,
        JlptLevel = k.JlptLevel,
        SortOrder = k.SortOrder
    };

    private static GrammarItemDto MapGrammar(GrammarItem g) => new()
    {
        Id = g.Id,
        LessonId = g.LessonId,
        LevelId = g.LevelId,
        Pattern = g.Pattern,
        Structure = g.Structure,
        MeaningVi = g.MeaningVi,
        MeaningEn = g.MeaningEn,
        ExampleSentences = g.ExampleSentences,
        SortOrder = g.SortOrder
    };

    private static LessonQuizQuestionDto MapQuiz(LessonQuizQuestion q)
    {
        IReadOnlyList<string> opts = Array.Empty<string>();
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(q.OptionsJson);
            if (list != null) opts = list;
        }
        catch
        {
            /* ignore */
        }

        return new LessonQuizQuestionDto
        {
            Id = q.Id,
            LessonId = q.LessonId,
            Question = q.Question,
            Options = opts,
            CorrectIndex = q.CorrectIndex,
            SortOrder = q.SortOrder
        };
    }
}