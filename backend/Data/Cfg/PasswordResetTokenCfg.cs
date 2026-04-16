using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> entity)
    {
        entity.ToTable("password_reset_tokens");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Token).HasColumnName("token").HasMaxLength(255);
        entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
        entity.Property(e => e.UsedAt).HasColumnName("used_at");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => e.Token).IsUnique();
        entity.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
