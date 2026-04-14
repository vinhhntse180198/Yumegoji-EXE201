using backend.Models.Learning;
using backend.Models.Level;
using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class LessonCategoryConfiguration : IEntityTypeConfiguration<LessonCategory>
{
    public void Configure(EntityTypeBuilder<LessonCategory> entity)
    {
        entity.ToTable("lesson_categories");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LevelId).HasColumnName("level_id");
        entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100);
        entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(100);
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(30);
        entity.Property(e => e.ThumbnailUrl).HasColumnName("thumbnail_url").HasMaxLength(500);
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.IsPremium).HasColumnName("is_premium");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Level).WithMany().HasForeignKey(e => e.LevelId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> entity)
    {
        entity.ToTable("lessons");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.CategoryId).HasColumnName("category_id");
        entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200);
        entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(200);
        entity.Property(e => e.Content).HasColumnName("content");
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.EstimatedMinutes).HasColumnName("estimated_minutes");
        entity.Property(e => e.IsPremium).HasColumnName("is_premium");
        entity.Property(e => e.IsPublished).HasColumnName("is_published");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.Property(e => e.CreatedBy).HasColumnName("created_by");
        entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);
        entity.HasIndex(e => new { e.CategoryId, e.IsPublished, e.SortOrder });
    }
}

internal sealed class VocabularyItemConfiguration : IEntityTypeConfiguration<VocabularyItem>
{
    public void Configure(EntityTypeBuilder<VocabularyItem> entity)
    {
        entity.ToTable("vocabulary_items");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.WordJp).HasColumnName("word_jp").HasMaxLength(100);
        entity.Property(e => e.Reading).HasColumnName("reading").HasMaxLength(200);
        entity.Property(e => e.MeaningVi).HasColumnName("meaning_vi").HasMaxLength(500);
        entity.Property(e => e.MeaningEn).HasColumnName("meaning_en").HasMaxLength(500);
        entity.Property(e => e.ExampleSentence).HasColumnName("example_sentence");
        entity.Property(e => e.AudioUrl).HasColumnName("audio_url").HasMaxLength(500);
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class KanjiItemConfiguration : IEntityTypeConfiguration<KanjiItem>
{
    public void Configure(EntityTypeBuilder<KanjiItem> entity)
    {
        entity.ToTable("kanji_items");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.KanjiChar).HasColumnName("character").HasMaxLength(10);
        entity.Property(e => e.ReadingsOn).HasColumnName("readings_on").HasMaxLength(200);
        entity.Property(e => e.ReadingsKun).HasColumnName("readings_kun").HasMaxLength(200);
        entity.Property(e => e.MeaningVi).HasColumnName("meaning_vi").HasMaxLength(300);
        entity.Property(e => e.MeaningEn).HasColumnName("meaning_en").HasMaxLength(300);
        entity.Property(e => e.StrokeCount).HasColumnName("stroke_count");
        entity.Property(e => e.JlptLevel).HasColumnName("jlpt_level").HasMaxLength(10);
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class LessonQuizQuestionConfiguration : IEntityTypeConfiguration<LessonQuizQuestion>
{
    public void Configure(EntityTypeBuilder<LessonQuizQuestion> entity)
    {
        entity.ToTable("lesson_quiz_questions");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.Question).HasColumnName("question");
        entity.Property(e => e.OptionsJson).HasColumnName("options_json");
        entity.Property(e => e.CorrectIndex).HasColumnName("correct_index");
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.Cascade);
        entity.HasIndex(e => new { e.LessonId, e.SortOrder });
    }
}

internal sealed class GrammarItemConfiguration : IEntityTypeConfiguration<GrammarItem>
{
    public void Configure(EntityTypeBuilder<GrammarItem> entity)
    {
        entity.ToTable("grammar_items");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.Pattern).HasColumnName("pattern").HasMaxLength(200);
        entity.Property(e => e.Structure).HasColumnName("structure");
        entity.Property(e => e.MeaningVi).HasColumnName("meaning_vi");
        entity.Property(e => e.MeaningEn).HasColumnName("meaning_en");
        entity.Property(e => e.ExampleSentences).HasColumnName("example_sentences");
        entity.Property(e => e.LevelId).HasColumnName("level_id");
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.SetNull);
        entity.HasOne<Level>().WithMany().HasForeignKey(e => e.LevelId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class UserLessonProgressConfiguration : IEntityTypeConfiguration<UserLessonProgress>
{
    public void Configure(EntityTypeBuilder<UserLessonProgress> entity)
    {
        entity.ToTable("user_lesson_progress");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
        entity.Property(e => e.ProgressPercent).HasColumnName("progress_percent");
        entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
        entity.Property(e => e.LastAccessedAt).HasColumnName("last_accessed_at");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(e => new { e.UserId, e.LessonId }).IsUnique();
        entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class UserBookmarkConfiguration : IEntityTypeConfiguration<UserBookmark>
{
    public void Configure(EntityTypeBuilder<UserBookmark> entity)
    {
        entity.ToTable("user_bookmarks");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.UserId, e.LessonId }).IsUnique();
        entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(e => e.Lesson).WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class LearningMaterialConfiguration : IEntityTypeConfiguration<LearningMaterial>
{
    public void Configure(EntityTypeBuilder<LearningMaterial> entity)
    {
        entity.ToTable("learning_materials");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.LessonId).HasColumnName("lesson_id");
        entity.Property(e => e.LevelId).HasColumnName("level_id");
        entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200);
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20);
        entity.Property(e => e.FileUrl).HasColumnName("file_url").HasMaxLength(500);
        entity.Property(e => e.FileSizeKb).HasColumnName("file_size_kb");
        entity.Property(e => e.IsPremium).HasColumnName("is_premium");
        entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
        entity.Property(e => e.DownloadCount).HasColumnName("download_count");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
    }
}
