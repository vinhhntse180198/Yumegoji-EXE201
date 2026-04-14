using backend.Models.Assessment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class PlacementResultConfiguration : IEntityTypeConfiguration<PlacementResult>
{
    public void Configure(EntityTypeBuilder<PlacementResult> entity)
    {
        entity.ToTable("placement_results_app");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.CorrectCount).HasColumnName("correct_count");
        entity.Property(e => e.TotalCount).HasColumnName("total_count");
        entity.Property(e => e.LevelLabel).HasColumnName("level_label").HasMaxLength(10);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.UserId, e.CreatedAt });
    }
}

internal sealed class LevelUpTestConfiguration : IEntityTypeConfiguration<LevelUpTest>
{
    public void Configure(EntityTypeBuilder<LevelUpTest> entity)
    {
        entity.ToTable("level_up_tests");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.FromLevel).HasColumnName("from_level").HasMaxLength(10);
        entity.Property(e => e.ToLevel).HasColumnName("to_level").HasMaxLength(10);
        entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200);
        entity.Property(e => e.Description).HasColumnName("description");
        entity.Property(e => e.TotalPoints).HasColumnName("total_points");
        entity.Property(e => e.PassScore).HasColumnName("pass_score");
        entity.Property(e => e.IsActive).HasColumnName("is_active");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
    }
}

internal sealed class LevelUpQuestionConfiguration : IEntityTypeConfiguration<LevelUpQuestion>
{
    public void Configure(EntityTypeBuilder<LevelUpQuestion> entity)
    {
        entity.ToTable("level_up_questions");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.TestId).HasColumnName("test_id");
        entity.Property(e => e.OrderIndex).HasColumnName("order_index");
        entity.Property(e => e.Text).HasColumnName("text");
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20);
        entity.Property(e => e.Points).HasColumnName("points");
        entity.HasOne(e => e.Test).WithMany(t => t.Questions).HasForeignKey(e => e.TestId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class LevelUpQuestionOptionConfiguration : IEntityTypeConfiguration<LevelUpQuestionOption>
{
    public void Configure(EntityTypeBuilder<LevelUpQuestionOption> entity)
    {
        entity.ToTable("level_up_question_options");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.QuestionId).HasColumnName("question_id");
        entity.Property(e => e.OptionKey).HasColumnName("option_key").HasMaxLength(10);
        entity.Property(e => e.Text).HasColumnName("text");
        entity.Property(e => e.IsCorrect).HasColumnName("is_correct");
        entity.HasOne(e => e.Question).WithMany(q => q.Options).HasForeignKey(e => e.QuestionId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class LevelUpResultConfiguration : IEntityTypeConfiguration<LevelUpResult>
{
    public void Configure(EntityTypeBuilder<LevelUpResult> entity)
    {
        entity.ToTable("level_up_results");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.TestId).HasColumnName("test_id");
        entity.Property(e => e.FromLevel).HasColumnName("from_level").HasMaxLength(10);
        entity.Property(e => e.ToLevel).HasColumnName("to_level").HasMaxLength(10);
        entity.Property(e => e.Score).HasColumnName("score");
        entity.Property(e => e.MaxScore).HasColumnName("max_score");
        entity.Property(e => e.IsPassed).HasColumnName("is_passed");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.UserId, e.CreatedAt });
    }
}
