using backend.Models.Chat;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class ChatRoomConfiguration : IEntityTypeConfiguration<ChatRoom>
{
    public void Configure(EntityTypeBuilder<ChatRoom> entity)
    {
        entity.ToTable("chat_rooms");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100);
        entity.Property(e => e.Slug).HasColumnName("slug").HasMaxLength(100);
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20);
        entity.Property(e => e.LevelId).HasColumnName("level_id");
        entity.Property(e => e.Description).HasColumnName("description");
        entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(500);
        entity.Property(e => e.MaxMembers).HasColumnName("max_members");
        entity.Property(e => e.IsActive).HasColumnName("is_active");
        entity.Property(e => e.CreatedBy).HasColumnName("created_by");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
    }
}

internal sealed class ChatRoomMemberConfiguration : IEntityTypeConfiguration<ChatRoomMember>
{
    public void Configure(EntityTypeBuilder<ChatRoomMember> entity)
    {
        entity.ToTable("chat_room_members");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.RoomId).HasColumnName("room_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20);
        entity.Property(e => e.JoinedAt).HasColumnName("joined_at");
        entity.Property(e => e.LastReadAt).HasColumnName("last_read_at");
        entity.HasIndex(e => new { e.RoomId, e.UserId }).IsUnique();
        entity.HasOne(e => e.Room).WithMany(r => r.Members).HasForeignKey(e => e.RoomId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction>
{
    public void Configure(EntityTypeBuilder<MessageReaction> entity)
    {
        entity.ToTable("message_reactions");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.MessageId).HasColumnName("message_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Emoji).HasColumnName("emoji").HasMaxLength(50);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.MessageId, e.UserId, e.Emoji }).IsUnique();
        entity.HasOne(e => e.Message).WithMany().HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
    }
}
