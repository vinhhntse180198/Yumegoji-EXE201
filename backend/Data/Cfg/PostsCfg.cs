using backend.Models.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.Data.Cfg;

internal sealed class PostConfiguration : IEntityTypeConfiguration<Post>
{
    public void Configure(EntityTypeBuilder<Post> entity)
    {
        entity.ToTable("posts");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Content).HasColumnName("content");
        entity.Property(e => e.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
        entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        entity.HasIndex(e => new { e.UserId, e.CreatedAt });
    }
}

internal sealed class PostCommentConfiguration : IEntityTypeConfiguration<PostComment>
{
    public void Configure(EntityTypeBuilder<PostComment> entity)
    {
        entity.ToTable("post_comments");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.PostId).HasColumnName("post_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Content).HasColumnName("content");
        entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.PostId, e.CreatedAt });
    }
}

internal sealed class PostReactionConfiguration : IEntityTypeConfiguration<PostReaction>
{
    public void Configure(EntityTypeBuilder<PostReaction> entity)
    {
        entity.ToTable("post_reactions");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.PostId).HasColumnName("post_id");
        entity.Property(e => e.UserId).HasColumnName("user_id");
        entity.Property(e => e.Emoji).HasColumnName("emoji").HasMaxLength(50);
        entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        entity.HasIndex(e => new { e.PostId, e.UserId, e.Emoji }).IsUnique();
    }
}
