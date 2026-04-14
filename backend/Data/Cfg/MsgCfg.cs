using backend.Models.Chat;
using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.Extensions.Configuration;

namespace backend.Data.Cfg;

/// <summary>Map cột phòng / người gửi theo appsettings (DB legacy vs script chuẩn).</summary>
public sealed class MessageCfg : IEntityTypeConfiguration<Message>
{
    private readonly IConfiguration _configuration;

    public MessageCfg(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void Configure(EntityTypeBuilder<Message> entity)
    {
        entity.ToTable("messages");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        var roomCol = _configuration["Yumegoji:MessagesRoomColumn"]?.Trim().ToLowerInvariant() ?? "room_id";
        var messageRoomSqlColumn = roomCol == "conversation_id" ? "conversation_id" : "room_id";
        entity.Property(e => e.RoomId).HasColumnName(messageRoomSqlColumn).IsRequired();
        var authorCol = _configuration["Yumegoji:MessagesAuthorColumn"]?.Trim().ToLowerInvariant() ?? "user_id";
        var messageAuthorSqlColumn = authorCol == "sender_id" ? "sender_id" : "user_id";
        entity.Property(e => e.UserId).HasColumnName(messageAuthorSqlColumn).IsRequired();
        entity.Property(e => e.Content).HasColumnName("content");
        entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20);
        entity.Property(e => e.ReplyToId).HasColumnName("reply_to_id");
        entity.Property(e => e.IsPinned).HasColumnName("is_pinned");
        entity.Property(e => e.PinnedBy).HasColumnName("pinned_by");
        entity.Property(e => e.PinnedAt).HasColumnName("pinned_at");
        entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
        entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasOne(e => e.Room).WithMany(r => r.Messages).HasForeignKey(e => e.RoomId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<User>().WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        entity.HasOne(e => e.ReplyTo).WithMany().HasForeignKey(e => e.ReplyToId).OnDelete(DeleteBehavior.NoAction);
    }
}
