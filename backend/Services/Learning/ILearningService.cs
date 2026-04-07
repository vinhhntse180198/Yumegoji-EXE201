using System.Collections.Generic;
using System.Threading.Tasks;
using backend.DTOs.Learning;

namespace backend.Services.Learning;

public interface ILearningService
{
    Task<IReadOnlyList<LevelDto>> GetLevelsAsync();
    Task<IReadOnlyList<LessonCategoryDto>> GetLessonCategoriesAsync(int? levelId, string? type);
    Task<PagedResultDto<LessonListItemDto>> GetLessonsPagedAsync(int? levelId, int? categoryId, int page, int pageSize, bool? isPremium);
    Task<bool> IsUserPremiumAsync(int userId);
    Task<LessonFullDetailDto?> GetLessonDetailByIdAsync(int id);
    Task<LessonFullDetailDto?> GetLessonDetailBySlugAsync(string slug);
    Task<IReadOnlyList<VocabularyItemDto>> GetVocabularyByLessonAsync(int lessonId);
    Task<PagedResultDto<VocabularyItemDto>> SearchVocabularyAsync(int? levelId, string? search, int page, int pageSize);
    Task<VocabularyItemDto?> GetVocabularyByIdAsync(int id);
    Task<IReadOnlyList<KanjiItemDto>> GetKanjiByLessonAsync(int lessonId);
    Task<PagedResultDto<KanjiItemDto>> SearchKanjiAsync(string? jlptLevel, string? search, int? strokeCount, int page, int pageSize);
    Task<KanjiItemDto?> GetKanjiByIdAsync(int id);
    Task<IReadOnlyList<GrammarItemDto>> GetGrammarByLessonAsync(int lessonId);
    Task<PagedResultDto<GrammarItemDto>> SearchGrammarAsync(int? levelId, string? search, int page, int pageSize);
    Task<GrammarItemDto?> GetGrammarByIdAsync(int id);
    Task<UserLessonProgressDto> UpsertProgressAsync(int userId, int lessonId, UpsertProgressRequest request);
    Task<PagedResultDto<UserLessonProgressDto>> GetMyProgressAsync(int userId, string? status, int page, int pageSize);
    Task<ProgressSummaryDto> GetProgressSummaryAsync(int userId);
    Task<bool> AddBookmarkAsync(int userId, int lessonId);
    Task<bool> RemoveBookmarkAsync(int userId, int lessonId);
    Task<PagedResultDto<BookmarkLessonDto>> GetMyBookmarksAsync(int userId, int page, int pageSize);
    Task<IReadOnlyList<LearningMaterialDto>> GetLearningMaterialsAsync(int? levelId, int? lessonId, string? type, string? status);
    Task<DownloadMaterialResponseDto?> RecordMaterialDownloadAsync(int id);

    /// <summary>Cập nhật bài học (moderator/admin). Trả về null nếu không có lesson.</summary>
    Task<LessonFullDetailDto?> UpdateLessonByStaffAsync(int lessonId, StaffUpdateLessonRequest request);

    /// <summary>Chi tiết bài kể cả chưa publish — dùng màn hình soạn thảo.</summary>
    Task<LessonFullDetailDto?> GetLessonFullForStaffAsync(int lessonId);

    Task<VocabularyItemDto> StaffAddVocabularyAsync(int lessonId, StaffVocabularyCreateRequest request);
    Task<VocabularyItemDto?> StaffUpdateVocabularyAsync(int lessonId, int vocabularyId, StaffVocabularyPatchRequest request);
    Task<bool> StaffDeleteVocabularyAsync(int lessonId, int vocabularyId);

    Task<KanjiItemDto> StaffAddKanjiAsync(int lessonId, StaffKanjiCreateRequest request);
    Task<KanjiItemDto?> StaffUpdateKanjiAsync(int lessonId, int kanjiId, StaffKanjiPatchRequest request);
    Task<bool> StaffDeleteKanjiAsync(int lessonId, int kanjiId);

    Task<GrammarItemDto> StaffAddGrammarAsync(int lessonId, StaffGrammarCreateRequest request);
    Task<GrammarItemDto?> StaffUpdateGrammarAsync(int lessonId, int grammarId, StaffGrammarPatchRequest request);
    Task<bool> StaffDeleteGrammarAsync(int lessonId, int grammarId);

    /// <summary>Tạo bài học mới từ bản nháp (AI / form moderator), kèm từ vựng, ngữ pháp, kanji, quiz.</summary>
    Task<LessonFullDetailDto> StaffCreateLessonFromDraftAsync(
        StaffCreateLessonFromDraftRequest request,
        int? createdByUserId);

    /// <summary>Xóa hẳn bài học và dữ liệu gắn bài (từ vựng, kanji, ngữ pháp, quiz). Tiến độ/bookmark học viên cũng bị xóa theo FK.</summary>
    Task<bool> StaffDeleteLessonAsync(int lessonId);
}
