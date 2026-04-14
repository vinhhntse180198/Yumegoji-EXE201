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
    public async Task<IReadOnlyList<LevelDto>> GetLevelsAsync()
    {
        return await _db.Levels
            .OrderBy(l => l.SortOrder)
            .Select(l => new LevelDto
            {
                Id = l.Id,
                Code = l.Code,
                Name = l.Name,
                Description = l.Description,
                SortOrder = l.SortOrder
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<LessonCategoryDto>> GetLessonCategoriesAsync(int? levelId, string? type)
    {
        var q = _db.LessonCategories.AsQueryable();
        if (levelId.HasValue)
            q = q.Where(c => c.LevelId == levelId.Value);
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(c => c.Type == type);
        return await q.OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new LessonCategoryDto
            {
                Id = c.Id,
                LevelId = c.LevelId,
                Name = c.Name,
                Slug = c.Slug,
                Type = c.Type,
                ThumbnailUrl = c.ThumbnailUrl,
                SortOrder = c.SortOrder,
                IsPremium = c.IsPremium
            })
            .ToListAsync();
    }

    public async Task<PagedResultDto<LessonListItemDto>> GetLessonsPagedAsync(
        int? levelId, int? categoryId, int page, int pageSize, bool? isPremium)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = from l in _db.Lessons
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where l.IsPublished
            select new { l, c };

        if (levelId.HasValue)
            q = q.Where(x => x.c.LevelId == levelId.Value);
        if (categoryId.HasValue)
            q = q.Where(x => x.l.CategoryId == categoryId.Value);
        if (isPremium == true)
            q = q.Where(x => x.l.IsPremium || x.c.IsPremium);
        else if (isPremium == false)
            q = q.Where(x => !x.l.IsPremium && !x.c.IsPremium);

        var total = await q.CountAsync();
        var items = await q
            .OrderBy(x => x.c.SortOrder).ThenBy(x => x.l.SortOrder).ThenBy(x => x.l.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new LessonListItemDto
            {
                Id = x.l.Id,
                CategoryId = x.l.CategoryId,
                LevelId = x.c.LevelId,
                CategoryType = x.c.Type,
                CategoryName = x.c.Name,
                Title = x.l.Title,
                Slug = x.l.Slug,
                EstimatedMinutes = x.l.EstimatedMinutes,
                IsPremium = x.l.IsPremium || x.c.IsPremium,
                SortOrder = x.l.SortOrder
            })
            .ToListAsync();

        return new PagedResultDto<LessonListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<bool> IsUserPremiumAsync(int userId)
    {
        if (userId < 1) return false;
        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && u.DeletedAt == null)
            .Select(u => u.IsPremium)
            .FirstOrDefaultAsync();
    }

    public async Task<LessonFullDetailDto?> GetLessonDetailByIdAsync(int id)
    {
        var row = await (
            from l in _db.Lessons
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where l.Id == id && l.IsPublished
            select new { l, c }).FirstOrDefaultAsync();
        if (row == null) return null;
        return await BuildLessonFullAsync(row.l, row.c, false);
    }

    public async Task<LessonFullDetailDto?> GetLessonDetailBySlugAsync(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return null;
        var s = slug.Trim();
        var row = await (
            from l in _db.Lessons
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where l.Slug == s && l.IsPublished
            orderby l.Id
            select new { l, c }).FirstOrDefaultAsync();
        if (row == null) return null;
        /* Học viên xem bài theo slug: kèm quiz để ôn (đã publish). */
        return await BuildLessonFullAsync(row.l, row.c, true);
    }

    private async Task<LessonFullDetailDto> BuildLessonFullAsync(Lesson l, LessonCategory c, bool includeQuiz)
    {
        var lessonDto = new LessonDetailDto
        {
            Id = l.Id,
            CategoryId = l.CategoryId,
            LevelId = c.LevelId,
            CategoryName = c.Name,
            Title = l.Title,
            Slug = l.Slug,
            Content = l.Content,
            EstimatedMinutes = l.EstimatedMinutes,
            IsPremium = l.IsPremium || c.IsPremium,
            SortOrder = l.SortOrder
        };

        var vocab = (await _db.VocabularyItems
            .Where(v => v.LessonId == l.Id)
            .OrderBy(v => v.SortOrder).ThenBy(v => v.Id)
            .ToListAsync()).Select(MapVocab).ToList();

        var kanji = (await _db.KanjiItems
            .Where(k => k.LessonId == l.Id)
            .OrderBy(k => k.SortOrder).ThenBy(k => k.Id)
            .ToListAsync()).Select(MapKanji).ToList();

        var grammar = (await _db.GrammarItems
            .Where(g => g.LessonId == l.Id)
            .OrderBy(g => g.SortOrder).ThenBy(g => g.Id)
            .ToListAsync()).Select(MapGrammar).ToList();

        var quiz = includeQuiz
            ? (await _db.LessonQuizQuestions
                .Where(q => q.LessonId == l.Id)
                .OrderBy(q => q.SortOrder).ThenBy(q => q.Id)
                .ToListAsync()).Select(MapQuiz).ToList()
            : new List<LessonQuizQuestionDto>();

        return new LessonFullDetailDto
        {
            Lesson = lessonDto,
            Vocabulary = vocab,
            Kanji = kanji,
            Grammar = grammar,
            Quiz = quiz
        };
    }

    public async Task<IReadOnlyList<VocabularyItemDto>> GetVocabularyByLessonAsync(int lessonId)
    {
        var list = await _db.VocabularyItems
            .Where(v => v.LessonId == lessonId)
            .OrderBy(v => v.SortOrder).ThenBy(v => v.Id)
            .ToListAsync();
        return list.Select(MapVocab).ToList();
    }

    public async Task<PagedResultDto<VocabularyItemDto>> SearchVocabularyAsync(
        int? levelId, string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.VocabularyItems.AsQueryable();
        if (levelId.HasValue)
        {
            q = q.Where(v =>
                v.LessonId != null &&
                _db.Lessons.Any(l => l.Id == v.LessonId &&
                    _db.LessonCategories.Any(c => c.Id == l.CategoryId && c.LevelId == levelId.Value)));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            q = q.Where(v =>
                EF.Functions.Like(v.WordJp, pattern) ||
                (v.MeaningVi != null && EF.Functions.Like(v.MeaningVi, pattern)) ||
                (v.Reading != null && EF.Functions.Like(v.Reading, pattern)));
        }

        var total = await q.CountAsync();
        var rows = await q.OrderBy(v => v.LessonId).ThenBy(v => v.SortOrder).ThenBy(v => v.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();
        var items = rows.Select(MapVocab).ToList();

        return new PagedResultDto<VocabularyItemDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<VocabularyItemDto?> GetVocabularyByIdAsync(int id)
    {
        var v = await _db.VocabularyItems.FindAsync(id);
        return v == null ? null : MapVocab(v);
    }

    public async Task<IReadOnlyList<KanjiItemDto>> GetKanjiByLessonAsync(int lessonId)
    {
        var list = await _db.KanjiItems.Where(k => k.LessonId == lessonId)
            .OrderBy(k => k.SortOrder).ThenBy(k => k.Id)
            .ToListAsync();
        return list.Select(MapKanji).ToList();
    }

    public async Task<PagedResultDto<KanjiItemDto>> SearchKanjiAsync(
        string? jlptLevel, string? search, int? strokeCount, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.KanjiItems.AsQueryable();
        if (!string.IsNullOrWhiteSpace(jlptLevel))
            q = q.Where(k => k.JlptLevel == jlptLevel);
        if (strokeCount.HasValue)
            q = q.Where(k => k.StrokeCount == strokeCount.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            q = q.Where(k =>
                EF.Functions.Like(k.KanjiChar, pattern) ||
                (k.MeaningVi != null && EF.Functions.Like(k.MeaningVi, pattern)));
        }

        var total = await q.CountAsync();
        var rows = await q.OrderBy(k => k.LessonId).ThenBy(k => k.SortOrder).ThenBy(k => k.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();
        var items = rows.Select(MapKanji).ToList();
        return new PagedResultDto<KanjiItemDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<KanjiItemDto?> GetKanjiByIdAsync(int id)
    {
        var k = await _db.KanjiItems.FindAsync(id);
        return k == null ? null : MapKanji(k);
    }

    public async Task<IReadOnlyList<GrammarItemDto>> GetGrammarByLessonAsync(int lessonId)
    {
        var list = await _db.GrammarItems.Where(g => g.LessonId == lessonId)
            .OrderBy(g => g.SortOrder).ThenBy(g => g.Id)
            .ToListAsync();
        return list.Select(MapGrammar).ToList();
    }

    public async Task<PagedResultDto<GrammarItemDto>> SearchGrammarAsync(
        int? levelId, string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.GrammarItems.AsQueryable();
        if (levelId.HasValue)
        {
            var lid = levelId.Value;
            q = q.Where(g => g.LevelId == lid ||
                             (g.LessonId != null && _db.Lessons.Any(l => l.Id == g.LessonId &&
                                 _db.LessonCategories.Any(c => c.Id == l.CategoryId && c.LevelId == lid))));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            q = q.Where(g => EF.Functions.Like(g.Pattern, pattern) ||
                             (g.MeaningVi != null && EF.Functions.Like(g.MeaningVi, pattern)));
        }

        var total = await q.CountAsync();
        var rows = await q.OrderBy(g => g.LessonId).ThenBy(g => g.SortOrder).ThenBy(g => g.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();
        var items = rows.Select(MapGrammar).ToList();
        return new PagedResultDto<GrammarItemDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<GrammarItemDto?> GetGrammarByIdAsync(int id)
    {
        var g = await _db.GrammarItems.FindAsync(id);
        return g == null ? null : MapGrammar(g);
    }
}