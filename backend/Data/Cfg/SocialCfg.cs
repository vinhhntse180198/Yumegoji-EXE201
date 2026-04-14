using backend.Models.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> entity)
    {
        entity.ToTable("friend_requests");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.FromUserId).HasColumnName("from_user_id");
        entity.Property(e => e.ToUserId).HasColumnName("to_user_id");
        entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.RespondedAt).HasColumnName("responded_at");
        entity.HasIndex(e => new { e.FromUserId, e.ToUserId }).IsUnique();
    }
}

internal sealed class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> entity)
    {
        entity.ToTable("friendships");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.FriendId).HasColumnName("friend_id");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.UserId, e.FriendId }).IsUnique();
    }
}

internal sealed class BlockedUserConfiguration : IEntityTypeConfiguration<BlockedUser>
{
    public void Configure(EntityTypeBuilder<BlockedUser> entity)
    {
        entity.ToTable("blocked_users");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.BlockedUserId).HasColumnName("blocked_user_id");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.UserId, e.BlockedUserId }).IsUnique();
    }
}

internal sealed class UserOnlineStatusConfiguration : IEntityTypeConfiguration<UserOnlineStatus>
{
    public void Configure(EntityTypeBuilder<UserOnlineStatus> entity)
    {
        entity.ToTable("user_online_status");
        entity.HasKey(e => e.UserId);
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.LastSeenAt).HasColumnName("last_seen_at");
        entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
    }
}
