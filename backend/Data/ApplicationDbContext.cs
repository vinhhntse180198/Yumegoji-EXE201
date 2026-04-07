using System;
using backend.Models.Chat;
using backend.Models.Assessment;
using backend.Models.Learning;
using backend.Models.Level;
using backend.Models.Moderation;
using backend.Models.Social;
using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace backend.Data;

/// <summary>DbContext cho YUMEGO-JI – SQL Server. Thêm DbSet khi có entity.</summary>
public class ApplicationDbContext : DbContext
{
    private readonly IConfiguration _configuration;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IConfiguration configuration)
        : base(options)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<ChatRoom> ChatRooms => Set<ChatRoom>();
    public DbSet<ChatRoomMember> ChatRoomMembers => Set<ChatRoomMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<BlockedUser> BlockedUsers => Set<BlockedUser>();
    public DbSet<UserOnlineStatus> UserOnlineStatuses => Set<UserOnlineStatus>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<SensitiveKeyword> SensitiveKeywords => Set<SensitiveKeyword>();
    public DbSet<Warning> Warnings => Set<Warning>();
    public DbSet<LessonCategory> LessonCategories => Set<LessonCategory>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<VocabularyItem> VocabularyItems => Set<VocabularyItem>();
    public DbSet<KanjiItem> KanjiItems => Set<KanjiItem>();
    public DbSet<GrammarItem> GrammarItems => Set<GrammarItem>();
    public DbSet<LessonQuizQuestion> LessonQuizQuestions => Set<LessonQuizQuestion>();
    public DbSet<UserLessonProgress> UserLessonProgresses => Set<UserLessonProgress>();
    public DbSet<UserBookmark> UserBookmarks => Set<UserBookmark>();
    public DbSet<LearningMaterial> LearningMaterials => Set<LearningMaterial>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostComment> PostComments => Set<PostComment>();
    public DbSet<PostReaction> PostReactions => Set<PostReaction>();
    public DbSet<PlacementResult> PlacementResults => Set<PlacementResult>();
    public DbSet<LevelUpTest> LevelUpTests => Set<LevelUpTest>();
    public DbSet<LevelUpQuestion> LevelUpQuestions => Set<LevelUpQuestion>();
    public DbSet<LevelUpQuestionOption> LevelUpQuestionOptions => Set<LevelUpQuestionOption>();
    public DbSet<LevelUpResult> LevelUpResults => Set<LevelUpResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id");
            entity.Property(u => u.Username).HasColumnName("username").HasMaxLength(50);
            entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(255);
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
        });

        modelBuilder.Entity<Level>(entity =>
        {
            entity.ToTable("levels");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(10);
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(50);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
        });

        modelBuilder.Entity<UserProfile>(entity =>
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
        });

        // Chat: chat_rooms; messages — cột người gửi: script chuẩn là user_id, nhiều DB SSMS dùng sender_id (map khớp bảng thật).
        modelBuilder.Entity<ChatRoom>(entity =>
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
        });

        modelBuilder.Entity<ChatRoomMember>(entity =>
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
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            // Script yumegoji: room_id. DB kiểu Moji/migrate: conversation_id → Yumegoji:MessagesRoomColumn
            var roomCol = _configuration["Yumegoji:MessagesRoomColumn"]?.Trim().ToLowerInvariant() ?? "room_id";
            var messageRoomSqlColumn = roomCol == "conversation_id" ? "conversation_id" : "room_id";
            entity.Property(e => e.RoomId).HasColumnName(messageRoomSqlColumn).IsRequired();
            // Script chuẩn: user_id. DB có sender_id → Yumegoji:MessagesAuthorColumn
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
        });

        modelBuilder.Entity<FriendRequest>(entity =>
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
        });

        modelBuilder.Entity<Friendship>(entity =>
        {
            entity.ToTable("friendships");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FriendId).HasColumnName("friend_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => new { e.UserId, e.FriendId }).IsUnique();
        });

        modelBuilder.Entity<BlockedUser>(entity =>
        {
            entity.ToTable("blocked_users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.BlockedUserId).HasColumnName("blocked_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => new { e.UserId, e.BlockedUserId }).IsUnique();
        });

        modelBuilder.Entity<UserOnlineStatus>(entity =>
        {
            entity.ToTable("user_online_status");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.LastSeenAt).HasColumnName("last_seen_at");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
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
        });

        modelBuilder.Entity<Report>(entity =>
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
        });

        modelBuilder.Entity<SensitiveKeyword>(entity =>
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
        });

        modelBuilder.Entity<Warning>(entity =>
        {
            entity.ToTable("warnings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ModeratorId).HasColumnName("moderator_id");
            entity.Property(e => e.ReportId).HasColumnName("report_id");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<LessonCategory>(entity =>
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
        });

        modelBuilder.Entity<Lesson>(entity =>
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
        });

        modelBuilder.Entity<VocabularyItem>(entity =>
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
        });

        modelBuilder.Entity<KanjiItem>(entity =>
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
        });

        modelBuilder.Entity<LessonQuizQuestion>(entity =>
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
        });

        modelBuilder.Entity<GrammarItem>(entity =>
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
        });

        modelBuilder.Entity<UserLessonProgress>(entity =>
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
        });

        modelBuilder.Entity<UserBookmark>(entity =>
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
        });

        modelBuilder.Entity<LearningMaterial>(entity =>
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
        });

        modelBuilder.Entity<Post>(entity =>
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
        });

        modelBuilder.Entity<PostComment>(entity =>
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
        });

        modelBuilder.Entity<PostReaction>(entity =>
        {
            entity.ToTable("post_reactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Emoji).HasColumnName("emoji").HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => new { e.PostId, e.UserId, e.Emoji }).IsUnique();
        });

        modelBuilder.Entity<PlacementResult>(entity =>
        {
            // Bảng mới dành riêng cho bài test đầu vào
            entity.ToTable("placement_results_app");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.CorrectCount).HasColumnName("correct_count");
            entity.Property(e => e.TotalCount).HasColumnName("total_count");
            entity.Property(e => e.LevelLabel).HasColumnName("level_label").HasMaxLength(10);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
        });

        modelBuilder.Entity<LevelUpTest>(entity =>
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
        });

        modelBuilder.Entity<LevelUpQuestion>(entity =>
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
        });

        modelBuilder.Entity<LevelUpQuestionOption>(entity =>
        {
            entity.ToTable("level_up_question_options");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.QuestionId).HasColumnName("question_id");
            entity.Property(e => e.OptionKey).HasColumnName("option_key").HasMaxLength(10);
            entity.Property(e => e.Text).HasColumnName("text");
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct");
            entity.HasOne(e => e.Question).WithMany(q => q.Options).HasForeignKey(e => e.QuestionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LevelUpResult>(entity =>
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
        });
    }
}

