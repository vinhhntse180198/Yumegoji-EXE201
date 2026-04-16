using backend.Models.Level;
using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.ToTable("users");
        entity.HasKey(u => u.Id);
        entity.Property(u => u.Id).HasColumnName("id");
        entity.Property(u => u.Username).HasColumnName("username").HasMaxLength(50);
        entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(255);
        entity.Property(u => u.GoogleSub).HasColumnName("google_sub").HasMaxLength(255);
        entity.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
        entity.Property(u => u.Role).HasColumnName("role").HasMaxLength(20);
        entity.Property(u => u.LevelId).HasColumnName("level_id");
        entity.Property(u => u.Exp).HasColumnName("exp");
        entity.Property(u => u.StreakDays).HasColumnName("streak_days");
        entity.Property(u => u.LastStreakAt).HasColumnName("last_streak_at");
        entity.Property(u => u.Xu).HasColumnName("xu");
        entity.Property(u => u.IsEmailVerified).HasColumnName("is_email_verified");
        entity.Property(u => u.IsLocked).HasColumnName("is_locked");
        entity.Property(u => u.LockedAt).HasColumnName("locked_at");
        entity.Property(u => u.LockedReason).HasColumnName("locked_reason");
        entity.Property(u => u.LastLoginAt).HasColumnName("last_login_at");
        entity.Property(u => u.CreatedAt).HasColumnName("created_at");
        entity.Property(u => u.UpdatedAt).HasColumnName("updated_at");
        entity.Property(u => u.DeletedAt).HasColumnName("deleted_at");
        entity.Property(u => u.IsPremium).HasColumnName("is_premium");
        entity.HasIndex(u => u.GoogleSub)
            .IsUnique()
            .HasDatabaseName("UX_users_google_sub")
            .HasFilter("[google_sub] IS NOT NULL");
    }
}

internal sealed class LevelConfiguration : IEntityTypeConfiguration<Level>
{
    public void Configure(EntityTypeBuilder<Level> entity)
    {
        entity.ToTable("levels");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(10);
        entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(50);
        entity.Property(e => e.Description).HasColumnName("description");
        entity.Property(e => e.SortOrder).HasColumnName("sort_order");
    }
}

internal sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> entity)
    {
        entity.ToTable("user_profiles");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(100);
        entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(500);
        entity.Property(e => e.CoverUrl).HasColumnName("cover_url").HasMaxLength(500);
        entity.Property(e => e.Bio).HasColumnName("bio");
        entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
        entity.Property(e => e.PrivacyProfile).HasColumnName("privacy_profile").HasMaxLength(20);
        entity.Property(e => e.PrivacyFriendRequest).HasColumnName("privacy_friend_request").HasMaxLength(20);
        entity.Property(e => e.Theme).HasColumnName("theme").HasMaxLength(10);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
