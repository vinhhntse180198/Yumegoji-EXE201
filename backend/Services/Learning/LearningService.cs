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

public class LearningService : ILearningService
{
    private readonly ApplicationDbContext _db;

    public LearningService(ApplicationDbContext db)
    {
        _db = db;
    }

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

    public async Task<UserLessonProgressDto> UpsertProgressAsync(int userId, int lessonId, UpsertProgressRequest request)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.IsPublished);
        if (lesson == null)
            throw new InvalidOperationException("Bài học không tồn tại hoặc chưa xuất bản.");

        var cat = await _db.LessonCategories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == lesson.CategoryId);
        var lessonIsPremium = lesson.IsPremium || (cat?.IsPremium ?? false);
        if (lessonIsPremium && !await IsUserPremiumAsync(userId))
            throw new InvalidOperationException("Nội dung Premium — cần nâng cấp gói.");

        var pct = Math.Clamp(request.ProgressPercent, 0, 100);
        var status = NormalizeStatus(request.Status);

        var row = await _db.UserLessonProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == lessonId);
        var now = DateTime.UtcNow;
        if (row == null)
        {
            row = new UserLessonProgress
            {
                UserId = userId,
                LessonId = lessonId,
                Status = status,
                ProgressPercent = pct,
                LastAccessedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
                CompletedAt = status == "completed" ? now : null
            };
            _db.UserLessonProgresses.Add(row);
        }
        else
        {
            row.Status = status;
            row.ProgressPercent = pct;
            row.LastAccessedAt = now;
            row.UpdatedAt = now;
            row.CompletedAt = status == "completed" ? row.CompletedAt ?? now : null;
        }

        await _db.SaveChangesAsync();
        return await MapProgressDtoAsync(userId, row);
    }

    private static string NormalizeStatus(string? s)
    {
        var t = (s ?? "in_progress").Trim().ToLowerInvariant();
        return t switch
        {
            "not_started" or "in_progress" or "completed" => t,
            _ => "in_progress"
        };
    }

    private async Task<UserLessonProgressDto> MapProgressDtoAsync(int userId, UserLessonProgress row)
    {
        var x = await (
            from p in _db.UserLessonProgresses
            join l in _db.Lessons on p.LessonId equals l.Id
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where p.UserId == userId && p.Id == row.Id
            select new { p, l, c }).FirstAsync();

        return new UserLessonProgressDto
        {
            LessonId = x.l.Id,
            LessonTitle = x.l.Title,
            LessonSlug = x.l.Slug,
            LevelId = x.c.LevelId,
            Status = x.p.Status,
            ProgressPercent = x.p.ProgressPercent,
            CompletedAt = x.p.CompletedAt,
            LastAccessedAt = x.p.LastAccessedAt
        };
    }

    public async Task<PagedResultDto<UserLessonProgressDto>> GetMyProgressAsync(
        int userId, string? status, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = from p in _db.UserLessonProgresses
            join l in _db.Lessons on p.LessonId equals l.Id
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where p.UserId == userId
            select new { p, l, c };

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToLowerInvariant();
            q = q.Where(x => x.p.Status == st);
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.p.LastAccessedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new UserLessonProgressDto
            {
                LessonId = x.l.Id,
                LessonTitle = x.l.Title,
                LessonSlug = x.l.Slug,
                LevelId = x.c.LevelId,
                Status = x.p.Status,
                ProgressPercent = x.p.ProgressPercent,
                CompletedAt = x.p.CompletedAt,
                LastAccessedAt = x.p.LastAccessedAt
            })
            .ToListAsync();

        return new PagedResultDto<UserLessonProgressDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<ProgressSummaryDto> GetProgressSummaryAsync(int userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            throw new InvalidOperationException("Người dùng không tồn tại.");

        var levels = await _db.Levels.OrderBy(l => l.SortOrder).ToListAsync();
        var byLevel = new List<LevelCompletionDto>();

        foreach (var lv in levels)
        {
            var totalPublished = await (
                from l in _db.Lessons
                join c in _db.LessonCategories on l.CategoryId equals c.Id
                where c.LevelId == lv.Id && l.IsPublished
                select l.Id).CountAsync();

            var completed = await (
                from p in _db.UserLessonProgresses
                join l in _db.Lessons on p.LessonId equals l.Id
                join c in _db.LessonCategories on l.CategoryId equals c.Id
                where p.UserId == userId && c.LevelId == lv.Id &&
                      p.Status == "completed" && l.IsPublished
                select p.LessonId).Distinct().CountAsync();

            var pct = totalPublished == 0 ? 0 : Math.Round(100.0 * completed / totalPublished, 2);
            byLevel.Add(new LevelCompletionDto
            {
                LevelId = lv.Id,
                LevelCode = lv.Code,
                LevelName = lv.Name,
                TotalPublishedLessons = totalPublished,
                CompletedLessons = completed,
                CompletionPercent = pct
            });
        }

        return new ProgressSummaryDto
        {
            Exp = user.Exp,
            Xu = user.Xu,
            StreakDays = user.StreakDays,
            ByLevel = byLevel
        };
    }

    public async Task<bool> AddBookmarkAsync(int userId, int lessonId)
    {
        if (!await _db.Lessons.AnyAsync(l => l.Id == lessonId && l.IsPublished))
            return false;
        if (await _db.UserBookmarks.AnyAsync(b => b.UserId == userId && b.LessonId == lessonId))
            return true;

        _db.UserBookmarks.Add(new UserBookmark
        {
            UserId = userId,
            LessonId = lessonId,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveBookmarkAsync(int userId, int lessonId)
    {
        var b = await _db.UserBookmarks.FirstOrDefaultAsync(x => x.UserId == userId && x.LessonId == lessonId);
        if (b == null) return false;
        _db.UserBookmarks.Remove(b);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResultDto<BookmarkLessonDto>> GetMyBookmarksAsync(int userId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = from b in _db.UserBookmarks
            join l in _db.Lessons on b.LessonId equals l.Id
            join c in _db.LessonCategories on l.CategoryId equals c.Id
            where b.UserId == userId
            select new { b, l, c };

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.b.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new BookmarkLessonDto
            {
                BookmarkId = x.b.Id,
                LessonId = x.l.Id,
                Title = x.l.Title,
                Slug = x.l.Slug,
                LevelId = x.c.LevelId,
                CreatedAt = x.b.CreatedAt
            })
            .ToListAsync();

        return new PagedResultDto<BookmarkLessonDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<IReadOnlyList<LearningMaterialDto>> GetLearningMaterialsAsync(
        int? levelId, int? lessonId, string? type, string? status)
    {
        var q = _db.LearningMaterials.AsQueryable();
        if (levelId.HasValue)
            q = q.Where(m => m.LevelId == levelId.Value);
        if (lessonId.HasValue)
            q = q.Where(m => m.LessonId == lessonId.Value);
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(m => m.Type == type);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(m => m.Status == status);

        return await q.OrderByDescending(m => m.UpdatedAt)
            .Select(m => new LearningMaterialDto
            {
                Id = m.Id,
                LessonId = m.LessonId,
                LevelId = m.LevelId,
                Title = m.Title,
                Type = m.Type,
                FileUrl = m.FileUrl,
                FileSizeKb = m.FileSizeKb,
                IsPremium = m.IsPremium,
                Status = m.Status,
                DownloadCount = m.DownloadCount
            })
            .ToListAsync();
    }

    public async Task<DownloadMaterialResponseDto?> RecordMaterialDownloadAsync(int id)
    {
        var m = await _db.LearningMaterials.FindAsync(id);
        if (m == null) return null;
        m.DownloadCount++;
        m.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new DownloadMaterialResponseDto { FileUrl = m.FileUrl, DownloadCount = m.DownloadCount };
    }

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
