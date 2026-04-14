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
}