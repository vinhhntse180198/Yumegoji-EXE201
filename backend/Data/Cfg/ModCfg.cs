using backend.Models.Moderation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> entity)
    {
        entity.ToTable("reports");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.ReporterId).HasColumnName("reporter_id");
        entity.Property(e => e.ReportedUserId).HasColumnName("reported_user_id");
        entity.Property(e => e.MessageId).HasColumnName("message_id");
        entity.Property(e => e.RoomId).HasColumnName("room_id");
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20);
        entity.Property(e => e.Severity).HasColumnName("severity");
        entity.Property(e => e.Description).HasColumnName("description");
        entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
        entity.Property(e => e.AssignedModeratorId).HasColumnName("assigned_moderator_id");
        entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at");
        entity.Property(e => e.ResolutionNote).HasColumnName("resolution_note");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
    }
}

internal sealed class SensitiveKeywordConfiguration : IEntityTypeConfiguration<SensitiveKeyword>
{
    public void Configure(EntityTypeBuilder<SensitiveKeyword> entity)
    {
        entity.ToTable("sensitive_keywords");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.Keyword).HasColumnName("keyword").HasMaxLength(200);
        entity.Property(e => e.Severity).HasColumnName("severity");
        entity.Property(e => e.IsActive).HasColumnName("is_active");
        entity.Property(e => e.CreatedBy).HasColumnName("created_by");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
    }
}

internal sealed class WarningConfiguration : IEntityTypeConfiguration<Warning>
{
    public void Configure(EntityTypeBuilder<Warning> entity)
    {
        entity.ToTable("warnings");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.ModeratorId).HasColumnName("moderator_id");
        entity.Property(e => e.ReportId).HasColumnName("report_id");
        entity.Property(e => e.Reason).HasColumnName("reason");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
    }
}
