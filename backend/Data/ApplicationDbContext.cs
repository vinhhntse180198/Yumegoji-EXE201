using System;
using backend.Data.Cfg;
using backend.Models.Admin;
using backend.Models.Assessment;
using backend.Models.Chat;
using backend.Models.Learning;
using backend.Models.Level;
using backend.Models.Moderation;
using backend.Models.Social;
using backend.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace backend.Data;

/// <summary>DbContext cho YUMEGO-JI – SQL Server. Cấu hình EF: <c>Data/Cfg/</c>.</summary>
public class ApplicationDbContext : DbContext
{
    private readonly IConfiguration _configuration;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IConfiguration configuration)
        : base(options)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
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
    public DbSet<SystemAnnouncement> SystemAnnouncements => Set<SystemAnnouncement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly,
            t => t != typeof(MessageCfg));
        modelBuilder.ApplyConfiguration(new MessageCfg(_configuration));
    }
}
