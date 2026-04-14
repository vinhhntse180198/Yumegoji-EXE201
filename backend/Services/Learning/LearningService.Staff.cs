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

    public async Task<LessonFullDetailDto?> UpdateLessonByStaffAsync(int lessonId, StaffUpdateLessonRequest request)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null) return null;

        if (request.CategoryId.HasValue)
        {
            var catOk = await _db.LessonCategories.AnyAsync(c => c.Id == request.CategoryId.Value);
            if (!catOk)
                throw new InvalidOperationException("Danh mục bài học không tồn tại.");
            lesson.CategoryId = request.CategoryId.Value;
        }

        if (request.Title != null)
            lesson.Title = request.Title.Trim();

        if (request.Slug != null)
        {
            var slug = request.Slug.Trim();
            var dup = await _db.Lessons.AnyAsync(l => l.Slug == slug && l.Id != lessonId);
            if (dup)
                throw new InvalidOperationException("Slug đã được bài học khác sử dụng.");
            lesson.Slug = slug;
        }

        if (request.Content != null)
            lesson.Content = request.Content;

        if (request.SortOrder.HasValue)
            lesson.SortOrder = request.SortOrder.Value;

        if (request.EstimatedMinutes.HasValue)
            lesson.EstimatedMinutes = request.EstimatedMinutes.Value;

        if (request.IsPremium.HasValue)
            lesson.IsPremium = request.IsPremium.Value;

        if (request.IsPublished.HasValue)
            lesson.IsPublished = request.IsPublished.Value;

        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var row = await (
            from l in _db.Lessons
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where l.Id == lessonId
            select new { l, c }).FirstAsync();

        return await BuildLessonFullAsync(row.l, row.c, true);
    }

    public async Task<LessonFullDetailDto?> GetLessonFullForStaffAsync(int lessonId)
    {
        var row = await (
            from l in _db.Lessons
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where l.Id == lessonId
            select new { l, c }).FirstOrDefaultAsync();
        if (row == null) return null;
        return await BuildLessonFullAsync(row.l, row.c, true);
    }

    public async Task<LessonFullDetailDto> StaffCreateLessonFromDraftAsync(
        StaffCreateLessonFromDraftRequest request,
        int? createdByUserId)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidOperationException("Tiêu đề bài học là bắt buộc.");
        if (string.IsNullOrWhiteSpace(request.Slug))
            throw new InvalidOperationException("Slug là bắt buộc.");

        var cat = await _db.LessonCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId)
            ?? throw new InvalidOperationException("Danh mục bài học không tồn tại.");

        var slug = request.Slug.Trim();
        if (await _db.Lessons.AnyAsync(l => l.Slug == slug))
            throw new InvalidOperationException("Slug đã tồn tại. Đổi slug khác.");

        var maxOrder = await _db.Lessons.Where(l => l.CategoryId == request.CategoryId)
            .MaxAsync(l => (int?)l.SortOrder) ?? 0;

        var now = DateTime.UtcNow;
        var lesson = new Lesson
        {
            CategoryId = request.CategoryId,
            Title = request.Title.Trim(),
            Slug = slug,
            Content = request.Content,
            SortOrder = maxOrder + 1,
            EstimatedMinutes = Math.Clamp(request.EstimatedMinutes, 1, 240),
            IsPremium = false,
            IsPublished = request.IsPublished,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = createdByUserId
        };
        _db.Lessons.Add(lesson);
        await _db.SaveChangesAsync();

        var lessonId = lesson.Id;
        var levelId = cat.LevelId;

        if (request.Vocabulary != null)
        {
            var o = 0;
            foreach (var v in request.Vocabulary)
            {
                if (string.IsNullOrWhiteSpace(v.WordJp)) continue;
                o++;
                _db.VocabularyItems.Add(new VocabularyItem
                {
                    LessonId = lessonId,
                    WordJp = v.WordJp.Trim(),
                    Reading = v.Reading?.Trim(),
                    MeaningVi = v.MeaningVi?.Trim(),
                    MeaningEn = v.MeaningEn?.Trim(),
                    ExampleSentence = v.ExampleSentence?.Trim(),
                    AudioUrl = string.IsNullOrWhiteSpace(v.AudioUrl) ? null : v.AudioUrl.Trim(),
                    SortOrder = v.SortOrder ?? o,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        if (request.Grammar != null)
        {
            var o = 0;
            foreach (var g in request.Grammar)
            {
                if (string.IsNullOrWhiteSpace(g.Pattern)) continue;
                o++;
                _db.GrammarItems.Add(new GrammarItem
                {
                    LessonId = lessonId,
                    Pattern = g.Pattern.Trim(),
                    Structure = g.Structure,
                    MeaningVi = g.MeaningVi,
                    MeaningEn = g.MeaningEn,
                    ExampleSentences = g.ExampleSentences,
                    LevelId = g.LevelId ?? levelId,
                    SortOrder = g.SortOrder ?? o,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        if (request.Kanji != null)
        {
            var o = 0;
            foreach (var k in request.Kanji)
            {
                if (string.IsNullOrWhiteSpace(k.Character)) continue;
                o++;
                _db.KanjiItems.Add(new KanjiItem
                {
                    LessonId = lessonId,
                    KanjiChar = k.Character.Trim(),
                    ReadingsOn = k.ReadingsOn?.Trim(),
                    ReadingsKun = k.ReadingsKun?.Trim(),
                    MeaningVi = k.MeaningVi?.Trim(),
                    MeaningEn = k.MeaningEn?.Trim(),
                    StrokeCount = k.StrokeCount,
                    JlptLevel = k.JlptLevel?.Trim(),
                    SortOrder = k.SortOrder ?? o,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        if (request.Quiz != null)
        {
            var o = 0;
            foreach (var q in request.Quiz)
            {
                if (string.IsNullOrWhiteSpace(q.Question) || q.Options == null || q.Options.Count < 2)
                    continue;
                o++;
                var opts = q.Options.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
                if (opts.Count < 2) continue;
                var correct = Math.Clamp(q.CorrectIndex, 0, opts.Count - 1);
                _db.LessonQuizQuestions.Add(new LessonQuizQuestion
                {
                    LessonId = lessonId,
                    Question = q.Question.Trim(),
                    OptionsJson = JsonSerializer.Serialize(opts),
                    CorrectIndex = correct,
                    SortOrder = q.SortOrder ?? o,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await BuildLessonFullAsync(lesson, cat, true);
    }

    public async Task<bool> StaffDeleteLessonAsync(int lessonId)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null) return false;

        /* DB có thể tạo FK không CASCADE — xóa explicit để tránh DbUpdateException. */
        var progresses = await _db.UserLessonProgresses.Where(p => p.LessonId == lessonId).ToListAsync();
        _db.UserLessonProgresses.RemoveRange(progresses);

        var bookmarks = await _db.UserBookmarks.Where(b => b.LessonId == lessonId).ToListAsync();
        _db.UserBookmarks.RemoveRange(bookmarks);

        var vocabs = await _db.VocabularyItems.Where(v => v.LessonId == lessonId).ToListAsync();
        _db.VocabularyItems.RemoveRange(vocabs);

        var kanjis = await _db.KanjiItems.Where(k => k.LessonId == lessonId).ToListAsync();
        _db.KanjiItems.RemoveRange(kanjis);

        var grammars = await _db.GrammarItems.Where(g => g.LessonId == lessonId).ToListAsync();
        _db.GrammarItems.RemoveRange(grammars);

        var quizzes = await _db.LessonQuizQuestions.Where(q => q.LessonId == lessonId).ToListAsync();
        _db.LessonQuizQuestions.RemoveRange(quizzes);

        var materials = await _db.LearningMaterials.Where(m => m.LessonId == lessonId).ToListAsync();
        foreach (var m in materials)
            m.LessonId = null;

        _db.Lessons.Remove(lesson);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<VocabularyItemDto> StaffAddVocabularyAsync(int lessonId, StaffVocabularyCreateRequest request)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new InvalidOperationException("Bài học không tồn tại.");

        if (string.IsNullOrWhiteSpace(request.WordJp))
            throw new InvalidOperationException("wordJp là bắt buộc.");

        var sortOrder = request.SortOrder ?? (await _db.VocabularyItems
            .Where(v => v.LessonId == lessonId)
            .MaxAsync(v => (int?)v.SortOrder) ?? 0) + 1;

        var now = DateTime.UtcNow;
        var entity = new VocabularyItem
        {
            LessonId = lessonId,
            WordJp = request.WordJp.Trim(),
            Reading = request.Reading?.Trim(),
            MeaningVi = request.MeaningVi?.Trim(),
            MeaningEn = request.MeaningEn?.Trim(),
            ExampleSentence = request.ExampleSentence?.Trim(),
            AudioUrl = string.IsNullOrWhiteSpace(request.AudioUrl) ? null : request.AudioUrl.Trim(),
            SortOrder = sortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.VocabularyItems.Add(entity);
        lesson.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return MapVocab(entity);
    }

    public async Task<VocabularyItemDto?> StaffUpdateVocabularyAsync(
        int lessonId, int vocabularyId, StaffVocabularyPatchRequest request)
    {
        var v = await _db.VocabularyItems.FirstOrDefaultAsync(x => x.Id == vocabularyId && x.LessonId == lessonId);
        if (v == null) return null;

        if (request.WordJp != null)
        {
            if (string.IsNullOrWhiteSpace(request.WordJp))
                throw new InvalidOperationException("wordJp không được để trống.");
            v.WordJp = request.WordJp.Trim();
        }

        if (request.Reading != null) v.Reading = request.Reading.Trim();
        if (request.MeaningVi != null) v.MeaningVi = request.MeaningVi.Trim();
        if (request.MeaningEn != null) v.MeaningEn = request.MeaningEn.Trim();
        if (request.ExampleSentence != null) v.ExampleSentence = request.ExampleSentence.Trim();
        if (request.AudioUrl != null)
            v.AudioUrl = string.IsNullOrWhiteSpace(request.AudioUrl) ? null : request.AudioUrl.Trim();
        if (request.SortOrder.HasValue) v.SortOrder = request.SortOrder.Value;

        v.UpdatedAt = DateTime.UtcNow;
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = v.UpdatedAt;
        await _db.SaveChangesAsync();
        return MapVocab(v);
    }

    public async Task<bool> StaffDeleteVocabularyAsync(int lessonId, int vocabularyId)
    {
        var v = await _db.VocabularyItems.FirstOrDefaultAsync(x => x.Id == vocabularyId && x.LessonId == lessonId);
        if (v == null) return false;
        _db.VocabularyItems.Remove(v);
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<KanjiItemDto> StaffAddKanjiAsync(int lessonId, StaffKanjiCreateRequest request)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new InvalidOperationException("Bài học không tồn tại.");

        if (string.IsNullOrWhiteSpace(request.Character))
            throw new InvalidOperationException("character là bắt buộc.");

        var sortOrder = request.SortOrder ?? (await _db.KanjiItems
            .Where(k => k.LessonId == lessonId)
            .MaxAsync(k => (int?)k.SortOrder) ?? 0) + 1;

        var now = DateTime.UtcNow;
        var entity = new KanjiItem
        {
            LessonId = lessonId,
            KanjiChar = request.Character.Trim(),
            ReadingsOn = request.ReadingsOn?.Trim(),
            ReadingsKun = request.ReadingsKun?.Trim(),
            MeaningVi = request.MeaningVi?.Trim(),
            MeaningEn = request.MeaningEn?.Trim(),
            StrokeCount = request.StrokeCount,
            JlptLevel = string.IsNullOrWhiteSpace(request.JlptLevel) ? null : request.JlptLevel.Trim(),
            SortOrder = sortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.KanjiItems.Add(entity);
        lesson.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return MapKanji(entity);
    }

    public async Task<KanjiItemDto?> StaffUpdateKanjiAsync(int lessonId, int kanjiId, StaffKanjiPatchRequest request)
    {
        var k = await _db.KanjiItems.FirstOrDefaultAsync(x => x.Id == kanjiId && x.LessonId == lessonId);
        if (k == null) return null;

        if (request.Character != null)
        {
            if (string.IsNullOrWhiteSpace(request.Character))
                throw new InvalidOperationException("character không được để trống.");
            k.KanjiChar = request.Character.Trim();
        }

        if (request.ReadingsOn != null) k.ReadingsOn = request.ReadingsOn.Trim();
        if (request.ReadingsKun != null) k.ReadingsKun = request.ReadingsKun.Trim();
        if (request.MeaningVi != null) k.MeaningVi = request.MeaningVi.Trim();
        if (request.MeaningEn != null) k.MeaningEn = request.MeaningEn.Trim();
        if (request.StrokeCount.HasValue) k.StrokeCount = request.StrokeCount;
        if (request.JlptLevel != null)
            k.JlptLevel = string.IsNullOrWhiteSpace(request.JlptLevel) ? null : request.JlptLevel.Trim();
        if (request.SortOrder.HasValue) k.SortOrder = request.SortOrder.Value;

        k.UpdatedAt = DateTime.UtcNow;
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = k.UpdatedAt;
        await _db.SaveChangesAsync();
        return MapKanji(k);
    }

    public async Task<bool> StaffDeleteKanjiAsync(int lessonId, int kanjiId)
    {
        var k = await _db.KanjiItems.FirstOrDefaultAsync(x => x.Id == kanjiId && x.LessonId == lessonId);
        if (k == null) return false;
        _db.KanjiItems.Remove(k);
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<GrammarItemDto> StaffAddGrammarAsync(int lessonId, StaffGrammarCreateRequest request)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new InvalidOperationException("Bài học không tồn tại.");

        if (string.IsNullOrWhiteSpace(request.Pattern))
            throw new InvalidOperationException("pattern là bắt buộc.");

        var levelId = request.LevelId;
        if (!levelId.HasValue)
        {
            levelId = await _db.LessonCategories.Where(c => c.Id == lesson.CategoryId)
                .Select(c => (int?)c.LevelId).FirstAsync();
        }
        else if (!await _db.Levels.AnyAsync(l => l.Id == levelId.Value))
            throw new InvalidOperationException("levelId không tồn tại.");

        var sortOrder = request.SortOrder ?? (await _db.GrammarItems
            .Where(g => g.LessonId == lessonId)
            .MaxAsync(g => (int?)g.SortOrder) ?? 0) + 1;

        var now = DateTime.UtcNow;
        var entity = new GrammarItem
        {
            LessonId = lessonId,
            Pattern = request.Pattern.Trim(),
            Structure = request.Structure?.Trim(),
            MeaningVi = request.MeaningVi?.Trim(),
            MeaningEn = request.MeaningEn?.Trim(),
            ExampleSentences = request.ExampleSentences?.Trim(),
            LevelId = levelId,
            SortOrder = sortOrder,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.GrammarItems.Add(entity);
        lesson.UpdatedAt = now;
        await _db.SaveChangesAsync();
        return MapGrammar(entity);
    }

    public async Task<GrammarItemDto?> StaffUpdateGrammarAsync(int lessonId, int grammarId, StaffGrammarPatchRequest request)
    {
        var g = await _db.GrammarItems.FirstOrDefaultAsync(x => x.Id == grammarId && x.LessonId == lessonId);
        if (g == null) return null;

        if (request.Pattern != null)
        {
            if (string.IsNullOrWhiteSpace(request.Pattern))
                throw new InvalidOperationException("pattern không được để trống.");
            g.Pattern = request.Pattern.Trim();
        }

        if (request.Structure != null) g.Structure = request.Structure.Trim();
        if (request.MeaningVi != null) g.MeaningVi = request.MeaningVi.Trim();
        if (request.MeaningEn != null) g.MeaningEn = request.MeaningEn.Trim();
        if (request.ExampleSentences != null) g.ExampleSentences = request.ExampleSentences.Trim();
        if (request.LevelId.HasValue)
        {
            if (!await _db.Levels.AnyAsync(l => l.Id == request.LevelId.Value))
                throw new InvalidOperationException("levelId không tồn tại.");
            g.LevelId = request.LevelId;
        }

        if (request.SortOrder.HasValue) g.SortOrder = request.SortOrder.Value;

        g.UpdatedAt = DateTime.UtcNow;
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = g.UpdatedAt;
        await _db.SaveChangesAsync();
        return MapGrammar(g);
    }

    public async Task<bool> StaffDeleteGrammarAsync(int lessonId, int grammarId)
    {
        var g = await _db.GrammarItems.FirstOrDefaultAsync(x => x.Id == grammarId && x.LessonId == lessonId);
        if (g == null) return false;
        _db.GrammarItems.Remove(g);
        var lesson = await _db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }
}