-- ============================================================================
-- [VI] File SQL gop tat ca script trong backend/doc/sql cho database YumegojiDB.
--     Tao DB neu chua co, roi chay lan luot. Khuyen dung SSMS, ket noi master.
-- [EN] Consolidated script; creates YumegojiDB if missing. SQL Server 2016+ (JSON).
--
-- KHONG gop (xung dot): create_placement_test_tables.sql (trung bang placement_questions).
--                       create_game_module_tables.sql (ban cu; da co schema + game_system_spec).
--
-- Moi khoi bat dau bang: -- FILE: <ten file>
-- ============================================================================

IF DB_ID(N'YumegojiDB') IS NULL
BEGIN
    CREATE DATABASE YumegojiDB;
END
GO
USE YumegojiDB;
GO

-- ============================================================================
-- FILE: yumegoji-schema-sqlserver.sql
-- (stripped duplicate CREATE DATABASE / USE from source; use header above)
-- ============================================================================
-- ============================================================
-- YUMEGO-JI - Website Học Tiếng Nhật qua Trò Chuyện
-- SQL Server Schema (chuyển từ DBML/PostgreSQL)
-- Chạy trên SQL Server 2016+ (hỗ trợ JSON)
-- ============================================================
SET NOCOUNT ON;


-- ==================== 1. BẢNG GỐC (KHÔNG PHỤ THUỘC) ====================

-- Trình độ N5, N4, N3
CREATE TABLE dbo.levels (
  id INT NOT NULL PRIMARY KEY,
  code NVARCHAR(10) NOT NULL UNIQUE CHECK (code IN ('N5','N4','N3')),
  name NVARCHAR(50) NOT NULL,
  description NVARCHAR(MAX),
  sort_order INT NOT NULL DEFAULT 1
);

-- ==================== 2. NGƯỜI DÙNG & XÁC THỰC ====================

CREATE TABLE dbo.users (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(50) NOT NULL UNIQUE,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NULL,
  role NVARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('guest','user','moderator','admin')),
  level_id INT NULL REFERENCES dbo.levels(id),
  exp INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  last_streak_at DATE NULL,
  xu INT NOT NULL DEFAULT 0,
  is_email_verified BIT NOT NULL DEFAULT 0,
  is_locked BIT NOT NULL DEFAULT 0,
  locked_at DATETIME2(7) NULL,
  locked_reason NVARCHAR(MAX) NULL,
  last_login_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  deleted_at DATETIME2(7) NULL,
  is_premium BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_users_level_locked ON dbo.users(level_id, is_locked);

CREATE TABLE dbo.user_profiles (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES dbo.users(id),
  display_name NVARCHAR(100) NULL,
  avatar_url NVARCHAR(500) NULL,
  cover_url NVARCHAR(500) NULL,
  bio NVARCHAR(MAX) NULL,
  date_of_birth DATE NULL,
  privacy_profile NVARCHAR(20) NULL DEFAULT 'public',
  privacy_friend_request NVARCHAR(20) NULL DEFAULT 'everyone',
  theme NVARCHAR(10) NULL DEFAULT 'light',
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.email_verifications (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  token NVARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME2(7) NOT NULL,
  used_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.password_reset_tokens (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  token NVARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME2(7) NOT NULL,
  used_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_sessions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  refresh_token_hash NVARCHAR(255) NOT NULL,
  device_info NVARCHAR(255) NULL,
  ip_address NVARCHAR(45) NULL,
  expires_at DATETIME2(7) NOT NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

DROP TABLE IF EXISTS dbo.user_activities_log
GO

CREATE TABLE dbo.user_activities_log (
    id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES dbo.users(id),
    activity_type NVARCHAR(50) NOT NULL,
    entity_type NVARCHAR(50) NULL,
    entity_id INT NULL,
    score INT NULL,
    metadata NVARCHAR(MAX) NULL,
    created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
)
GO
CREATE INDEX IX_user_activities_log_user_created ON dbo.user_activities_log(user_id, created_at);
CREATE INDEX IX_user_activities_log_type_created ON dbo.user_activities_log(activity_type, created_at);

CREATE TABLE dbo.user_statistics (
  user_id INT NOT NULL PRIMARY KEY REFERENCES dbo.users(id),
  lessons_completed INT NOT NULL DEFAULT 0,
  games_played INT NOT NULL DEFAULT 0,
  quizzes_completed INT NOT NULL DEFAULT 0,
  total_exp INT NOT NULL DEFAULT 0,
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

-- ==================== 3. HỌC TẬP ====================

CREATE TABLE dbo.lesson_categories (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  level_id INT NOT NULL REFERENCES dbo.levels(id),
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL,
  type NVARCHAR(30) NOT NULL,
  thumbnail_url NVARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_premium BIT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.lessons (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  category_id INT NOT NULL REFERENCES dbo.lesson_categories(id),
  title NVARCHAR(200) NOT NULL,
  slug NVARCHAR(200) NOT NULL,
  content NVARCHAR(MAX) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  estimated_minutes INT NOT NULL DEFAULT 10,
  is_premium BIT NOT NULL DEFAULT 0,
  is_published BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  created_by INT NULL REFERENCES dbo.users(id)
);
CREATE INDEX IX_lessons_category_published_sort ON dbo.lessons(category_id, is_published, sort_order);

CREATE TABLE dbo.vocabulary_items (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  lesson_id INT NULL REFERENCES dbo.lessons(id),
  word_jp NVARCHAR(100) NOT NULL,
  reading NVARCHAR(200) NULL,
  meaning_vi NVARCHAR(500) NULL,
  meaning_en NVARCHAR(500) NULL,
  example_sentence NVARCHAR(MAX) NULL,
  audio_url NVARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.kanji_items (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  lesson_id INT NULL REFERENCES dbo.lessons(id),
  character NVARCHAR(10) NOT NULL,
  readings_on NVARCHAR(200) NULL,
  readings_kun NVARCHAR(200) NULL,
  meaning_vi NVARCHAR(300) NULL,
  meaning_en NVARCHAR(300) NULL,
  stroke_count INT NULL,
  jlpt_level NVARCHAR(10) NULL CHECK (jlpt_level IS NULL OR jlpt_level IN ('N5','N4','N3')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.grammar_items (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  lesson_id INT NULL REFERENCES dbo.lessons(id),
  pattern NVARCHAR(200) NOT NULL,
  structure NVARCHAR(MAX) NULL,
  meaning_vi NVARCHAR(MAX) NULL,
  meaning_en NVARCHAR(MAX) NULL,
  example_sentences NVARCHAR(MAX) NULL,
  level_id INT NULL REFERENCES dbo.levels(id),
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_lesson_progress (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  lesson_id INT NOT NULL REFERENCES dbo.lessons(id),
  status NVARCHAR(20) NOT NULL DEFAULT 'not_started',
  progress_percent INT NOT NULL DEFAULT 0,
  completed_at DATETIME2(7) NULL,
  last_accessed_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_lesson_progress_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE TABLE dbo.user_bookmarks (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  lesson_id INT NOT NULL REFERENCES dbo.lessons(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_bookmarks_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE TABLE dbo.learning_materials (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  lesson_id INT NULL REFERENCES dbo.lessons(id),
  level_id INT NULL REFERENCES dbo.levels(id),
  title NVARCHAR(200) NOT NULL,
  type NVARCHAR(20) NOT NULL,
  file_url NVARCHAR(500) NOT NULL,
  file_size_kb INT NULL,
  is_premium BIT NOT NULL DEFAULT 0,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  download_count INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

-- ==================== 4. KIỂM TRA ĐẦU VÀO & NHANH ====================

CREATE TABLE dbo.placement_tests (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  total_questions INT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.placement_questions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  placement_test_id INT NOT NULL REFERENCES dbo.placement_tests(id),
  type NVARCHAR(30) NOT NULL,
  question_text NVARCHAR(MAX) NOT NULL,
  options NVARCHAR(MAX) NOT NULL,
  correct_answer_index INT NOT NULL,
  explanation NVARCHAR(MAX) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.placement_results (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  placement_test_id INT NOT NULL REFERENCES dbo.placement_tests(id),
  score_vocabulary INT NOT NULL DEFAULT 0,
  score_reading INT NOT NULL DEFAULT 0,
  score_conversation INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL,
  level_result NVARCHAR(10) NOT NULL CHECK (level_result IN ('N5','N4','N3')),
  answers_detail NVARCHAR(MAX) NULL,
  completed_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_placement_results_user ON dbo.placement_results(user_id);
CREATE INDEX IX_placement_results_completed ON dbo.placement_results(completed_at);

CREATE TABLE dbo.quick_quizzes (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  level_id INT NULL REFERENCES dbo.levels(id),
  title NVARCHAR(200) NOT NULL,
  type NVARCHAR(30) NULL,
  question_count INT NOT NULL DEFAULT 10,
  duration_seconds INT NOT NULL DEFAULT 300,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.quick_quiz_questions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  quick_quiz_id INT NOT NULL REFERENCES dbo.quick_quizzes(id),
  question_text NVARCHAR(MAX) NOT NULL,
  options NVARCHAR(MAX) NOT NULL,
  correct_answer_index INT NOT NULL,
  explanation NVARCHAR(MAX) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.quick_quiz_results (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  quick_quiz_id INT NOT NULL REFERENCES dbo.quick_quizzes(id),
  score INT NOT NULL,
  correct_count INT NOT NULL,
  total_questions INT NOT NULL,
  time_spent_seconds INT NULL,
  answers_detail NVARCHAR(MAX) NULL,
  completed_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_quick_quiz_results_user_quiz ON dbo.quick_quiz_results(user_id, quick_quiz_id);
CREATE INDEX IX_quick_quiz_results_completed ON dbo.quick_quiz_results(completed_at);

-- ==================== 5. TRÒ CHƠI ====================

CREATE TABLE dbo.games (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(MAX) NULL,
  skill_type NVARCHAR(50) NULL,
  level_min NVARCHAR(10) NULL,
  level_max NVARCHAR(10) NULL,
  max_hearts INT NOT NULL DEFAULT 3,
  rules_json NVARCHAR(MAX) NULL,
  icon_url NVARCHAR(500) NULL,
  is_pvp BIT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.game_sessions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  game_id INT NOT NULL REFERENCES dbo.games(id),
  score INT NOT NULL,
  max_combo INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL,
  total_questions INT NOT NULL,
  hearts_remaining INT NULL,
  hearts_lost INT NOT NULL DEFAULT 0,
  time_spent_seconds INT NULL,
  exp_earned INT NOT NULL DEFAULT 0,
  xu_earned INT NOT NULL DEFAULT 0,
  opponent_id INT NULL REFERENCES dbo.users(id),
  is_win BIT NULL,
  started_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  ended_at DATETIME2(7) NULL
);

CREATE TABLE dbo.leaderboard_periods (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  type NVARCHAR(30) NOT NULL,
  scope NVARCHAR(30) NOT NULL,
  level_id INT NULL REFERENCES dbo.levels(id),
  game_id INT NULL REFERENCES dbo.games(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.leaderboard_entries (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  period_id INT NOT NULL REFERENCES dbo.leaderboard_periods(id),
  user_id INT NOT NULL REFERENCES dbo.users(id),
  rank INT NOT NULL,
  score INT NOT NULL,
  accuracy_percent DECIMAL(5,2) NULL,
  avg_response_seconds DECIMAL(6,2) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_leaderboard_entries_period_user UNIQUE (period_id, user_id)
);
CREATE INDEX IX_leaderboard_entries_period_rank ON dbo.leaderboard_entries(period_id, rank);

CREATE TABLE dbo.achievements (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(MAX) NULL,
  icon_url NVARCHAR(500) NULL,
  condition_type NVARCHAR(50) NOT NULL,
  condition_value NVARCHAR(MAX) NULL,
  xu_reward INT NOT NULL DEFAULT 0,
  exp_reward INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_achievements (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  achievement_id INT NOT NULL REFERENCES dbo.achievements(id),
  unlocked_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_achievements_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE TABLE dbo.badges (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  description NVARCHAR(MAX) NULL,
  icon_url NVARCHAR(500) NULL,
  type NVARCHAR(30) NULL,
  is_premium_only BIT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_badges (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  badge_id INT NOT NULL REFERENCES dbo.badges(id),
  is_equipped BIT NOT NULL DEFAULT 0,
  unlocked_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_badges_user_badge UNIQUE (user_id, badge_id)
);

CREATE TABLE dbo.power_ups (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL,
  slug NVARCHAR(50) NOT NULL UNIQUE,
  description NVARCHAR(MAX) NULL,
  effect_type NVARCHAR(30) NOT NULL,
  icon_url NVARCHAR(500) NULL,
  xu_price INT NOT NULL DEFAULT 0,
  is_premium BIT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_inventory (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  power_up_id INT NOT NULL REFERENCES dbo.power_ups(id),
  quantity INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_inventory_user_powerup UNIQUE (user_id, power_up_id)
);

CREATE TABLE dbo.daily_rewards (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  reward_date DATE NOT NULL,
  reward_type NVARCHAR(30) NOT NULL,
  reward_value NVARCHAR(MAX) NULL,
  claimed_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_daily_rewards_user_date UNIQUE (user_id, reward_date)
);

CREATE TABLE dbo.daily_challenges (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  challenge_date DATE NOT NULL,
  game_id INT NULL REFERENCES dbo.games(id),
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  target_score INT NULL,
  target_accuracy INT NULL,
  reward_xu INT NOT NULL DEFAULT 0,
  reward_exp INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_daily_challenges_date_game UNIQUE (challenge_date, game_id)
);

CREATE TABLE dbo.user_daily_challenges (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  daily_challenge_id INT NOT NULL REFERENCES dbo.daily_challenges(id),
  completed_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  score_achieved INT NULL,
  reward_claimed BIT NOT NULL DEFAULT 0,
  CONSTRAINT UQ_user_daily_challenges_user_challenge UNIQUE (user_id, daily_challenge_id)
);

CREATE TABLE dbo.user_daily_usage (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  usage_date DATE NOT NULL,
  game_play_count INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_daily_usage_user_date UNIQUE (user_id, usage_date)
);

-- ==================== 6. CHAT & KẾT BẠN ====================

CREATE TABLE dbo.chat_rooms (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(100) NULL,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('public','level','private','group')),
  level_id INT NULL REFERENCES dbo.levels(id),
  description NVARCHAR(MAX) NULL,
  avatar_url NVARCHAR(500) NULL,
  max_members INT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.chat_room_members (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  room_id INT NOT NULL REFERENCES dbo.chat_rooms(id),
  user_id INT NOT NULL REFERENCES dbo.users(id),
  role NVARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  last_read_at DATETIME2(7) NULL,
  CONSTRAINT UQ_chat_room_members_room_user UNIQUE (room_id, user_id)
);

CREATE TABLE dbo.messages (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  room_id INT NOT NULL REFERENCES dbo.chat_rooms(id),
  user_id INT NOT NULL REFERENCES dbo.users(id),
  content NVARCHAR(MAX) NULL,
  type NVARCHAR(20) NOT NULL DEFAULT 'text',
  reply_to_id INT NULL,
  is_pinned BIT NOT NULL DEFAULT 0,
  pinned_by INT NULL REFERENCES dbo.users(id),
  pinned_at DATETIME2(7) NULL,
  is_deleted BIT NOT NULL DEFAULT 0,
  deleted_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
ALTER TABLE dbo.messages ADD CONSTRAINT FK_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES dbo.messages(id);
CREATE INDEX IX_messages_room_created ON dbo.messages(room_id, created_at);
CREATE INDEX IX_messages_user ON dbo.messages(user_id);

CREATE TABLE dbo.message_reactions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  message_id INT NOT NULL REFERENCES dbo.messages(id),
  user_id INT NOT NULL REFERENCES dbo.users(id),
  emoji NVARCHAR(50) NOT NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_message_reactions_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE dbo.friend_requests (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  from_user_id INT NOT NULL REFERENCES dbo.users(id),
  to_user_id INT NOT NULL REFERENCES dbo.users(id),
  status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  responded_at DATETIME2(7) NULL,
  CONSTRAINT UQ_friend_requests_from_to UNIQUE (from_user_id, to_user_id)
);
CREATE INDEX IX_friend_requests_to_status ON dbo.friend_requests(to_user_id, status);

CREATE TABLE dbo.friendships (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  friend_id INT NOT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_friendships_user_friend UNIQUE (user_id, friend_id)
);
CREATE INDEX IX_friendships_friend ON dbo.friendships(friend_id);

CREATE TABLE dbo.blocked_users (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  blocked_user_id INT NOT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_blocked_users_user_blocked UNIQUE (user_id, blocked_user_id)
);

CREATE TABLE dbo.user_online_status (
  user_id INT NOT NULL PRIMARY KEY REFERENCES dbo.users(id),
  last_seen_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  status NVARCHAR(20) NOT NULL DEFAULT 'offline'
);

-- ==================== 7. KIỂM DUYỆT ====================

CREATE TABLE dbo.reports (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  reporter_id INT NOT NULL REFERENCES dbo.users(id),
  reported_user_id INT NULL REFERENCES dbo.users(id),
  message_id INT NULL REFERENCES dbo.messages(id),
  room_id INT NULL REFERENCES dbo.chat_rooms(id),
  type NVARCHAR(20) NOT NULL CHECK (type IN ('spam','profanity','harassment','inappropriate','other')),
  severity INT NULL,
  description NVARCHAR(MAX) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','resolved','dismissed')),
  assigned_moderator_id INT NULL REFERENCES dbo.users(id),
  resolved_at DATETIME2(7) NULL,
  resolution_note NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_reports_status ON dbo.reports(status);
CREATE INDEX IX_reports_reported_user ON dbo.reports(reported_user_id);
CREATE INDEX IX_reports_created ON dbo.reports(created_at);

CREATE TABLE dbo.warnings (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  moderator_id INT NOT NULL REFERENCES dbo.users(id),
  report_id INT NULL REFERENCES dbo.reports(id),
  reason NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_mutes (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  moderator_id INT NOT NULL REFERENCES dbo.users(id),
  muted_until DATETIME2(7) NOT NULL,
  reason NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_user_mutes_user_until ON dbo.user_mutes(user_id, muted_until);

CREATE TABLE dbo.moderation_notes (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  moderator_id INT NOT NULL REFERENCES dbo.users(id),
  note NVARCHAR(MAX) NOT NULL,
  is_internal BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.sensitive_keywords (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  keyword NVARCHAR(200) NOT NULL UNIQUE,
  severity INT NOT NULL DEFAULT 1,
  is_active BIT NOT NULL DEFAULT 1,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.suspension_proposals (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  moderator_id INT NOT NULL REFERENCES dbo.users(id),
  reason NVARCHAR(MAX) NOT NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_id INT NULL REFERENCES dbo.users(id),
  decided_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

-- ==================== 8. THANH TOÁN & PREMIUM ====================

CREATE TABLE dbo.plans (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(50) NOT NULL UNIQUE,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('free','premium')),
  price_monthly DECIMAL(10,2) NULL,
  price_yearly DECIMAL(10,2) NULL,
  features NVARCHAR(MAX) NULL,
  max_friends INT NULL,
  game_plays_per_day INT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.subscriptions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  plan_id INT NOT NULL REFERENCES dbo.plans(id),
  status NVARCHAR(20) NOT NULL CHECK (status IN ('active','cancelled','expired')),
  started_at DATETIME2(7) NOT NULL,
  expires_at DATETIME2(7) NOT NULL,
  cancelled_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_subscriptions_user_status ON dbo.subscriptions(user_id, status);
CREATE INDEX IX_subscriptions_expires ON dbo.subscriptions(expires_at);

CREATE TABLE dbo.transactions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  subscription_id INT NULL REFERENCES dbo.subscriptions(id),
  type NVARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency NVARCHAR(3) NOT NULL DEFAULT 'VND',
  payment_method NVARCHAR(50) NULL,
  payment_reference NVARCHAR(255) NULL,
  status NVARCHAR(20) NOT NULL,
  metadata NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_transactions_user ON dbo.transactions(user_id);
CREATE INDEX IX_transactions_created ON dbo.transactions(created_at);
CREATE INDEX IX_transactions_reference ON dbo.transactions(payment_reference);

CREATE TABLE dbo.promo_codes (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  code NVARCHAR(50) NOT NULL UNIQUE,
  plan_id INT NULL REFERENCES dbo.plans(id),
  discount_type NVARCHAR(20) NULL,
  discount_value DECIMAL(10,2) NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  valid_from DATETIME2(7) NULL,
  valid_until DATETIME2(7) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.in_app_products (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  slug NVARCHAR(50) NOT NULL UNIQUE,
  type NVARCHAR(30) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency NVARCHAR(3) NOT NULL DEFAULT 'VND',
  target_id INT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.user_in_app_purchases (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  product_id INT NOT NULL REFERENCES dbo.in_app_products(id),
  transaction_id INT NULL REFERENCES dbo.transactions(id),
  purchased_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT UQ_user_in_app_purchases_user_product UNIQUE (user_id, product_id)
);

-- ==================== 9. THÔNG BÁO & HỖ TRỢ ====================

CREATE TABLE dbo.user_notification_preferences (
  user_id INT NOT NULL PRIMARY KEY REFERENCES dbo.users(id),
  email_optin BIT NOT NULL DEFAULT 1,
  browser_push_token NVARCHAR(MAX) NULL,
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.notifications (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  type NVARCHAR(50) NOT NULL,
  title NVARCHAR(200) NULL,
  body NVARCHAR(MAX) NULL,
  data NVARCHAR(MAX) NULL,
  read_at DATETIME2(7) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_notifications_user_read ON dbo.notifications(user_id, read_at);
CREATE INDEX IX_notifications_created ON dbo.notifications(created_at);

CREATE TABLE dbo.bug_reports (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  title NVARCHAR(200) NULL,
  description NVARCHAR(MAX) NOT NULL,
  page_url NVARCHAR(500) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.feedback (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  content NVARCHAR(MAX) NOT NULL,
  type NVARCHAR(30) NOT NULL DEFAULT 'suggestion',
  status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.system_announcements (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  title NVARCHAR(200) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  type NVARCHAR(30) NULL,
  is_published BIT NOT NULL DEFAULT 0,
  published_at DATETIME2(7) NULL,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

-- ==================== 10. CHATBOT AI ====================

CREATE TABLE dbo.chatbot_conversations (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  title NVARCHAR(200) NOT NULL DEFAULT N'Cuộc trò chuyện mới',
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.chatbot_messages (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES dbo.chatbot_conversations(id),
  role NVARCHAR(20) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  attachments NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_chatbot_messages_conversation_created ON dbo.chatbot_messages(conversation_id, created_at);

CREATE TABLE dbo.ai_learning_recommendations (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  conversation_id INT NULL REFERENCES dbo.chatbot_conversations(id),
  recommended_lesson_ids NVARCHAR(MAX) NULL,
  recommendation_type NVARCHAR(30) NULL,
  metadata NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_ai_learning_recommendations_user_created ON dbo.ai_learning_recommendations(user_id, created_at);

-- ==================== 11. AUDIT & NỘI DUNG ĐÓNG GÓP ====================

CREATE TABLE dbo.content_edit_logs (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  editor_id INT NOT NULL REFERENCES dbo.users(id),
  entity_type NVARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  action NVARCHAR(20) NOT NULL,
  old_value NVARCHAR(MAX) NULL,
  new_value NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_content_edit_logs_entity ON dbo.content_edit_logs(entity_type, entity_id);
CREATE INDEX IX_content_edit_logs_editor ON dbo.content_edit_logs(editor_id);
CREATE INDEX IX_content_edit_logs_created ON dbo.content_edit_logs(created_at);

CREATE TABLE dbo.audit_logs (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  actor_id INT NULL REFERENCES dbo.users(id),
  action NVARCHAR(100) NOT NULL,
  entity_type NVARCHAR(50) NOT NULL,
  entity_id INT NULL,
  changes NVARCHAR(MAX) NULL,
  ip_address NVARCHAR(45) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_audit_logs_actor ON dbo.audit_logs(actor_id);
CREATE INDEX IX_audit_logs_entity ON dbo.audit_logs(entity_type, entity_id);
CREATE INDEX IX_audit_logs_created ON dbo.audit_logs(created_at);

CREATE TABLE dbo.content_submissions (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES dbo.users(id),
  type NVARCHAR(30) NOT NULL,
  title NVARCHAR(200) NULL,
  content NVARCHAR(MAX) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by INT NULL REFERENCES dbo.users(id),
  approved_at DATETIME2(7) NULL,
  rejection_note NVARCHAR(MAX) NULL,
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_content_submissions_status_created ON dbo.content_submissions(status, created_at);
CREATE INDEX IX_content_submissions_user ON dbo.content_submissions(user_id);

-- ==================== 12. ANALYTICS ====================

CREATE TABLE dbo.analytics_snapshots (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_name NVARCHAR(100) NOT NULL,
  value NVARCHAR(MAX) NOT NULL,
  dimensions NVARCHAR(MAX) NULL,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_analytics_snapshots_date_metric ON dbo.analytics_snapshots(snapshot_date, metric_name);

-- ==================== 13. QUẢNG CÁO & ĐỐI TÁC ====================
-- affiliate_partners trước ads (ads có FK tới affiliate_partners)

CREATE TABLE dbo.affiliate_partners (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  partner_name NVARCHAR(200) NOT NULL,
  partner_code NVARCHAR(50) NULL UNIQUE,
  commission_rate DECIMAL(5,2) NULL,
  contact_info NVARCHAR(MAX) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE dbo.ads (
  id INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
  type NVARCHAR(20) NOT NULL CHECK (type IN ('banner','native')),
  name NVARCHAR(100) NULL,
  content_url NVARCHAR(500) NOT NULL,
  placement NVARCHAR(100) NULL,
  affiliate_partner_id INT NULL REFERENCES dbo.affiliate_partners(id),
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT 1,
  created_by INT NULL REFERENCES dbo.users(id),
  created_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2(7) NOT NULL DEFAULT SYSDATETIME()
);

PRINT N'Schema YUMEGO-JI đã tạo xong. Chạy file seed data để thêm dữ liệu levels (N5, N4, N3).';
-- ============================================================
-- Sửa FK messages.conversation_id → khớp API Chat (chat_rooms)
-- Lỗi: FK trỏ dbo.conversations trong khi backend dùng dbo.chat_rooms.
-- Chạy trên đúng database (vd: YumegojiDB). Nên backup trước.
-- ============================================================
GO

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Messages_conversations_conversation_id'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages DROP CONSTRAINT FK_Messages_conversations_conversation_id;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_messages_conversation_id_chat_rooms'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages
    ADD CONSTRAINT FK_messages_conversation_id_chat_rooms
    FOREIGN KEY (conversation_id) REFERENCES dbo.chat_rooms (id);
END
GO


-- ============================================================================
-- FILE: yumegoji_game_system_spec.sql
-- ============================================================================
/*
================================================================================
YUMEGO-JI — HỆ THỐNG GAME (theo đặc tả 6.x + STT game của bạn)
SQL Server — chạy trên YumegojiDB (đổi USE nếu cần).

Khớp:
- 9 game: Hiragana, Katakana, Kanji Memory, Vocab Speed, Sentence Builder,
          Counter Quest, Flashcard PvP, Boss Battle, Daily Challenge
- Power-up: 50:50, Time Freeze, Double Points, Skip, Heart (+ is_premium)
- Điểm: base 100, speed bonus, combo x1.2 / x1.5 / x2.0 (trong SP + game_score_configs)

LƯU Ý QUAN TRỌNG:
- Nếu trước đó đã chạy doc/sql/create_game_module_tables.sql và có bảng
  dbo.game_questions với cột game_id (schema cũ), CẦN xóa hoặc đổi tên bảng đó
  trước khi chạy phần tạo game_questions mới (theo set_id).
  Gợi ý (COMMENT — bỏ comment khi cần):
    -- DROP TABLE IF EXISTS dbo.game_session_answers;
    -- DROP TABLE IF EXISTS dbo.game_questions;
- Script có ALTER bảng dbo.games / dbo.power_ups nếu thiếu cột (tương thích bản cũ).

Giả định: đã có dbo.users(id), dbo.levels(id, code).
================================================================================
*/

USE YumegojiDB;
SET NOCOUNT ON;
GO

/* ---------- Hỗ trợ: user_statistics, user_activities_log ---------- */
IF OBJECT_ID(N'dbo.user_statistics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_statistics (
        user_id      INT NOT NULL CONSTRAINT PK_user_statistics PRIMARY KEY
            REFERENCES dbo.users (id) ON DELETE CASCADE,
        games_played INT NOT NULL CONSTRAINT DF_us_games DEFAULT (0),
        total_exp    INT NOT NULL CONSTRAINT DF_us_exp DEFAULT (0),
        updated_at   DATETIME2(7) NOT NULL CONSTRAINT DF_us_upd DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID(N'dbo.user_activities_log', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_activities_log (
        id             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ual PRIMARY KEY,
        user_id        INT NOT NULL REFERENCES dbo.users (id),
        activity_type  NVARCHAR(50) NOT NULL,
        entity_type    NVARCHAR(50) NULL,
        entity_id      INT NULL,
        score          INT NULL,
        created_at     DATETIME2(7) NOT NULL CONSTRAINT DF_ual_c DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_ual_user ON dbo.user_activities_log (user_id, created_at DESC);
END
GO

/* ---------- games: tạo mới hoặc bổ sung cột ---------- */
IF OBJECT_ID(N'dbo.games', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.games (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_games PRIMARY KEY,
        slug            NVARCHAR(100) NOT NULL,
        name            NVARCHAR(200) NOT NULL,
        description     NVARCHAR(MAX) NULL,
        skill_type      NVARCHAR(50) NULL,
        level_min       NVARCHAR(10) NULL,
        level_max       NVARCHAR(10) NULL,
        max_hearts      INT NOT NULL CONSTRAINT DF_games_hearts DEFAULT (3),
        is_pvp          BIT NOT NULL CONSTRAINT DF_games_pvp DEFAULT (0),
        is_boss_mode    BIT NOT NULL CONSTRAINT DF_games_boss DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_games_act DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_games_sort DEFAULT (0),
        config_json     NVARCHAR(MAX) NULL,
        created_at      DATETIME2(7) NOT NULL CONSTRAINT DF_games_cr DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2(7) NOT NULL CONSTRAINT DF_games_up DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_games_slug UNIQUE (slug)
    );
    CREATE INDEX IX_games_skill ON dbo.games (skill_type, is_active);
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.games', N'level_min') IS NULL
        ALTER TABLE dbo.games ADD level_min NVARCHAR(10) NULL;
    IF COL_LENGTH(N'dbo.games', N'level_max') IS NULL
        ALTER TABLE dbo.games ADD level_max NVARCHAR(10) NULL;
    IF COL_LENGTH(N'dbo.games', N'is_boss_mode') IS NULL
        ALTER TABLE dbo.games ADD is_boss_mode BIT NOT NULL CONSTRAINT DF_games_boss2 DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'config_json') IS NULL
        ALTER TABLE dbo.games ADD config_json NVARCHAR(MAX) NULL;
END
GO

/* ---------- power_ups ---------- */
IF OBJECT_ID(N'dbo.power_ups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.power_ups (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_power_ups PRIMARY KEY,
        slug            NVARCHAR(50) NOT NULL,
        name            NVARCHAR(100) NOT NULL,
        description     NVARCHAR(500) NULL,
        effect_type     NVARCHAR(50) NOT NULL,
        stackable       BIT NOT NULL CONSTRAINT DF_pu_stack DEFAULT (1),
        max_per_session INT NULL,
        xu_price        INT NULL,
        is_premium      BIT NOT NULL CONSTRAINT DF_pu_prem DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_pu_act DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_pu_sort DEFAULT (0),
        created_at      DATETIME2(7) NOT NULL CONSTRAINT DF_pu_cr DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_power_ups_slug UNIQUE (slug)
    );
END
ELSE IF COL_LENGTH(N'dbo.power_ups', N'is_premium') IS NULL
    ALTER TABLE dbo.power_ups ADD is_premium BIT NOT NULL CONSTRAINT DF_pu_prem2 DEFAULT (0);
GO

/* ---------- game_sessions (cột khớp SP Start/End) ---------- */
IF OBJECT_ID(N'dbo.game_sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_sessions (
        id                   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gs PRIMARY KEY,
        user_id              INT NOT NULL REFERENCES dbo.users (id),
        game_id              INT NOT NULL REFERENCES dbo.games (id),
        mode                 NVARCHAR(30) NOT NULL CONSTRAINT DF_gs_mode DEFAULT (N'solo'),
        score                INT NOT NULL CONSTRAINT DF_gs_sc DEFAULT (0),
        correct_count        INT NOT NULL CONSTRAINT DF_gs_cc DEFAULT (0),
        total_questions      INT NOT NULL CONSTRAINT DF_gs_tq DEFAULT (0),
        max_combo            INT NOT NULL CONSTRAINT DF_gs_mc DEFAULT (0),
        hearts_remaining     INT NULL,
        hearts_lost          INT NOT NULL CONSTRAINT DF_gs_hl DEFAULT (0),
        time_spent_seconds   INT NULL,
        exp_earned           INT NOT NULL CONSTRAINT DF_gs_exp DEFAULT (0),
        xu_earned            INT NOT NULL CONSTRAINT DF_gs_xu DEFAULT (0),
        pvp_room_id          INT NULL,
        boss_config_id       INT NULL,
        daily_challenge_id   INT NULL,
        set_id               INT NULL,
        metadata_json        NVARCHAR(MAX) NULL,
        started_at           DATETIME2(7) NOT NULL,
        ended_at             DATETIME2(7) NULL,
        created_at           DATETIME2(7) NOT NULL CONSTRAINT DF_gs_cr DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_gs_user ON dbo.game_sessions (user_id, started_at DESC);
    CREATE INDEX IX_gs_game ON dbo.game_sessions (game_id, started_at DESC);
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.game_sessions', N'correct_count') IS NULL
        ALTER TABLE dbo.game_sessions ADD correct_count INT NOT NULL CONSTRAINT DF_gs_cc2 DEFAULT (0);
    IF COL_LENGTH(N'dbo.game_sessions', N'total_questions') IS NULL
        ALTER TABLE dbo.game_sessions ADD total_questions INT NOT NULL CONSTRAINT DF_gs_tq2 DEFAULT (0);
    IF COL_LENGTH(N'dbo.game_sessions', N'time_spent_seconds') IS NULL
        ALTER TABLE dbo.game_sessions ADD time_spent_seconds INT NULL;
    IF COL_LENGTH(N'dbo.game_sessions', N'set_id') IS NULL
        ALTER TABLE dbo.game_sessions ADD set_id INT NULL;
    IF COL_LENGTH(N'dbo.game_sessions', N'pvp_room_id') IS NULL
        ALTER TABLE dbo.game_sessions ADD pvp_room_id INT NULL;
    IF COL_LENGTH(N'dbo.game_sessions', N'boss_config_id') IS NULL
        ALTER TABLE dbo.game_sessions ADD boss_config_id INT NULL;
    IF COL_LENGTH(N'dbo.game_sessions', N'daily_challenge_id') IS NULL
        ALTER TABLE dbo.game_sessions ADD daily_challenge_id INT NULL;
END
GO

/* ---------- game_question_sets ---------- */
IF OBJECT_ID(N'dbo.game_question_sets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_question_sets (
        id                    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gqs PRIMARY KEY,
        game_id               INT NOT NULL REFERENCES dbo.games (id),
        level_id              INT NULL REFERENCES dbo.levels (id),
        name                  NVARCHAR(200) NOT NULL,
        description           NVARCHAR(MAX) NULL,
        questions_per_round   INT NULL CONSTRAINT DF_gqs_qpr DEFAULT (10),
        time_per_question_s   INT NULL CONSTRAINT DF_gqs_tpq DEFAULT (10),
        is_active             BIT NOT NULL CONSTRAINT DF_gqs_act DEFAULT (1),
        sort_order            INT NOT NULL CONSTRAINT DF_gqs_sort DEFAULT (0),
        created_at            DATETIME2(7) NOT NULL CONSTRAINT DF_gqs_cr DEFAULT SYSUTCDATETIME(),
        updated_at            DATETIME2(7) NOT NULL CONSTRAINT DF_gqs_up DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_gqs_game_level ON dbo.game_question_sets (game_id, level_id);
END
GO

/* ---------- game_questions (theo set_id — schema mới) ---------- */
IF OBJECT_ID(N'dbo.game_questions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_questions (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gq PRIMARY KEY,
        set_id          INT NOT NULL REFERENCES dbo.game_question_sets (id),
        question_type   NVARCHAR(30) NOT NULL,
        question_text   NVARCHAR(500) NULL,
        hint_text       NVARCHAR(500) NULL,
        audio_url       NVARCHAR(500) NULL,
        image_url       NVARCHAR(500) NULL,
        options_json    NVARCHAR(MAX) NOT NULL,
        correct_index   INT NULL,
        explanation     NVARCHAR(MAX) NULL,
        base_score      INT NOT NULL CONSTRAINT DF_gq_bs DEFAULT (100),
        difficulty      TINYINT NOT NULL CONSTRAINT DF_gq_df DEFAULT (1),
        is_active       BIT NOT NULL CONSTRAINT DF_gq_act DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_gq_sort DEFAULT (0),
        created_at      DATETIME2(7) NOT NULL CONSTRAINT DF_gq_cr DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2(7) NOT NULL CONSTRAINT DF_gq_up DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_gq_diff CHECK (difficulty IN (1,2,3))
    );
    CREATE INDEX IX_gq_set ON dbo.game_questions (set_id, question_type, is_active);
END
GO

/* ---------- game_session_answers ---------- */
IF OBJECT_ID(N'dbo.game_session_answers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_session_answers (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gsa PRIMARY KEY,
        session_id       INT NOT NULL REFERENCES dbo.game_sessions (id) ON DELETE CASCADE,
        question_id      INT NOT NULL REFERENCES dbo.game_questions (id),
        question_order   INT NOT NULL,
        chosen_index     INT NULL,
        is_correct       BIT NOT NULL CONSTRAINT DF_gsa_ok DEFAULT (0),
        response_ms      INT NULL,
        score_earned     INT NOT NULL CONSTRAINT DF_gsa_se DEFAULT (0),
        combo_at_answer  INT NOT NULL CONSTRAINT DF_gsa_cb DEFAULT (0),
        power_up_used    NVARCHAR(50) NULL,
        answered_at      DATETIME2(7) NOT NULL CONSTRAINT DF_gsa_at DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_gsa_sess ON dbo.game_session_answers (session_id, question_order);
    CREATE INDEX IX_gsa_q ON dbo.game_session_answers (question_id, is_correct);
END
GO

/* ---------- game_session_powerups ---------- */
IF OBJECT_ID(N'dbo.game_session_powerups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_session_powerups (
        id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gspu PRIMARY KEY,
        session_id    INT NOT NULL REFERENCES dbo.game_sessions (id) ON DELETE CASCADE,
        power_up_id   INT NOT NULL REFERENCES dbo.power_ups (id),
        used_at_order INT NOT NULL,
        used_at       DATETIME2(7) NOT NULL CONSTRAINT DF_gspu_at DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_gspu_sess ON dbo.game_session_powerups (session_id);
END
GO

/* ---------- pvp_rooms (KHÔNG FK host_session_id → game_sessions: tránh vòng) ---------- */
IF OBJECT_ID(N'dbo.pvp_rooms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pvp_rooms (
        id                   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_pvp PRIMARY KEY,
        game_id              INT NOT NULL REFERENCES dbo.games (id),
        set_id               INT NULL REFERENCES dbo.game_question_sets (id),
        host_user_id         INT NOT NULL REFERENCES dbo.users (id),
        guest_user_id        INT NULL REFERENCES dbo.users (id),
        status               NVARCHAR(20) NOT NULL CONSTRAINT DF_pvp_st DEFAULT (N'waiting'),
        room_code            NVARCHAR(32) NOT NULL,
        level_id             INT NULL REFERENCES dbo.levels (id),
        host_session_id      INT NULL,
        guest_session_id     INT NULL,
        winner_user_id       INT NULL REFERENCES dbo.users (id),
        total_questions      INT NOT NULL CONSTRAINT DF_pvp_tq DEFAULT (10),
        question_order_json  NVARCHAR(MAX) NULL,
        started_at           DATETIME2(7) NULL,
        ended_at             DATETIME2(7) NULL,
        created_at           DATETIME2(7) NOT NULL CONSTRAINT DF_pvp_cr DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_pvp_code UNIQUE (room_code)
    );
    CREATE INDEX IX_pvp_status ON dbo.pvp_rooms (status, level_id);
    CREATE INDEX IX_pvp_host ON dbo.pvp_rooms (host_user_id, status);
END
GO

IF COL_LENGTH(N'dbo.game_sessions', N'pvp_room_id') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gs_pvp_room')
BEGIN
    ALTER TABLE dbo.game_sessions WITH NOCHECK
    ADD CONSTRAINT FK_gs_pvp_room FOREIGN KEY (pvp_room_id) REFERENCES dbo.pvp_rooms (id);
END
GO

/* ---------- boss_configs + boss_battle_sessions ---------- */
IF OBJECT_ID(N'dbo.boss_configs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.boss_configs (
        id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bossc PRIMARY KEY,
        game_id       INT NOT NULL REFERENCES dbo.games (id),
        level_id      INT NULL REFERENCES dbo.levels (id),
        set_id        INT NOT NULL REFERENCES dbo.game_question_sets (id),
        slug          NVARCHAR(100) NOT NULL,
        name          NVARCHAR(100) NOT NULL,
        description   NVARCHAR(MAX) NULL,
        image_url     NVARCHAR(500) NULL,
        hp            INT NOT NULL CONSTRAINT DF_bossc_hp DEFAULT (20),
        reward_xu     INT NOT NULL CONSTRAINT DF_bossc_rxu DEFAULT (100),
        reward_exp    INT NOT NULL CONSTRAINT DF_bossc_rexp DEFAULT (50),
        time_limit_s  INT NULL CONSTRAINT DF_bossc_tl DEFAULT (180),
        is_active     BIT NOT NULL CONSTRAINT DF_bossc_act DEFAULT (1),
        sort_order    INT NOT NULL CONSTRAINT DF_bossc_so DEFAULT (0),
        created_at    DATETIME2(7) NOT NULL CONSTRAINT DF_bossc_cr DEFAULT SYSUTCDATETIME(),
        updated_at    DATETIME2(7) NOT NULL CONSTRAINT DF_bossc_up DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_boss_configs_slug UNIQUE (slug)
    );
    CREATE INDEX IX_bossc_game ON dbo.boss_configs (game_id, level_id, is_active);
END
GO

IF OBJECT_ID(N'dbo.boss_battle_sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.boss_battle_sessions (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bbs PRIMARY KEY,
        session_id       INT NOT NULL UNIQUE REFERENCES dbo.game_sessions (id),
        boss_config_id   INT NOT NULL REFERENCES dbo.boss_configs (id),
        hp_remaining     INT NOT NULL CONSTRAINT DF_bbs_hpr DEFAULT (0),
        is_boss_defeated BIT NOT NULL CONSTRAINT DF_bbs_def DEFAULT (0),
        created_at       DATETIME2(7) NOT NULL CONSTRAINT DF_bbs_cr DEFAULT SYSUTCDATETIME()
    );
END
GO

IF COL_LENGTH(N'dbo.game_sessions', N'boss_config_id') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gs_boss_config')
BEGIN
    ALTER TABLE dbo.game_sessions WITH NOCHECK
    ADD CONSTRAINT FK_gs_boss_config FOREIGN KEY (boss_config_id) REFERENCES dbo.boss_configs (id);
END
GO

/* ---------- game_score_configs ---------- */
IF OBJECT_ID(N'dbo.game_score_configs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_score_configs (
        id                        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gsc PRIMARY KEY,
        game_id                   INT NOT NULL UNIQUE REFERENCES dbo.games (id),
        base_score                INT NOT NULL CONSTRAINT DF_gsc_bs DEFAULT (100),
        max_speed_bonus           INT NOT NULL CONSTRAINT DF_gsc_msb DEFAULT (50),
        speed_bonus_threshold_ms  INT NOT NULL CONSTRAINT DF_gsc_thr DEFAULT (3000),
        combo_rules_json          NVARCHAR(MAX) NOT NULL CONSTRAINT DF_gsc_combo DEFAULT (N'[{"min_combo":2,"multiplier":1.2},{"min_combo":5,"multiplier":1.5},{"min_combo":10,"multiplier":2.0}]'),
        penalty_per_miss          INT NOT NULL CONSTRAINT DF_gsc_pen DEFAULT (0),
        xu_base_reward            INT NOT NULL CONSTRAINT DF_gsc_xu DEFAULT (10),
        exp_base_reward           INT NOT NULL CONSTRAINT DF_gsc_exp DEFAULT (20),
        created_at                DATETIME2(7) NOT NULL CONSTRAINT DF_gsc_cr DEFAULT SYSUTCDATETIME(),
        updated_at                DATETIME2(7) NOT NULL CONSTRAINT DF_gsc_up DEFAULT SYSUTCDATETIME()
    );
END
GO

/* ---------- FK game_sessions.set_id ---------- */
IF COL_LENGTH(N'dbo.game_sessions', N'set_id') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_gs_question_set')
BEGIN
    ALTER TABLE dbo.game_sessions WITH NOCHECK
    ADD CONSTRAINT FK_gs_question_set FOREIGN KEY (set_id) REFERENCES dbo.game_question_sets (id);
END
GO

/* ============================================================
   SEED: games (9 game theo STT của bạn)
   ============================================================ */
MERGE dbo.games AS t
USING (VALUES
 (N'hiragana-match',       N'Hiragana Match',        N'Nhận diện và ghép Hiragana',                    N'hiragana',   N'N5', N'N5', 3, 0, 0, 1),
 (N'katakana-match',       N'Katakana Match',        N'Nhận diện và ghép Katakana',                    N'katakana',   N'N5', N'N5', 3, 0, 0, 2),
 (N'kanji-memory',         N'Kanji Memory',          N'Lật bài ghi nhớ Kanji',                         N'kanji',      N'N5', N'N3', 3, 0, 0, 3),
 (N'vocabulary-speed-quiz',N'Vocabulary Speed Quiz', N'Đố từ vựng phản xạ nhanh',                      N'vocabulary', N'N5', N'N3', 3, 0, 0, 4),
 (N'sentence-builder',     N'Sentence Builder',      N'Kéo thả từ để xây dựng câu',                    N'grammar',    N'N5', N'N3', 3, 0, 0, 6),
 (N'counter-quest',        N'Counter Quest',         N'Luyện đếm với trợ từ đếm (〜枚、〜台、〜匹...)', N'counter',    N'N5', N'N4', 3, 0, 0, 7),
 (N'flashcard-battle',     N'Flashcard Battle',      N'Đấu flashcard PvP',                             N'vocabulary', N'N5', N'N3', 3, 1, 0, 11),
 (N'boss-battle',          N'Boss Battle',           N'Đánh boss theo chủ đề',                         N'mixed',      N'N5', N'N3', 3, 0, 1, 12),
 (N'daily-challenge',      N'Daily Challenge',       N'Thử thách mỗi ngày',                            N'mixed',      N'N5', N'N3', 3, 0, 0, 13)
) AS s (slug, name, description, skill_type, level_min, level_max, max_hearts, is_pvp, is_boss_mode, sort_order)
ON t.slug = s.slug
WHEN MATCHED THEN UPDATE SET
    t.name = s.name, t.description = s.description, t.skill_type = s.skill_type,
    t.level_min = s.level_min, t.level_max = s.level_max, t.max_hearts = s.max_hearts,
    t.is_pvp = s.is_pvp, t.is_boss_mode = s.is_boss_mode, t.sort_order = s.sort_order,
    t.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (slug, name, description, skill_type, level_min, level_max, max_hearts, is_pvp, is_boss_mode, sort_order)
VALUES (s.slug, s.name, s.description, s.skill_type, s.level_min, s.level_max, s.max_hearts, s.is_pvp, s.is_boss_mode, s.sort_order);
GO

/* ---------- SEED power_ups (đặc tả 6.2) ---------- */
MERGE dbo.power_ups AS t
USING (VALUES
 (N'fifty-fifty',  N'50:50',        N'Loại bỏ 2 đáp án sai',              N'remove_two_wrong', 30, 0, 1),
 (N'time-freeze',  N'Time Freeze',  N'Đóng băng đồng hồ 5 giây',          N'freeze_timer',     40, 0, 2),
 (N'double-points',N'Double Points',N'Nhân đôi điểm câu tiếp theo',      N'double_score',     50, 0, 3),
 (N'skip',         N'Skip',         N'Bỏ qua câu, không mất mạng',        N'skip_question',    20, 0, 4),
 (N'heart',        N'Heart',        N'Hồi phục 1 mạng',                   N'restore_heart',    60, 0, 5)
) AS s (slug, name, description, effect_type, xu_price, is_premium, sort_order)
ON t.slug = s.slug
WHEN MATCHED THEN UPDATE SET
    t.name = s.name, t.description = s.description, t.effect_type = s.effect_type,
    t.xu_price = s.xu_price, t.is_premium = s.is_premium, t.sort_order = s.sort_order
WHEN NOT MATCHED THEN INSERT (slug, name, description, effect_type, xu_price, is_premium, sort_order)
VALUES (s.slug, s.name, s.description, s.effect_type, s.xu_price, s.is_premium, s.sort_order);
GO

/* ---------- SEED game_score_configs (mặc định theo game) ---------- */
INSERT INTO dbo.game_score_configs (game_id, base_score, max_speed_bonus, speed_bonus_threshold_ms, xu_base_reward, exp_base_reward)
SELECT g.id, 100, 50, 3000, 10, 20
FROM dbo.games g
WHERE g.slug IN (N'hiragana-match', N'katakana-match', N'counter-quest', N'sentence-builder', N'daily-challenge', N'flashcard-battle', N'boss-battle')
  AND NOT EXISTS (SELECT 1 FROM dbo.game_score_configs x WHERE x.game_id = g.id);

INSERT INTO dbo.game_score_configs (game_id, base_score, max_speed_bonus, speed_bonus_threshold_ms, xu_base_reward, exp_base_reward)
SELECT g.id, 100, 30, 5000, 15, 25
FROM dbo.games g
WHERE g.slug = N'kanji-memory'
  AND NOT EXISTS (SELECT 1 FROM dbo.game_score_configs x WHERE x.game_id = g.id);

INSERT INTO dbo.game_score_configs (game_id, base_score, max_speed_bonus, speed_bonus_threshold_ms, xu_base_reward, exp_base_reward)
SELECT g.id, 100, 100, 2000, 15, 25
FROM dbo.games g
WHERE g.slug = N'vocabulary-speed-quiz'
  AND NOT EXISTS (SELECT 1 FROM dbo.game_score_configs x WHERE x.game_id = g.id);
GO

/*
  Phần seed Hiragana / Katakana: giữ nguyên logic file mẫu của bạn
  (46 ký tự). Chạy khối dưới chỉ khi đã có levels.code = N5.
*/
DECLARE @hiragana_game_id INT = (SELECT id FROM dbo.games WHERE slug = N'hiragana-match');
DECLARE @katakana_game_id INT = (SELECT id FROM dbo.games WHERE slug = N'katakana-match');
DECLARE @level_n5_id INT = (SELECT id FROM dbo.levels WHERE code = N'N5');

IF @level_n5_id IS NOT NULL AND @hiragana_game_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.game_question_sets WHERE game_id = @hiragana_game_id AND name = N'Hiragana Cơ Bản N5')
    INSERT INTO dbo.game_question_sets (game_id, level_id, name, description, questions_per_round, time_per_question_s)
    VALUES (@hiragana_game_id, @level_n5_id, N'Hiragana Cơ Bản N5', N'46 ký tự Hiragana cơ bản', 10, 10);

IF @level_n5_id IS NOT NULL AND @katakana_game_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.game_question_sets WHERE game_id = @katakana_game_id AND name = N'Katakana Cơ Bản N5')
    INSERT INTO dbo.game_question_sets (game_id, level_id, name, description, questions_per_round, time_per_question_s)
    VALUES (@katakana_game_id, @level_n5_id, N'Katakana Cơ Bản N5', N'46 ký tự Katakana cơ bản', 10, 10);
GO

/* Hiragana questions — rút gọn: chỉ vài dòng mẫu; copy full từ script của bạn nếu cần đủ 46 */
DECLARE @set_h INT = (
    SELECT gqs.id FROM dbo.game_question_sets gqs
    JOIN dbo.games g ON gqs.game_id = g.id
    WHERE g.slug = N'hiragana-match' AND gqs.name = N'Hiragana Cơ Bản N5');

IF @set_h IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.game_questions WHERE set_id = @set_h)
BEGIN
    INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation) VALUES
    (@set_h, N'char_to_romaji', N'あ', N'[{"text":"a"},{"text":"i"},{"text":"u"},{"text":"e"}]', 0, N'あ = a'),
    (@set_h, N'char_to_romaji', N'か', N'[{"text":"ka"},{"text":"ki"},{"text":"sa"},{"text":"ta"}]', 0, N'か = ka'),
    (@set_h, N'char_to_romaji', N'ん', N'[{"text":"n"},{"text":"m"},{"text":"ng"},{"text":"nu"}]', 0, N'ん = n');
    /* TODO: thêm 43 câu còn lại từ bản đầy đủ của bạn */
END
GO

DECLARE @set_k INT = (
    SELECT gqs.id FROM dbo.game_question_sets gqs
    JOIN dbo.games g ON gqs.game_id = g.id
    WHERE g.slug = N'katakana-match' AND gqs.name = N'Katakana Cơ Bản N5');

IF @set_k IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.game_questions WHERE set_id = @set_k)
BEGIN
    INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation) VALUES
    (@set_k, N'char_to_romaji', N'ア', N'[{"text":"a"},{"text":"i"},{"text":"u"},{"text":"e"}]', 0, N'ア = a'),
    (@set_k, N'char_to_romaji', N'ン', N'[{"text":"n"},{"text":"m"},{"text":"ng"},{"text":"nu"}]', 0, N'ン = n');
END
GO

/* ============================================================
   STORED PROCEDURES (đã chỉnh combo + tương thích cột)
   ============================================================ */
CREATE OR ALTER PROCEDURE dbo.sp_StartGameSession
  @user_id    INT,
  @game_slug  NVARCHAR(100),
  @set_id     INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @game_id INT, @max_hearts INT, @session_id INT, @actual_set_id INT = @set_id, @questions_per_round INT;

  SELECT @game_id = id, @max_hearts = max_hearts FROM dbo.games WHERE slug = @game_slug AND ISNULL(is_active, 1) = 1;
  IF @game_id IS NULL
  BEGIN RAISERROR(N'Game không tồn tại hoặc chưa active', 16, 1); RETURN; END

  IF @actual_set_id IS NULL
  BEGIN
    /* Ưu tiên set đúng level; NULL level user → lấy mọi set active; nếu vẫn không có → bất kỳ set active của game */
    SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
    FROM dbo.game_question_sets gqs
    LEFT JOIN dbo.users u ON u.id = @user_id
    WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      AND (
        u.level_id IS NULL
        OR gqs.level_id IS NULL
        OR gqs.level_id = u.level_id
      )
    ORDER BY
      CASE WHEN u.level_id IS NOT NULL AND gqs.level_id = u.level_id THEN 0
           WHEN gqs.level_id IS NULL THEN 1
           ELSE 2 END,
      gqs.sort_order, gqs.id;

    IF @actual_set_id IS NULL
      SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
      FROM dbo.game_question_sets gqs
      WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      ORDER BY gqs.sort_order, gqs.id;
  END
  ELSE
    SELECT @questions_per_round = questions_per_round FROM dbo.game_question_sets WHERE id = @actual_set_id;

  IF @actual_set_id IS NULL
  BEGIN RAISERROR(N'Không tìm được question set', 16, 1); RETURN; END

  INSERT INTO dbo.game_sessions (user_id, game_id, score, correct_count, total_questions, hearts_remaining, set_id, started_at)
  VALUES (@user_id, @game_id, 0, 0, ISNULL(@questions_per_round, 10), @max_hearts, @actual_set_id, SYSUTCDATETIME());

  SET @session_id = SCOPE_IDENTITY();
  SELECT @session_id AS session_id, @max_hearts AS max_hearts, @actual_set_id AS set_id;

  SELECT TOP (ISNULL(@questions_per_round, 10))
    q.id, q.question_type, q.question_text, q.hint_text, q.audio_url, q.image_url, q.options_json, q.base_score, q.difficulty
  FROM dbo.game_questions q
  WHERE q.set_id = @actual_set_id AND ISNULL(q.is_active, 1) = 1
  ORDER BY NEWID();
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SubmitAnswer
  @session_id      INT,
  @question_id     INT,
  @question_order  INT,
  @chosen_index    INT,
  @response_ms     INT,
  @power_up_used   NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @is_correct BIT = 0, @correct_index INT;
  DECLARE @score_earned INT = 0, @speed_bonus INT = 0, @combo_now INT = 0;
  DECLARE @double_active BIT = 0;
  DECLARE @game_id INT;
  DECLARE @session_total_q INT, @ppt INT;

  SELECT @game_id = gs.game_id, @session_total_q = NULLIF(gs.total_questions, 0)
  FROM dbo.game_sessions gs WHERE gs.id = @session_id;

  SET @ppt = CASE
    WHEN @session_total_q IS NULL OR @session_total_q < 1 THEN 10
    ELSE CAST(ROUND(100.0 / @session_total_q, 0) AS INT) END;
  IF @ppt < 1 SET @ppt = 1;

  SELECT @correct_index = q.correct_index
  FROM dbo.game_questions q WHERE q.id = @question_id;

  IF @chosen_index IS NOT NULL AND @correct_index IS NOT NULL AND @chosen_index = @correct_index
    SET @is_correct = 1;

  /* Không cộng speed vào điểm — thang phiên tối đa 100 (sp_EndGameSession cũng chặn trần). */
  SET @speed_bonus = 0;

  /* Combo chỉ để hiển thị streak; điểm mỗi câu = 100/tổng câu, double-points ×2 câu đó. */
  DECLARE @ord INT = (SELECT ISNULL(MAX(question_order), 0) FROM dbo.game_session_answers WHERE session_id = @session_id);
  SET @combo_now = 0;
  WHILE @ord >= 1
  BEGIN
    IF EXISTS (SELECT 1 FROM dbo.game_session_answers WHERE session_id = @session_id AND question_order = @ord AND is_correct = 1)
      SET @combo_now = @combo_now + 1;
    ELSE BREAK;
    SET @ord = @ord - 1;
  END

  IF @is_correct = 1
  BEGIN
    SET @combo_now = @combo_now + 1;
    IF @power_up_used = N'double-points' SET @double_active = 1;
    SET @score_earned = @ppt * CASE WHEN @double_active = 1 THEN 2 ELSE 1 END;
  END
  ELSE
    SET @combo_now = 0;

  INSERT INTO dbo.game_session_answers
    (session_id, question_id, question_order, chosen_index, is_correct, response_ms, score_earned, combo_at_answer, power_up_used)
  VALUES
    (@session_id, @question_id, @question_order, @chosen_index, @is_correct, @response_ms, @score_earned, @combo_now, @power_up_used);

  SELECT @is_correct AS is_correct, @correct_index AS correct_index, @score_earned AS score_earned,
         @combo_now AS combo, @speed_bonus AS speed_bonus;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EndGameSession
  @session_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @user_id INT, @game_id INT, @total_q INT, @total_score INT, @correct INT, @max_combo INT,
          @time_spent INT, @xu_reward INT, @exp_reward INT;
  DECLARE @accuracy DECIMAL(5,2);

  SELECT @user_id = user_id, @game_id = game_id, @total_q = total_questions
  FROM dbo.game_sessions WHERE id = @session_id;

  SELECT
    @total_score = SUM(score_earned),
    @correct = SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END),
    @max_combo = MAX(combo_at_answer),
    @time_spent = CASE WHEN COUNT(*) > 1
      THEN DATEDIFF(SECOND, MIN(answered_at), MAX(answered_at)) ELSE 0 END
  FROM dbo.game_session_answers WHERE session_id = @session_id;

  SET @total_score = ISNULL(@total_score, 0);
  SET @correct = ISNULL(@correct, 0);
  SET @max_combo = ISNULL(@max_combo, 0);
  IF @total_score > 100 SET @total_score = 100;
  SET @accuracy = CASE WHEN @total_q > 0 THEN CAST(@correct AS DECIMAL(5,2)) / @total_q * 100 ELSE 0 END;

  /* EXP: 10 mỗi câu đúng (tối đa 100); Xu: 1 mỗi câu đúng */
  SET @exp_reward = @correct * 10;
  IF @exp_reward > 100 SET @exp_reward = 100;
  SET @xu_reward = @correct;
  IF @xu_reward < 0 SET @xu_reward = 0;

  UPDATE dbo.game_sessions SET
    score = @total_score,
    correct_count = @correct,
    max_combo = @max_combo,
    time_spent_seconds = @time_spent,
    exp_earned = @exp_reward,
    xu_earned = @xu_reward,
    ended_at = SYSUTCDATETIME()
  WHERE id = @session_id;

  UPDATE dbo.users SET
    exp = exp + @exp_reward,
    xu = xu + @xu_reward
  WHERE id = @user_id;

  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_statistics' AND schema_id = SCHEMA_ID(N'dbo'))
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM dbo.user_statistics WHERE user_id = @user_id)
        INSERT INTO dbo.user_statistics (user_id, games_played, total_exp) VALUES (@user_id, 1, @exp_reward);
      ELSE
        UPDATE dbo.user_statistics SET
          games_played = games_played + 1,
          total_exp = total_exp + @exp_reward,
          updated_at = SYSUTCDATETIME()
        WHERE user_id = @user_id;
    END
  END TRY BEGIN CATCH END CATCH

  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_activities_log' AND schema_id = SCHEMA_ID(N'dbo'))
      INSERT INTO dbo.user_activities_log (user_id, activity_type, entity_type, entity_id, score)
      VALUES (@user_id, N'game_completed', N'game', @game_id, @total_score);
  END TRY BEGIN CATCH END CATCH

  SELECT @total_score AS final_score, @correct AS correct_count, @total_q AS total_questions,
         @accuracy AS accuracy_percent, @max_combo AS max_combo, @time_spent AS time_spent_seconds,
         @exp_reward AS exp_earned, @xu_reward AS xu_earned;
END
GO

CREATE OR ALTER VIEW dbo.vw_question_stats AS
SELECT
  q.id AS question_id, q.question_text, q.question_type, g.name AS game_name,
  COUNT(a.id) AS total_attempts,
  SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
  CAST(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS DECIMAL(10,4))
    / NULLIF(COUNT(a.id), 0) * 100 AS accuracy_pct,
  AVG(CAST(a.response_ms AS FLOAT)) AS avg_response_ms
FROM dbo.game_questions q
JOIN dbo.game_question_sets gqs ON q.set_id = gqs.id
JOIN dbo.games g ON gqs.game_id = g.id
LEFT JOIN dbo.game_session_answers a ON a.question_id = q.id
GROUP BY q.id, q.question_text, q.question_type, g.name;
GO

CREATE OR ALTER VIEW dbo.vw_user_game_personal_best AS
SELECT
  gs.user_id, gs.game_id, g.name AS game_name,
  MAX(gs.score) AS personal_best,
  MAX(gs.max_combo) AS best_combo,
  COUNT(*) AS total_plays
FROM dbo.game_sessions gs
JOIN dbo.games g ON gs.game_id = g.id
WHERE gs.ended_at IS NOT NULL
GROUP BY gs.user_id, gs.game_id, g.name;
GO

PRINT N'[yumegoji_game_system_spec] Hoàn tất. Kiểm tra: SELECT * FROM games ORDER BY sort_order;';
GO


-- ============================================================================
-- FILE: create_level_up_tests.sql
-- ============================================================================
IF OBJECT_ID(N'level_up_results', N'U') IS NOT NULL
    DROP TABLE level_up_results;
IF OBJECT_ID(N'level_up_question_options', N'U') IS NOT NULL
    DROP TABLE level_up_question_options;
IF OBJECT_ID(N'level_up_questions', N'U') IS NOT NULL
    DROP TABLE level_up_questions;
IF OBJECT_ID(N'level_up_tests', N'U') IS NOT NULL
    DROP TABLE level_up_tests;
GO

CREATE TABLE level_up_tests (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    from_level   NVARCHAR(10) NOT NULL,
    to_level     NVARCHAR(10) NOT NULL,
    title        NVARCHAR(200) NOT NULL,
    description  NVARCHAR(500) NULL,
    total_points INT          NOT NULL DEFAULT 40,
    pass_score   INT          NOT NULL, -- điểm tối thiểu để đậu (80%)
    is_active    BIT          NOT NULL DEFAULT 1,
    created_at   DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE level_up_questions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    test_id     INT         NOT NULL REFERENCES level_up_tests(id) ON DELETE CASCADE,
    order_index INT         NOT NULL,
    text        NVARCHAR(MAX) NOT NULL,
    type        NVARCHAR(20)  NOT NULL DEFAULT 'single_choice',
    points      INT           NOT NULL DEFAULT 1
);
GO

CREATE TABLE level_up_question_options (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT          NOT NULL REFERENCES level_up_questions(id) ON DELETE CASCADE,
    option_key  NVARCHAR(10) NOT NULL,
    text        NVARCHAR(MAX) NOT NULL,
    is_correct  BIT           NOT NULL DEFAULT 0
);
GO

CREATE TABLE level_up_results (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    user_id   INT          NOT NULL,
    test_id   INT          NOT NULL REFERENCES level_up_tests(id),
    from_level NVARCHAR(10) NOT NULL,
    to_level   NVARCHAR(10) NOT NULL,
    score     INT          NOT NULL,
    max_score INT          NOT NULL,
    is_passed BIT          NOT NULL,
    created_at DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_level_up_results_user_created
    ON level_up_results(user_id, created_at);
GO

-- Seed mẫu 2 đề thi (40 câu / đề, pass >= 80%) để bạn test nhanh.
INSERT INTO level_up_tests (from_level, to_level, title, description, total_points, pass_score, is_active)
VALUES
('N5', 'N4', N'Thi lên N4', N'Bài thi nâng trình độ từ N5 lên N4 (mẫu).', 40, 32, 1),
('N4', 'N3', N'Thi lên N3', N'Bài thi nâng trình độ từ N4 lên N3 (mẫu).', 40, 32, 1);
GO

DECLARE @testN5N4 INT = (SELECT TOP 1 id FROM level_up_tests WHERE from_level = 'N5' AND to_level = 'N4' ORDER BY id);
DECLARE @testN4N3 INT = (SELECT TOP 1 id FROM level_up_tests WHERE from_level = 'N4' AND to_level = 'N3' ORDER BY id);

-- Đề mẫu 40 câu, dùng cho N5->N4. Moderator có thể sửa lại sau.
DECLARE @Q TABLE (
    qid        INT PRIMARY KEY,
    q          NVARCHAR(MAX),
    a1         NVARCHAR(MAX),
    a2         NVARCHAR(MAX),
    a3         NVARCHAR(MAX),
    a4         NVARCHAR(MAX),
    correctKey CHAR(1)
);

INSERT INTO @Q (qid, q, a1, a2, a3, a4, correctKey)
VALUES
 (1, N'これは＿＿ペンです。', N'わたし', N'わたしの', N'わたしを', N'わたしが', 'b')
,(2, N'いま、＿＿ですか。', N'なんじ', N'なんにち', N'なんさい', N'なんがつ', 'a')
,(3, N'わたしは毎日７時に＿＿。', N'ねます', N'おきます', N'いきます', N'たべます', 'b')
,(4, N'教室に学生が３０＿＿います。', N'まい', N'さつ', N'にん', N'ひき', 'c')
,(5, N'明日＿＿に行きます。', N'かいもの', N'かいものを', N'かいものが', N'かいもので', 'a')
,(6, N'これはいくらですか。＿＿、１０００円です。', N'すみません', N'どうも', N'はい', N'いいえ', 'c')
,(7, N'わたしのしゅみは本を＿＿ことです。', N'よむ', N'よみ', N'よんで', N'よみます', 'a')
,(8, N'山田さんは日本語がとても＿＿です。', N'じょうず', N'へた', N'ひま', N'きれい', 'a')
,(9, N'日曜日、どこ＿＿行きましたか。', N'が', N'で', N'に', N'を', 'c')
,(10, N'きのうは＿＿でしたか。', N'あつい', N'あつく', N'あつかった', N'あついです', 'c')
,(11, N'＿＿、もう一度言ってください。', N'ごちそうさま', N'いただきます', N'すみません', N'おめでとう', 'c')
,(12, N'わたしは日本のアニメ＿＿好きです。', N'が', N'で', N'に', N'を', 'a')
,(13, N'きょうは仕事が＿＿、とてもつかれました。', N'やさしくて', N'すくなくて', N'おおくて', N'うるさくて', 'c')
,(14, N'田中さんはどこに＿＿か。', N'すんで', N'すみます', N'すんでいます', N'すんでいました', 'c')
,(15, N'電車で＿＿ください。', N'すわって', N'すわらないで', N'すわります', N'すわった', 'a')
,(16, N'田中さんは今、日本で＿＿います。', N'はたらき', N'はたらく', N'はたらいて', N'はたらいて', 'd')
,(17, N'雨が＿＿、サッカーの試合は中止になりました。', N'ふると', N'ふって', N'ふったので', N'ふるから', 'c')
,(18, N'きのうは本を読んだり、音楽を聞いたり＿＿。', N'した', N'します', N'している', N'しない', 'a')
,(19, N'まだ夕ごはんを＿＿。', N'たべました', N'たべていません', N'たべませんでした', N'たべないです', 'b')
,(20, N'明日、雨が降る＿＿しれません。', N'に', N'かも', N'かもしれない', N'かもしれません', 'd')
,(21, N'A: 先生、宿題を忘れてしまいました。 B: そうですか。＿＿、こんどは気をつけてくださいね。', N'だから', N'でも', N'まあ', N'じゃあ', 'c')
,(22, N'A: いっしょに映画を見に行きませんか。 B: ＿＿、今日は用事があります。', N'すみませんが', N'ありがとうございます', N'そうですね', N'いいですよ', 'a')
,(23, N'あした雨が＿＿、ハイキングに行きます。', N'ふっても', N'ふらなくても', N'ふれば', N'ふらなければ', 'b')
,(24, N'これは日本人＿＿もむずかしい本です。', N'だけ', N'でも', N'に', N'さえ', 'b')
,(25, N'兄はギターを＿＿ことができます。', N'ひく', N'ひいて', N'ひくの', N'ひきます', 'a')
,(26, N'【読解】「田中さんは毎朝６時に起きて、朝ごはんを食べてから会社に行きます。週末はよく家族と買い物をします。」田中さんは＿＿と買い物をしますか。', N'一人', N'友だち', N'家族', N'会社の人', 'c')
,(27, N'A: 駅までどうやって行きますか。 B: このバスに＿＿行けますよ。', N'のると', N'のって', N'のれば', N'のっても', 'c')
,(28, N'日本語を上手に話せる＿＿、毎日練習しています。', N'ので', N'ように', N'から', N'ために', 'b')
,(29, N'１か月に日本語の本を何＿＿読みますか。', N'まい', N'さつ', N'だい', N'こ', 'b')
,(30, N'【読解】「来週、会社で大きいプロジェクトが始まります。わたしはリーダーになったので、とても忙しくなりそうです。」筆者は来週からどうなりそうですか。', N'ひまになりそうだ', N'仕事をやめそうだ', N'いそがしくなりそうだ', N'旅行に行きそうだ', 'c')
,(31, N'日本では、春になると桜が咲く＿＿です。', N'らしい', N'よう', N'そう', N'こと', 'a')
,(32, N'そんなに夜遅くまでゲームをしていたら、体に悪い＿＿。', N'ことになった', N'ことにした', N'のではないか', N'らしい', 'c')
,(33, N'大事な書類をなくして＿＿いました。', N'おいて', N'しまって', N'もらって', N'あげて', 'b')
,(34, N'健康のために、毎朝３０分歩くことに＿＿。', N'する', N'なった', N'している', N'なっている', 'a')
,(35, N'彼は日本に来た＿＿、日本語が上手になった。', N'ので', N'以来', N'うちに', N'ところ', 'b')
,(36, N'【読解】「私は１０年前に日本へ留学しました。最初はほとんど日本語が話せませんでしたが、毎日ニュースを見たり、日本人の友達と話したりして、少しずつ上手になりました。」筆者はどうやって日本語が上手になりましたか。', N'一人で勉強しただけだ', N'日本人の友達と話したりした', N'日本語の本を読まなかった', N'勉強するのをやめた', 'b')
,(37, N'A: あの、新しいプロジェクトの資料、もう読みましたか。 B: いいえ、＿＿。今日の午後読むつもりです。', N'まだ読んでいません', N'もう読みません', N'まだ読みませんでした', N'もう読んでいません', 'a')
,(38, N'日本語だけでなく、英語＿＿勉強する必要があります。', N'まで', N'など', N'さえ', N'も', 'd')
,(39, N'【読解】「この会社では、１日に３回ミーティングがあります。１回目は９時、２回目は１３時、３回目は１７時に行われます。」ミーティングは１日に何回行われますか。', N'１回', N'２回', N'３回', N'４回', 'c')
,(40, N'【読解】「最近、日本語の勉強があまり進んでいません。仕事が忙しくて、家に帰るといつも疲れてしまいます。それでも、日本語が上手になりたいので、毎日３０分だけでも勉強を続けようと思っています。」筆者はこれからどうしようと思っていますか。', N'日本語の勉強をやめる', N'毎日少しだけでも勉強を続ける', N'仕事をやめて日本語を勉強する', N'日本語ではなく英語を勉強する', 'b');

-- Tạo 40 câu hỏi cho đề N5->N4
INSERT INTO level_up_questions (test_id, order_index, text, type, points)
SELECT @testN5N4, qid, q, 'single_choice', 1
FROM @Q
ORDER BY qid;

-- Sao chép lại 40 câu từ đề N5->N4 sang đề N4->N3 (cùng nội dung, để bạn test trước).
INSERT INTO level_up_questions (test_id, order_index, text, type, points)
SELECT @testN4N3, qid, q, 'single_choice', 1
FROM @Q
ORDER BY qid;

-- Seed đầy đủ đáp án cho 40 câu N5->N4 dựa trên bảng @Q
INSERT INTO level_up_question_options (question_id, option_key, text, is_correct)
SELECT q.id,
       opt.option_key,
       opt.text,
       CASE WHEN opt.option_key = QQ.correctKey THEN 1 ELSE 0 END AS is_correct
FROM level_up_questions q
JOIN @Q AS QQ
    ON q.order_index = QQ.qid
   AND q.test_id = @testN5N4
CROSS APPLY (VALUES
    ('a', QQ.a1),
    ('b', QQ.a2),
    ('c', QQ.a3),
    ('d', QQ.a4)
) AS opt(option_key, text);

-- Seed đầy đủ đáp án cho 40 câu N4->N3 (sao chép cấu trúc và đáp án từ N5->N4)
INSERT INTO level_up_question_options (question_id, option_key, text, is_correct)
SELECT q2.id,
       opt.option_key,
       opt.text,
       CASE WHEN opt.option_key = QQ.correctKey THEN 1 ELSE 0 END AS is_correct
FROM level_up_questions q2
JOIN level_up_questions q1
    ON q1.order_index = q2.order_index
   AND q1.test_id = @testN5N4
   AND q2.test_id = @testN4N3
JOIN @Q AS QQ
    ON QQ.qid = q1.order_index
CROSS APPLY (VALUES
    ('a', QQ.a1),
    ('b', QQ.a2),
    ('c', QQ.a3),
    ('d', QQ.a4)
) AS opt(option_key, text);


-- ============================================================================
-- FILE: create_social_posts.sql
-- ============================================================================
IF OBJECT_ID(N'posts', N'U') IS NOT NULL
    DROP TABLE posts;
IF OBJECT_ID(N'post_comments', N'U') IS NOT NULL
    DROP TABLE post_comments;
IF OBJECT_ID(N'post_reactions', N'U') IS NOT NULL
    DROP TABLE post_reactions;
GO

CREATE TABLE posts (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NOT NULL,
    content     NVARCHAR(MAX) NULL,
    image_url   NVARCHAR(500) NULL,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2     NULL
);
GO

CREATE TABLE post_comments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    post_id     INT           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INT           NOT NULL,
    content     NVARCHAR(MAX) NOT NULL,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE post_reactions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    post_id     INT           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INT           NOT NULL,
    emoji       NVARCHAR(50)  NOT NULL,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_posts_user_created
    ON posts(user_id, created_at DESC);

CREATE UNIQUE INDEX IX_post_reactions_unique
    ON post_reactions(post_id, user_id, emoji);


-- ============================================================================
-- FILE: create_placement_results_app.sql
-- ============================================================================
IF OBJECT_ID(N'placement_results_app', N'U') IS NOT NULL
BEGIN
    DROP TABLE placement_results_app;
END;
GO

CREATE TABLE placement_results_app (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    user_id       INT           NOT NULL,
    correct_count INT           NOT NULL,
    total_count   INT           NOT NULL,
    level_label   NVARCHAR(10)  NOT NULL,  -- 'N5', 'N4', 'N3'
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_placement_results_app_user_created
    ON placement_results_app(user_id, created_at);
GO


-- ============================================================================
-- FILE: patch_achievements_leaderboard_v1.sql
-- ============================================================================
/*
  6.3 Achievements seed + 6.4 leaderboard (cột level_id tùy chọn).

  YumegojiDB / schema cũ thường có cột condition_type (NOT NULL) thay vì hoặc song song criteria_type.
  MERGE phải ghi condition_type = giá trị loại điều kiện (cùng nội dung criteria_type trong seed).

  Chạy trên SQL Server; đã có (hoặc sẽ tạo) dbo.achievements.
*/
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.leaderboard_periods', N'level_id') IS NULL
BEGIN
    ALTER TABLE dbo.leaderboard_periods ADD level_id INT NULL;
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'levels' AND schema_id = SCHEMA_ID(N'dbo'))
        AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_leaderboard_periods_level')
    BEGIN
        ALTER TABLE dbo.leaderboard_periods
        ADD CONSTRAINT FK_leaderboard_periods_level FOREIGN KEY (level_id) REFERENCES dbo.levels (id);
    END
END
GO

/* ---------- Chuẩn hoá dbo.achievements (đủ cột cho backend + MERGE) ---------- */
IF OBJECT_ID(N'dbo.achievements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.achievements (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_achievements_patch PRIMARY KEY,
        slug            NVARCHAR(100) NOT NULL,
        name            NVARCHAR(200) NOT NULL,
        description     NVARCHAR(MAX) NULL,
        icon_url        NVARCHAR(500) NULL,
        criteria_type   NVARCHAR(50) NOT NULL CONSTRAINT DF_ach_crit_patch DEFAULT (N'custom'),
        criteria_json   NVARCHAR(MAX) NULL,
        reward_exp      INT NOT NULL CONSTRAINT DF_ach_exp_patch DEFAULT (0),
        reward_xu       INT NOT NULL CONSTRAINT DF_ach_xu_patch DEFAULT (0),
        sort_order      INT NOT NULL CONSTRAINT DF_ach_sort_patch DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_ach_active_patch DEFAULT (1),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_ach_created_patch DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_achievements_slug_patch UNIQUE (slug)
    );
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.achievements', N'icon_url') IS NULL
        ALTER TABLE dbo.achievements ADD icon_url NVARCHAR(500) NULL;

    IF COL_LENGTH(N'dbo.achievements', N'criteria_type') IS NULL
        ALTER TABLE dbo.achievements ADD criteria_type NVARCHAR(50) NOT NULL
            CONSTRAINT DF_ach_ct_alter DEFAULT (N'custom');

    IF COL_LENGTH(N'dbo.achievements', N'criteria_json') IS NULL
        ALTER TABLE dbo.achievements ADD criteria_json NVARCHAR(MAX) NULL;

    IF COL_LENGTH(N'dbo.achievements', N'reward_exp') IS NULL
        ALTER TABLE dbo.achievements ADD reward_exp INT NOT NULL
            CONSTRAINT DF_ach_rexp_alter DEFAULT (0);

    IF COL_LENGTH(N'dbo.achievements', N'reward_xu') IS NULL
        ALTER TABLE dbo.achievements ADD reward_xu INT NOT NULL
            CONSTRAINT DF_ach_rxu_alter DEFAULT (0);

    IF COL_LENGTH(N'dbo.achievements', N'sort_order') IS NULL
        ALTER TABLE dbo.achievements ADD sort_order INT NOT NULL
            CONSTRAINT DF_ach_so_alter DEFAULT (0);

    IF COL_LENGTH(N'dbo.achievements', N'is_active') IS NULL
        ALTER TABLE dbo.achievements ADD is_active BIT NOT NULL
            CONSTRAINT DF_ach_ia_alter DEFAULT (1);

    IF COL_LENGTH(N'dbo.achievements', N'created_at') IS NULL
        ALTER TABLE dbo.achievements ADD created_at DATETIME2 NOT NULL
            CONSTRAINT DF_ach_cr_alter DEFAULT SYSUTCDATETIME();
END
GO

/* ---------- Seed achievements (đặc tả 6.3) ---------- */
/* Có condition_type (Yumegoji): ghi cả condition_type + criteria_type (nếu có cột). */
IF COL_LENGTH(N'dbo.achievements', N'condition_type') IS NOT NULL
BEGIN
    MERGE dbo.achievements AS t
    USING (VALUES
     (N'hiragana-master',     N'Hiragana Master',     N'Hoàn thành Hiragana Match với 100% độ chính xác', N'game_accuracy', N'{"gameSlug":"hiragana-match","minAccuracy":100}', 50, 30, 1),
     (N'katakana-master',     N'Katakana Master',     N'Hoàn thành Katakana Match với 100% độ chính xác', N'game_accuracy', N'{"gameSlug":"katakana-match","minAccuracy":100}', 50, 30, 2),
     (N'kanji-novice',        N'Kanji Novice',        N'Học 50 Kanji đầu tiên', N'kanji_learned', N'{"minCount":50}', 40, 20, 3),
     (N'kanji-hunter',        N'Kanji Hunter',        N'Học 200 Kanji', N'kanji_learned', N'{"minCount":200}', 80, 50, 4),
     (N'speed-demon',         N'Speed Demon',         N'TB < 2 giây trong 10 câu (một phiên)', N'speed_session', N'{"maxAvgMs":2000,"minAnswers":10}', 60, 40, 5),
     (N'combo-king',          N'Combo King',          N'Combo x5 trong một phiên', N'combo_session', N'{"minCombo":5}', 40, 25, 6),
     (N'pvp-champion',        N'PvP Champion',        N'Thắng 10 trận PvP liên tiếp', N'pvp_streak', N'{"winStreak":10}', 100, 80, 7),
     (N'daily-dedication',    N'Daily Dedication',    N'Hoàn thành daily challenge 30 ngày', N'daily_streak_days', N'{"distinctDays":30}', 120, 60, 8),
     (N'perfect-score-quiz',  N'Perfect Score',       N'Điểm tuyệt đối bài kiểm tra nhanh', N'assessment_perfect', N'{}', 100, 50, 9)
    ) AS s (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order)
    ON t.slug = s.slug
    WHEN MATCHED THEN UPDATE SET
        t.name = s.name,
        t.description = s.description,
        t.condition_type = s.criteria_type,
        t.criteria_type = s.criteria_type,
        t.criteria_json = s.criteria_json,
        t.reward_exp = s.reward_exp,
        t.reward_xu = s.reward_xu,
        t.sort_order = s.sort_order,
        t.is_active = 1
    WHEN NOT MATCHED THEN
      INSERT (slug, name, description, condition_type, criteria_type, criteria_json, reward_exp, reward_xu, sort_order, is_active)
      VALUES (s.slug, s.name, s.description, s.criteria_type, s.criteria_type, s.criteria_json, s.reward_exp, s.reward_xu, s.sort_order, 1);
END
ELSE
BEGIN
    MERGE dbo.achievements AS t
    USING (VALUES
     (N'hiragana-master',     N'Hiragana Master',     N'Hoàn thành Hiragana Match với 100% độ chính xác', N'game_accuracy', N'{"gameSlug":"hiragana-match","minAccuracy":100}', 50, 30, 1),
     (N'katakana-master',     N'Katakana Master',     N'Hoàn thành Katakana Match với 100% độ chính xác', N'game_accuracy', N'{"gameSlug":"katakana-match","minAccuracy":100}', 50, 30, 2),
     (N'kanji-novice',        N'Kanji Novice',        N'Học 50 Kanji đầu tiên', N'kanji_learned', N'{"minCount":50}', 40, 20, 3),
     (N'kanji-hunter',        N'Kanji Hunter',        N'Học 200 Kanji', N'kanji_learned', N'{"minCount":200}', 80, 50, 4),
     (N'speed-demon',         N'Speed Demon',         N'TB < 2 giây trong 10 câu (một phiên)', N'speed_session', N'{"maxAvgMs":2000,"minAnswers":10}', 60, 40, 5),
     (N'combo-king',          N'Combo King',          N'Combo x5 trong một phiên', N'combo_session', N'{"minCombo":5}', 40, 25, 6),
     (N'pvp-champion',        N'PvP Champion',        N'Thắng 10 trận PvP liên tiếp', N'pvp_streak', N'{"winStreak":10}', 100, 80, 7),
     (N'daily-dedication',    N'Daily Dedication',    N'Hoàn thành daily challenge 30 ngày', N'daily_streak_days', N'{"distinctDays":30}', 120, 60, 8),
     (N'perfect-score-quiz',  N'Perfect Score',       N'Điểm tuyệt đối bài kiểm tra nhanh', N'assessment_perfect', N'{}', 100, 50, 9)
    ) AS s (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order)
    ON t.slug = s.slug
    WHEN MATCHED THEN UPDATE SET
        t.name = s.name, t.description = s.description, t.criteria_type = s.criteria_type,
        t.criteria_json = s.criteria_json, t.reward_exp = s.reward_exp, t.reward_xu = s.reward_xu,
        t.sort_order = s.sort_order, t.is_active = 1
    WHEN NOT MATCHED THEN
      INSERT (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order, is_active)
      VALUES (s.slug, s.name, s.description, s.criteria_type, s.criteria_json, s.reward_exp, s.reward_xu, s.sort_order, 1);
END
GO

PRINT N'[patch_achievements_leaderboard_v1] Xong achievements (cột đã đồng bộ) + leaderboard_periods.level_id.';
GO


-- ============================================================================
-- FILE: patch_boss_battle_questions.sql
-- ============================================================================
/*
  Boss Battle: thêm câu hỏi (pool >1) khi không đủ từ bài học.
  Chạy trên SQL Server; cần sp_StartGameSession có @question_count.
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (SELECT id FROM dbo.games WHERE slug = N'boss-battle' AND ISNULL(is_active, 1) = 1);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 600 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 食べる', N'[{"text":"Ăn"},{"text":"Uống"},{"text":"Ngủ"},{"text":"Chạy"}]', 0, N'Taberu'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 飲む', N'[{"text":"Uống"},{"text":"Ăn"},{"text":"Đọc"},{"text":"Viết"}]', 0, N'Nomu'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 見る', N'[{"text":"Nhìn / xem"},{"text":"Nghe"},{"text":"Nói"},{"text":"Đi"}]', 0, N'Miru'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 行く', N'[{"text":"Đi"},{"text":"Đến"},{"text":"Ở lại"},{"text":"Dừng lại"}]', 0, N'Iku'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 来る', N'[{"text":"Đến"},{"text":"Đi"},{"text":"Về"},{"text":"Ở"}]', 0, N'Kuru'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 本', N'[{"text":"Sách / gốc"},{"text":"Nước"},{"text":"Lửa"},{"text":"Cây"}]', 0, N'Hon'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 水', N'[{"text":"Nước"},{"text":"Lửa"},{"text":"Gió"},{"text":"Đất"}]', 0, N'Mizu'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 火', N'[{"text":"Lửa"},{"text":"Nước"},{"text":"Cây"},{"text":"Núi"}]', 0, N'Hi'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 人', N'[{"text":"Người"},{"text":"Con vật"},{"text":"Cây"},{"text":"Nhà"}]', 0, N'Hito'),
    (N'boss_round', N'Boss: Chọn nghĩa đúng cho 大きい', N'[{"text":"To lớn"},{"text":"Nhỏ"},{"text":"Mới"},{"text":"Cũ"}]', 0, N'Ookii')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 10 THEN 12 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_boss_battle_questions: xong.';
GO


-- ============================================================================
-- FILE: patch_counter_quest_questions.sql
-- ============================================================================
/*
  Counter Quest: thêm câu hỏi trợ từ (pool >1) khi không đủ quiz bài học.
  Chạy trên SQL Server; cần sp_StartGameSession có @question_count (patch sentence/daily).
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (SELECT id FROM dbo.games WHERE slug = N'counter-quest' AND ISNULL(is_active, 1) = 1);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 400 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'counter', N'Chọn trợ từ đếm phù hợp: 2 con mèo', N'[{"text":"匹"},{"text":"台"},{"text":"枚"},{"text":"本"}]', 0, N'匹 — động vật nhỏ'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 5 quyển sách', N'[{"text":"冊"},{"text":"本"},{"text":"枚"},{"text":"台"}]', 0, N'冊 — sách, tạp chí'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 3 cái bút', N'[{"text":"本"},{"text":"枚"},{"text":"台"},{"text":"匹"}]', 0, N'本 — cây bút, đũa (vật dài)'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 4 cái áo', N'[{"text":"枚"},{"text":"着"},{"text":"台"},{"text":"匹"}]', 0, N'枚 — quần áo phẳng'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 1 chiếc xe hơi', N'[{"text":"台"},{"text":"匹"},{"text":"頭"},{"text":"羽"}]', 0, N'台 — máy móc, xe, bàn'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 6 người', N'[{"text":"人"},{"text":"匹"},{"text":"本"},{"text":"台"}]', 0, N'人 — người'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 2 cái cốc', N'[{"text":"個"},{"text":"台"},{"text":"匹"},{"text":"冊"}]', 0, N'個 — vật nhỏ, đồ vật chung'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 3 tờ giấy', N'[{"text":"枚"},{"text":"本"},{"text":"台"},{"text":"人"}]', 0, N'枚 — giấy, vé, CD phẳng'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 1 con gà', N'[{"text":"羽"},{"text":"匹"},{"text":"頭"},{"text":"台"}]', 0, N'羽 — chim, gà (con)'),
    (N'counter', N'Chọn trợ từ đếm phù hợp: 2 con bò', N'[{"text":"頭"},{"text":"匹"},{"text":"羽"},{"text":"人"}]', 0, N'頭 — gia súc lớn')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 10 THEN 10 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_counter_quest_questions: xong.';
GO


-- ============================================================================
-- FILE: patch_daily_challenge_questions.sql
-- ============================================================================
/*
  Daily Challenge: đủ pool câu hỏi (>=5) + questions_per_round mặc định hợp lý.
  Trước đó seed chỉ có 1–2 câu → phiên chỉ 2/2 dù questions_per_round = 15.

  Chạy sau seed_games_playable_fix_v1 / patch sp_StartGameSession (đã có @question_count).
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (SELECT id FROM dbo.games WHERE slug = N'daily-challenge' AND ISNULL(is_active, 1) = 1);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 300 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'daily', N'「火」đọc là gì?', N'[{"text":"hi"},{"text":"mizu"},{"text":"ki"},{"text":"tsuchi"}]', 0, N'Hi'),
    (N'daily', N'「土」đọc là gì?', N'[{"text":"tsuchi"},{"text":"hi"},{"text":"kaze"},{"text":"yuki"}]', 0, N'Tsuchi'),
    (N'daily', N'「日」đọc là gì?', N'[{"text":"hi"},{"text":"tsuki"},{"text":"toshi"},{"text":"asa"}]', 0, N'Hi / nichi'),
    (N'daily', N'「月」đọc là gì?', N'[{"text":"tsuki"},{"text":"hi"},{"text":"toshi"},{"text":"shuu"}]', 0, N'Tsuki'),
    (N'daily', N'「人」đọc là gì?', N'[{"text":"hito"},{"text":"inu"},{"text":"ki"},{"text":"ie"}]', 0, N'Hito'),
    (N'daily', N'「川」đọc là gì?', N'[{"text":"kawa"},{"text":"yama"},{"text":"umi"},{"text":"mizu"}]', 0, N'Kawa'),
    (N'daily', N'「山」đọc là gì?', N'[{"text":"yama"},{"text":"kawa"},{"text":"mori"},{"text":"sato"}]', 0, N'Yama'),
    (N'daily', N'「木」đọc là gì?', N'[{"text":"ki"},{"text":"mizu"},{"text":"hi"},{"text":"tsuchi"}]', 0, N'Ki'),
    (N'daily', N'「雨」đọc là gì?', N'[{"text":"ame"},{"text":"yuki"},{"text":"kaze"},{"text":"kumo"}]', 0, N'Ame'),
    (N'daily', N'「口」đọc là gì?', N'[{"text":"kuchi"},{"text":"te"},{"text":"ashi"},{"text":"me"}]', 0, N'Kuchi'),
    (N'daily', N'「手」đọc là gì?', N'[{"text":"te"},{"text":"ashi"},{"text":"kuchi"},{"text":"mimi"}]', 0, N'Te'),
    (N'daily', N'「目」đọc là gì?', N'[{"text":"me"},{"text":"mimi"},{"text":"hana"},{"text":"kuchi"}]', 0, N'Me'),
    (N'daily', N'「耳」đọc là gì?', N'[{"text":"mimi"},{"text":"me"},{"text":"te"},{"text":"ashi"}]', 0, N'Mimi')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 8 THEN 8 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_daily_challenge_questions: xong.';
GO


-- ============================================================================
-- FILE: patch_exp_achievements_v1.sql
-- ============================================================================
/*
  Thành tích mốc tổng EXP (criteria_type = total_exp, criteria_json: {"minExp":N}).
  Phần thưởng EXP = 0 để tránh nhảy mốc phức tạp; có thể chỉnh sau.

  Chạy trên SQL Server sau khi đã có dbo.achievements (xem patch_achievements_leaderboard_v1.sql).
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.achievements', N'U') IS NULL
BEGIN
    RAISERROR(N'Thieu bang dbo.achievements.', 16, 1);
    RETURN;
END
GO

IF COL_LENGTH(N'dbo.achievements', N'condition_type') IS NOT NULL
BEGIN
    MERGE dbo.achievements AS t
    USING (VALUES
     (N'exp-100',       N'EXP 100',       N'Đạt 100 EXP tích lũy',       N'total_exp', N'{"minExp":100}',   0, 10, 20),
     (N'exp-500',       N'EXP 500',       N'Đạt 500 EXP tích lũy',       N'total_exp', N'{"minExp":500}',   0, 15, 21),
     (N'exp-1000',      N'EXP 1.000',     N'Đạt 1.000 EXP tích lũy',     N'total_exp', N'{"minExp":1000}',  0, 20, 22),
     (N'exp-2500',      N'EXP 2.500',     N'Đạt 2.500 EXP tích lũy',     N'total_exp', N'{"minExp":2500}',  0, 25, 23),
     (N'exp-5000',      N'EXP 5.000',     N'Đạt 5.000 EXP tích lũy',     N'total_exp', N'{"minExp":5000}',  0, 30, 24)
    ) AS s (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order)
    ON t.slug = s.slug
    WHEN MATCHED THEN UPDATE SET
        t.name = s.name,
        t.description = s.description,
        t.condition_type = s.criteria_type,
        t.criteria_type = s.criteria_type,
        t.criteria_json = s.criteria_json,
        t.reward_exp = s.reward_exp,
        t.reward_xu = s.reward_xu,
        t.sort_order = s.sort_order,
        t.is_active = 1
    WHEN NOT MATCHED THEN
      INSERT (slug, name, description, condition_type, criteria_type, criteria_json, reward_exp, reward_xu, sort_order, is_active)
      VALUES (s.slug, s.name, s.description, s.criteria_type, s.criteria_type, s.criteria_json, s.reward_exp, s.reward_xu, s.sort_order, 1);
END
ELSE
BEGIN
    MERGE dbo.achievements AS t
    USING (VALUES
     (N'exp-100',       N'EXP 100',       N'Đạt 100 EXP tích lũy',       N'total_exp', N'{"minExp":100}',   0, 10, 20),
     (N'exp-500',       N'EXP 500',       N'Đạt 500 EXP tích lũy',       N'total_exp', N'{"minExp":500}',   0, 15, 21),
     (N'exp-1000',      N'EXP 1.000',     N'Đạt 1.000 EXP tích lũy',     N'total_exp', N'{"minExp":1000}',  0, 20, 22),
     (N'exp-2500',      N'EXP 2.500',     N'Đạt 2.500 EXP tích lũy',     N'total_exp', N'{"minExp":2500}',  0, 25, 23),
     (N'exp-5000',      N'EXP 5.000',     N'Đạt 5.000 EXP tích lũy',     N'total_exp', N'{"minExp":5000}',  0, 30, 24)
    ) AS s (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order)
    ON t.slug = s.slug
    WHEN MATCHED THEN UPDATE SET
        t.name = s.name, t.description = s.description, t.criteria_type = s.criteria_type,
        t.criteria_json = s.criteria_json, t.reward_exp = s.reward_exp, t.reward_xu = s.reward_xu,
        t.sort_order = s.sort_order, t.is_active = 1
    WHEN NOT MATCHED THEN
      INSERT (slug, name, description, criteria_type, criteria_json, reward_exp, reward_xu, sort_order, is_active)
      VALUES (s.slug, s.name, s.description, s.criteria_type, s.criteria_json, s.reward_exp, s.reward_xu, s.sort_order, 1);
END
GO

PRINT N'[patch_exp_achievements_v1] Xong seed thanh tich tong EXP.';
GO


-- ============================================================================
-- FILE: patch_flashcard_battle_questions.sql
-- ============================================================================
/*
  Flashcard Battle (slug seed: flashcard-vocabulary): thêm câu từ vựng để TOP N đủ bài khi không dùng bài học.
  Chạy trên SQL Server; cần sp_StartGameSession có @question_count.
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (
  SELECT TOP 1 id FROM dbo.games
  WHERE slug IN (N'flashcard-vocabulary', N'flashcard-battle') AND ISNULL(is_active, 1) = 1
  ORDER BY CASE WHEN slug = N'flashcard-vocabulary' THEN 0 ELSE 1 END);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 500 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'vocab_meaning', N'こんにちは', N'[{"text":"Xin chao (ban ngay)"},{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Cam on"}]', 0, N'Konnichiwa'),
    (N'vocab_meaning', N'こんばんは', N'[{"text":"Chao buoi toi"},{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Xin chao (ban ngay)"}]', 0, N'Konbanwa'),
    (N'vocab_meaning', N'さようなら', N'[{"text":"Tam biet"},{"text":"Chao buoi sang"},{"text":"Cam on"},{"text":"Xin loi"}]', 0, N'Sayounara'),
    (N'vocab_meaning', N'はい', N'[{"text":"Vang / dung"},{"text":"Khong"},{"text":"Co le"},{"text":"Xin loi"}]', 0, N'Hai'),
    (N'vocab_meaning', N'いいえ', N'[{"text":"Khong"},{"text":"Vang / dung"},{"text":"Cam on"},{"text":"Tam biet"}]', 0, N'Iie'),
    (N'vocab_meaning', N'水', N'[{"text":"Nuoc"},{"text":"Lua"},{"text":"Gio"},{"text":"Dat"}]', 0, N'Mizu'),
    (N'vocab_meaning', N'火', N'[{"text":"Lua"},{"text":"Nuoc"},{"text":"Cay"},{"text":"Nui"}]', 0, N'Hi'),
    (N'vocab_meaning', N'木', N'[{"text":"Cay"},{"text":"Nuoc"},{"text":"Nui"},{"text":"Song"}]', 0, N'Ki'),
    (N'vocab_meaning', N'山', N'[{"text":"Nui"},{"text":"Song"},{"text":"Bien"},{"text":"Cay"}]', 0, N'Yama'),
    (N'vocab_meaning', N'川', N'[{"text":"Song"},{"text":"Nui"},{"text":"Bien"},{"text":"Mua"}]', 0, N'Kawa'),
    (N'vocab_meaning', N'食べる', N'[{"text":"An"},{"text":"Uong"},{"text":"Ngu"},{"text":"Chay"}]', 0, N'Taberu'),
    (N'vocab_meaning', N'飲む', N'[{"text":"Uong"},{"text":"An"},{"text":"Doc"},{"text":"Viet"}]', 0, N'Nomu'),
    (N'vocab_meaning', N'見る', N'[{"text":"Nhin / xem"},{"text":"Nghe"},{"text":"Noi"},{"text":"Di"}]', 0, N'Miru'),
    (N'vocab_meaning', N'行く', N'[{"text":"Di"},{"text":"Den"},{"text":"O lai"},{"text":"Dung lai"}]', 0, N'Iku'),
    (N'vocab_meaning', N'来る', N'[{"text":"Den"},{"text":"Di"},{"text":"Ve"},{"text":"O"}]', 0, N'Kuru')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 10 THEN 10 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_flashcard_battle_questions: xong.';
GO


-- ============================================================================
-- FILE: patch_game_add_missing_columns.sql
-- ============================================================================
/*
  Chạy file này MỘT LẦN nếu bảng games / power_ups đã tồn tại nhưng thiếu cột
  (lỗi Msg 207: sort_order, stackable, max_per_session...).

  Sau đó chạy lại phần INSERT seed trong create_game_module_tables.sql (hoặc chạy nguyên file đã cập nhật).
*/
USE YumegojiDB; /* đổi tên DB nếu cần */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.games', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.games', N'sort_order') IS NULL
        ALTER TABLE dbo.games ADD sort_order INT NOT NULL CONSTRAINT DF_games_sort_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_boss_mode') IS NULL
        ALTER TABLE dbo.games ADD is_boss_mode BIT NOT NULL CONSTRAINT DF_games_boss_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_active') IS NULL
        ALTER TABLE dbo.games ADD is_active BIT NOT NULL CONSTRAINT DF_games_active_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.games', N'config_json') IS NULL
        ALTER TABLE dbo.games ADD config_json NVARCHAR(MAX) NULL;
    IF COL_LENGTH(N'dbo.games', N'is_pvp') IS NULL
        ALTER TABLE dbo.games ADD is_pvp BIT NOT NULL CONSTRAINT DF_games_pvp_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'max_hearts') IS NULL
        ALTER TABLE dbo.games ADD max_hearts INT NOT NULL CONSTRAINT DF_games_hearts_patch DEFAULT (3);
END

IF OBJECT_ID(N'dbo.power_ups', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.power_ups', N'stackable') IS NULL
        ALTER TABLE dbo.power_ups ADD stackable BIT NOT NULL CONSTRAINT DF_pu_stack_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'max_per_session') IS NULL
        ALTER TABLE dbo.power_ups ADD max_per_session INT NULL;
    IF COL_LENGTH(N'dbo.power_ups', N'sort_order') IS NULL
        ALTER TABLE dbo.power_ups ADD sort_order INT NOT NULL CONSTRAINT DF_pu_sort_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.power_ups', N'is_active') IS NULL
        ALTER TABLE dbo.power_ups ADD is_active BIT NOT NULL CONSTRAINT DF_pu_active_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'is_premium') IS NULL
        ALTER TABLE dbo.power_ups ADD is_premium BIT NOT NULL CONSTRAINT DF_pu_prem_patch DEFAULT (0);
END

PRINT N'patch_game_add_missing_columns: xong.';
GO


-- ============================================================================
-- FILE: patch_games_level_range_columns.sql
-- ============================================================================
/*
  Bổ sung level_min / level_max cho dbo.games (đặc tả STT game N5–N3…).
  Backend GET /api/game SELECT các cột này — chạy nếu bảng games chưa có cột.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.games', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.games', N'level_min') IS NULL
        ALTER TABLE dbo.games ADD level_min NVARCHAR(10) NULL;
    IF COL_LENGTH(N'dbo.games', N'level_max') IS NULL
        ALTER TABLE dbo.games ADD level_max NVARCHAR(10) NULL;
END
GO

PRINT N'patch_games_level_range_columns: xong.';
GO


-- ============================================================================
-- FILE: patch_premium_upgrade_qr_v1.sql
-- ============================================================================
/*
  Premium QR payment MVP
  - Cấu hình gói Premium (admin đổi giá)
  - Yêu cầu thanh toán (token ngắn)
  - Subscription 30 ngày (hoặc theo config)
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.premium_payment_config', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_payment_config (
        id                   INT NOT NULL CONSTRAINT PK_premium_payment_config PRIMARY KEY,
        bank_code            NVARCHAR(16) NOT NULL,
        account_no           NVARCHAR(64) NOT NULL,
        account_name         NVARCHAR(200) NOT NULL,
        premium_price_vnd    INT NOT NULL,
        premium_duration_days INT NOT NULL,
        is_active            BIT NOT NULL CONSTRAINT DF_premium_cfg_active DEFAULT (1),
        updated_at           DATETIME2 NOT NULL CONSTRAINT DF_premium_cfg_updated DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.premium_payment_config WHERE id = 1)
BEGIN
    INSERT INTO dbo.premium_payment_config
        (id, bank_code, account_no, account_name, premium_price_vnd, premium_duration_days, is_active, updated_at)
    VALUES
        (1, N'ICB', N'105877558159', N'HOANG NGUYEN THE VINH', 10000, 30, 1, SYSUTCDATETIME());
END
GO

IF OBJECT_ID(N'dbo.premium_payment_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_payment_requests (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_premium_payment_requests PRIMARY KEY,
        user_id         INT NOT NULL,
        token           NVARCHAR(32) NOT NULL,
        amount_vnd      INT NOT NULL,
        duration_days   INT NOT NULL,
        status          NVARCHAR(32) NOT NULL, /* created, pending_review, approved, rejected */
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_premium_req_created DEFAULT SYSUTCDATETIME(),
        confirmed_at    DATETIME2 NULL,
        approved_at     DATETIME2 NULL,
        approved_by     INT NULL,
        note            NVARCHAR(500) NULL,
        bank_code       NVARCHAR(16) NOT NULL,
        account_no      NVARCHAR(64) NOT NULL,
        account_name    NVARCHAR(200) NOT NULL,
        CONSTRAINT FK_premium_req_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_premium_req_admin FOREIGN KEY (approved_by) REFERENCES dbo.users (id)
    );
    CREATE UNIQUE INDEX UX_premium_req_token ON dbo.premium_payment_requests(token);
    CREATE INDEX IX_premium_req_user ON dbo.premium_payment_requests(user_id, id DESC);
    CREATE INDEX IX_premium_req_status ON dbo.premium_payment_requests(status, id DESC);
END
GO

IF OBJECT_ID(N'dbo.premium_subscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_subscriptions (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_premium_subscriptions PRIMARY KEY,
        user_id             INT NOT NULL,
        payment_request_id  INT NULL,
        started_at          DATETIME2 NOT NULL,
        expires_at          DATETIME2 NOT NULL,
        is_active           BIT NOT NULL CONSTRAINT DF_premium_sub_active DEFAULT (1),
        CONSTRAINT FK_premium_sub_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_premium_sub_request FOREIGN KEY (payment_request_id) REFERENCES dbo.premium_payment_requests (id)
    );
    CREATE INDEX IX_premium_sub_user ON dbo.premium_subscriptions(user_id, expires_at DESC);
END
GO

PRINT N'[patch_premium_upgrade_qr_v1] Done.';
GO


-- ============================================================================
-- FILE: patch_sentence_builder_rounds.sql
-- ============================================================================
/*
  Sentence Builder: thêm câu hỏi (pool >1) + sp_StartGameSession nhận @question_count (tuỳ chọn).
  Chạy trên SQL Server sau các patch sp_StartGameSession hiện có.

  - Frontend gửi questionCount (5–15) khi slug = sentence-builder.
  - @question_count NULL → giữ hành vi cũ (theo questions_per_round của set).
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (SELECT id FROM dbo.games WHERE slug = N'sentence-builder' AND ISNULL(is_active, 1) = 1);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  /* Câu mẫu đã seed — bổ sung thêm câu (question_text khác nhau) để TOP N có đủ bài */
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 200 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'sentence_order', N'並べて: これは本です', N'[{"text":"これ / は / 本 / です / 。"},{"text":"は / これ / 本 / です / 。"},{"text":"本 / これ / は / です / 。"},{"text":"です / これ / は / 本 / 。"}]', 0, N'Kore wa hon desu'),
    (N'sentence_order', N'並べて: あれは車です', N'[{"text":"あれ / は / 車 / です / 。"},{"text":"は / あれ / です / 車 / 。"},{"text":"車 / あれ / は / です / 。"},{"text":"です / は / あれ / 車 / 。"}]', 0, N'Are wa kuruma desu'),
    (N'sentence_order', N'並べて: 彼は先生です', N'[{"text":"彼 / は / 先生 / です / 。"},{"text":"は / 彼 / 先生 / です / 。"},{"text":"先生 / 彼 / は / です / 。"},{"text":"です / 彼 / は / 先生 / 。"}]', 0, N'Kare wa sensei desu'),
    (N'sentence_order', N'並べて: 私の名前はアンです', N'[{"text":"私 / の / 名前 / は / アン / です / 。"},{"text":"の / 私 / 名前 / は / アン / です / 。"},{"text":"名前 / 私 / の / は / アン / です / 。"},{"text":"です / 私 / の / 名前 / は / アン / 。"}]', 0, N'Watashi no namae wa An desu'),
    (N'sentence_order', N'並べて: 今日は月曜日です', N'[{"text":"今日 / は / 月曜日 / です / 。"},{"text":"は / 今日 / です / 月曜日 / 。"},{"text":"月曜日 / 今日 / は / です / 。"},{"text":"です / は / 今日 / 月曜日 / 。"}]', 0, N'Kyou wa getsuyoubi desu'),
    (N'sentence_order', N'並べて: ここは学校です', N'[{"text":"ここ / は / 学校 / です / 。"},{"text":"は / ここ / 学校 / です / 。"},{"text":"学校 / ここ / は / です / 。"},{"text":"です / は / ここ / 学校 / 。"}]', 0, N'Koko wa gakkou desu'),
    (N'sentence_order', N'並べて: それは私のかばんです', N'[{"text":"それ / は / 私 / の / かばん / です / 。"},{"text":"は / それ / 私 / の / かばん / です / 。"},{"text":"かばん / それ / は / 私 / の / です / 。"},{"text":"です / それ / は / 私 / の / かばん / 。"}]', 0, N'Sore wa watashi no kaban desu'),
    (N'sentence_order', N'並べて: 妹は高校生です', N'[{"text":"妹 / は / 高校生 / です / 。"},{"text":"は / 妹 / 高校生 / です / 。"},{"text":"高校生 / 妹 / は / です / 。"},{"text":"です / は / 妹 / 高校生 / 。"}]', 0, N'Imouto wa koukousei desu'),
    (N'sentence_order', N'並べて: これは日本語の本です', N'[{"text":"これ / は / 日本語 / の / 本 / です / 。"},{"text":"は / これ / 日本語 / の / 本 / です / 。"},{"text":"本 / これ / は / 日本語 / の / です / 。"},{"text":"です / は / これ / 日本語 / の / 本 / 。"}]', 0, N'Kore wa nihongo no hon desu'),
    (N'sentence_order', N'並べて: 彼女は医者です', N'[{"text":"彼女 / は / 医者 / です / 。"},{"text":"は / 彼女 / 医者 / です / 。"},{"text":"医者 / 彼女 / は / です / 。"},{"text":"です / は / 彼女 / 医者 / 。"}]', 0, N'Kanojo wa isha desu'),
    (N'sentence_order', N'並べて: あそこは駅です', N'[{"text":"あそこ / は / 駅 / です / 。"},{"text":"は / あそこ / 駅 / です / 。"},{"text":"駅 / あそこ / は / です / 。"},{"text":"です / は / あそこ / 駅 / 。"}]', 0, N'Asoko wa eki desu'),
    (N'sentence_order', N'並べて: 私は毎日勉強します', N'[{"text":"私 / は / 毎日 / 勉強 / します / 。"},{"text":"は / 私 / 毎日 / 勉強 / します / 。"},{"text":"勉強 / 私 / は / 毎日 / します / 。"},{"text":"します / は / 私 / 毎日 / 勉強 / 。"}]', 0, N'Watashi wa mainichi benkyou shimasu')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_StartGameSession
  @user_id         INT,
  @game_slug       NVARCHAR(100),
  @set_id          INT = NULL,
  @question_count  INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @game_id INT, @max_hearts INT, @session_id INT, @actual_set_id INT = @set_id, @questions_per_round INT;
  DECLARE @n INT, @avail INT;

  SELECT @game_id = id, @max_hearts = max_hearts FROM dbo.games WHERE slug = @game_slug AND ISNULL(is_active, 1) = 1;
  IF @game_id IS NULL
  BEGIN RAISERROR(N'Game không tồn tại hoặc chưa active', 16, 1); RETURN; END

  IF @actual_set_id IS NULL
  BEGIN
    SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
    FROM dbo.game_question_sets gqs
    LEFT JOIN dbo.users u ON u.id = @user_id
    WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      AND (
        u.level_id IS NULL
        OR gqs.level_id IS NULL
        OR gqs.level_id = u.level_id
      )
    ORDER BY
      CASE WHEN u.level_id IS NOT NULL AND gqs.level_id = u.level_id THEN 0
           WHEN gqs.level_id IS NULL THEN 1
           ELSE 2 END,
      gqs.sort_order, gqs.id;

    IF @actual_set_id IS NULL
      SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
      FROM dbo.game_question_sets gqs
      WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      ORDER BY gqs.sort_order, gqs.id;
  END
  ELSE
    SELECT @questions_per_round = questions_per_round FROM dbo.game_question_sets WHERE id = @actual_set_id;

  IF @actual_set_id IS NULL
  BEGIN RAISERROR(N'Không tìm được question set', 16, 1); RETURN; END

  SET @avail = (
    SELECT COUNT_BIG(*)
    FROM dbo.game_questions q
    WHERE q.set_id = @actual_set_id AND ISNULL(q.is_active, 1) = 1);

  IF @avail < 1
  BEGIN RAISERROR(N'Bộ câu hỏi trống cho set này', 16, 1); RETURN; END

  SET @n = ISNULL(@questions_per_round, 10);
  IF @question_count IS NOT NULL AND @question_count > 0
    SET @n = @question_count;

  IF @n > @avail SET @n = CAST(@avail AS INT);
  IF @n < 1 SET @n = 1;

  INSERT INTO dbo.game_sessions (user_id, game_id, score, correct_count, total_questions, hearts_remaining, set_id, started_at)
  VALUES (@user_id, @game_id, 0, 0, @n, @max_hearts, @actual_set_id, SYSUTCDATETIME());

  SET @session_id = SCOPE_IDENTITY();
  SELECT @session_id AS session_id, @max_hearts AS max_hearts, @actual_set_id AS set_id;

  SELECT TOP (@n)
    q.id, q.question_type, q.question_text, q.hint_text, q.audio_url, q.image_url, q.options_json, q.base_score, q.difficulty
  FROM dbo.game_questions q
  WHERE q.set_id = @actual_set_id AND ISNULL(q.is_active, 1) = 1
  ORDER BY NEWID();
END
GO

PRINT N'patch_sentence_builder_rounds: xong.';
GO


-- ============================================================================
-- FILE: patch_sp_scoring_cap100_end_safe.sql
-- ============================================================================
/*
  Áp dụng trên SQL Server khi đã có sp_SubmitAnswer / sp_EndGameSession (yumegoji_game_system_spec).

  - Điểm mỗi câu ≈ ROUND(100 / total_questions); double-points ×2 câu đó; không combo/speed vào điểm.
  - Tổng điểm phiên chặn trần 100 ở sp_EndGameSession.
  - user_statistics / user_activities_log: lỗi không làm hỏng kết thúc phiên.
*/
SET NOCOUNT ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SubmitAnswer
  @session_id      INT,
  @question_id     INT,
  @question_order  INT,
  @chosen_index    INT,
  @response_ms     INT,
  @power_up_used   NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @is_correct BIT = 0, @correct_index INT;
  DECLARE @score_earned INT = 0, @speed_bonus INT = 0, @combo_now INT = 0;
  DECLARE @double_active BIT = 0;
  DECLARE @game_id INT;
  DECLARE @session_total_q INT, @ppt INT;

  SELECT @game_id = gs.game_id, @session_total_q = NULLIF(gs.total_questions, 0)
  FROM dbo.game_sessions gs WHERE gs.id = @session_id;

  SET @ppt = CASE
    WHEN @session_total_q IS NULL OR @session_total_q < 1 THEN 10
    ELSE CAST(ROUND(100.0 / @session_total_q, 0) AS INT) END;
  IF @ppt < 1 SET @ppt = 1;

  SELECT @correct_index = q.correct_index
  FROM dbo.game_questions q WHERE q.id = @question_id;

  IF @chosen_index IS NOT NULL AND @correct_index IS NOT NULL AND @chosen_index = @correct_index
    SET @is_correct = 1;

  SET @speed_bonus = 0;

  DECLARE @ord INT = (SELECT ISNULL(MAX(question_order), 0) FROM dbo.game_session_answers WHERE session_id = @session_id);
  SET @combo_now = 0;
  WHILE @ord >= 1
  BEGIN
    IF EXISTS (SELECT 1 FROM dbo.game_session_answers WHERE session_id = @session_id AND question_order = @ord AND is_correct = 1)
      SET @combo_now = @combo_now + 1;
    ELSE BREAK;
    SET @ord = @ord - 1;
  END

  IF @is_correct = 1
  BEGIN
    SET @combo_now = @combo_now + 1;
    IF @power_up_used = N'double-points' SET @double_active = 1;
    SET @score_earned = @ppt * CASE WHEN @double_active = 1 THEN 2 ELSE 1 END;
  END
  ELSE
    SET @combo_now = 0;

  INSERT INTO dbo.game_session_answers
    (session_id, question_id, question_order, chosen_index, is_correct, response_ms, score_earned, combo_at_answer, power_up_used)
  VALUES
    (@session_id, @question_id, @question_order, @chosen_index, @is_correct, @response_ms, @score_earned, @combo_now, @power_up_used);

  SELECT @is_correct AS is_correct, @correct_index AS correct_index, @score_earned AS score_earned,
         @combo_now AS combo, @speed_bonus AS speed_bonus;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_EndGameSession
  @session_id INT
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @user_id INT, @game_id INT, @total_q INT, @total_score INT, @correct INT, @max_combo INT,
          @time_spent INT, @xu_reward INT, @exp_reward INT;
  DECLARE @accuracy DECIMAL(5,2);

  SELECT @user_id = user_id, @game_id = game_id, @total_q = total_questions
  FROM dbo.game_sessions WHERE id = @session_id;

  SELECT
    @total_score = SUM(score_earned),
    @correct = SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END),
    @max_combo = MAX(combo_at_answer),
    @time_spent = CASE WHEN COUNT(*) > 1
      THEN DATEDIFF(SECOND, MIN(answered_at), MAX(answered_at)) ELSE 0 END
  FROM dbo.game_session_answers WHERE session_id = @session_id;

  SET @total_score = ISNULL(@total_score, 0);
  SET @correct = ISNULL(@correct, 0);
  SET @max_combo = ISNULL(@max_combo, 0);
  IF @total_score > 100 SET @total_score = 100;
  SET @accuracy = CASE WHEN @total_q > 0 THEN CAST(@correct AS DECIMAL(5,2)) / @total_q * 100 ELSE 0 END;

  /* EXP: 10 mỗi câu đúng (tối đa 100/phiên); Xu: 1 mỗi câu đúng — không chặn theo exp_base_reward (tránh 10/10 chỉ +20 EXP). */
  SET @exp_reward = @correct * 10;
  IF @exp_reward > 100 SET @exp_reward = 100;
  SET @xu_reward = @correct;
  IF @xu_reward < 0 SET @xu_reward = 0;

  UPDATE dbo.game_sessions SET
    score = @total_score,
    correct_count = @correct,
    max_combo = @max_combo,
    time_spent_seconds = @time_spent,
    exp_earned = @exp_reward,
    xu_earned = @xu_reward,
    ended_at = SYSUTCDATETIME()
  WHERE id = @session_id;

  UPDATE dbo.users SET
    exp = exp + @exp_reward,
    xu = xu + @xu_reward
  WHERE id = @user_id;

  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_statistics' AND schema_id = SCHEMA_ID(N'dbo'))
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM dbo.user_statistics WHERE user_id = @user_id)
        INSERT INTO dbo.user_statistics (user_id, games_played, total_exp) VALUES (@user_id, 1, @exp_reward);
      ELSE
        UPDATE dbo.user_statistics SET
          games_played = games_played + 1,
          total_exp = total_exp + @exp_reward,
          updated_at = SYSUTCDATETIME()
        WHERE user_id = @user_id;
    END
  END TRY BEGIN CATCH END CATCH

  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_activities_log' AND schema_id = SCHEMA_ID(N'dbo'))
      INSERT INTO dbo.user_activities_log (user_id, activity_type, entity_type, entity_id, score)
      VALUES (@user_id, N'game_completed', N'game', @game_id, @total_score);
  END TRY BEGIN CATCH END CATCH

  SELECT @total_score AS final_score, @correct AS correct_count, @total_q AS total_questions,
         @accuracy AS accuracy_percent, @max_combo AS max_combo, @time_spent AS time_spent_seconds,
         @exp_reward AS exp_earned, @xu_reward AS xu_earned;
END
GO

PRINT N'patch_sp_scoring_cap100_end_safe: xong.';
GO


-- ============================================================================
-- FILE: patch_sp_start_game_session_level_fallback.sql
-- ============================================================================
/*
  Chạy trên SQL Server khi POST /api/game/session/start trả 400
  "Không tìm được question set" — thường do user.level_id không khớp game_question_sets.level_id.

  Cập nhật sp_StartGameSession: ưu tiên set đúng level, fallback mọi set active của game,
  và coi is_active NULL như bật.
*/
CREATE OR ALTER PROCEDURE dbo.sp_StartGameSession
  @user_id    INT,
  @game_slug  NVARCHAR(100),
  @set_id     INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @game_id INT, @max_hearts INT, @session_id INT, @actual_set_id INT = @set_id, @questions_per_round INT;

  SELECT @game_id = id, @max_hearts = max_hearts FROM dbo.games WHERE slug = @game_slug AND ISNULL(is_active, 1) = 1;
  IF @game_id IS NULL
  BEGIN RAISERROR(N'Game không tồn tại hoặc chưa active', 16, 1); RETURN; END

  IF @actual_set_id IS NULL
  BEGIN
    SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
    FROM dbo.game_question_sets gqs
    LEFT JOIN dbo.users u ON u.id = @user_id
    WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      AND (
        u.level_id IS NULL
        OR gqs.level_id IS NULL
        OR gqs.level_id = u.level_id
      )
    ORDER BY
      CASE WHEN u.level_id IS NOT NULL AND gqs.level_id = u.level_id THEN 0
           WHEN gqs.level_id IS NULL THEN 1
           ELSE 2 END,
      gqs.sort_order, gqs.id;

    IF @actual_set_id IS NULL
      SELECT TOP 1 @actual_set_id = gqs.id, @questions_per_round = gqs.questions_per_round
      FROM dbo.game_question_sets gqs
      WHERE gqs.game_id = @game_id AND ISNULL(gqs.is_active, 1) = 1
      ORDER BY gqs.sort_order, gqs.id;
  END
  ELSE
    SELECT @questions_per_round = questions_per_round FROM dbo.game_question_sets WHERE id = @actual_set_id;

  IF @actual_set_id IS NULL
  BEGIN RAISERROR(N'Không tìm được question set', 16, 1); RETURN; END

  INSERT INTO dbo.game_sessions (user_id, game_id, score, correct_count, total_questions, hearts_remaining, set_id, started_at)
  VALUES (@user_id, @game_id, 0, 0, ISNULL(@questions_per_round, 10), @max_hearts, @actual_set_id, SYSUTCDATETIME());

  SET @session_id = SCOPE_IDENTITY();
  SELECT @session_id AS session_id, @max_hearts AS max_hearts, @actual_set_id AS set_id;

  SELECT TOP (ISNULL(@questions_per_round, 10))
    q.id, q.question_type, q.question_text, q.hint_text, q.audio_url, q.image_url, q.options_json, q.base_score, q.difficulty
  FROM dbo.game_questions q
  WHERE q.set_id = @actual_set_id AND ISNULL(q.is_active, 1) = 1
  ORDER BY NEWID();
END
GO


-- ============================================================================
-- FILE: patch_vocab_numbers_1_10.sql
-- ============================================================================
-- Bổ sung từ vựng số 1–10 cho bài có tiêu đề chứa "Số đếm 1-10" (khi DB thiếu sau import).
-- Chạy trên SQL Server. Kiểm tra @lesson_id trước khi chạy.

DECLARE @lesson_id INT = (
  SELECT TOP 1 id FROM lessons
  WHERE title LIKE N'%Số đếm%1%10%' OR title LIKE N'%đếm%1%10%'
  ORDER BY id
);

IF @lesson_id IS NULL
BEGIN
  RAISERROR(N'Không tìm thấy bài khớp tiêu đề. Gán thủ công: DECLARE @lesson_id INT = ...', 16, 1);
  RETURN;
END

DECLARE @base INT = ISNULL(
  (SELECT MAX(sort_order) FROM vocabulary_items WHERE lesson_id = @lesson_id),
  0
);

;WITH need(word_jp, reading, meaning_vi, sort_order) AS (
  SELECT * FROM (VALUES
    (N'いち', N'ichi', N'Một (1)', 1),
    (N'に', N'ni', N'Hai (2)', 2),
    (N'さん', N'san', N'Ba (3)', 3),
    (N'し／よん', N'shi / yon', N'Bốn (4)', 4),
    (N'ご', N'go', N'Năm (5)', 5),
    (N'ろく', N'roku', N'Sáu (6)', 6),
    (N'なな／しち', N'nana / shichi', N'Bảy (7)', 7),
    (N'はち', N'hachi', N'Tám (8)', 8),
    (N'きゅう', N'kyū', N'Chín (9)', 9),
    (N'じゅう', N'jū', N'Mười (10)', 10)
  ) AS t(word_jp, reading, meaning_vi, sort_order)
)
INSERT INTO vocabulary_items (lesson_id, word_jp, reading, meaning_vi, meaning_en, example_sentence, audio_url, sort_order, created_at, updated_at)
SELECT @lesson_id, n.word_jp, n.reading, n.meaning_vi, NULL, NULL, NULL, @base + n.sort_order, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM need n
WHERE NOT EXISTS (
  SELECT 1 FROM vocabulary_items v
  WHERE v.lesson_id = @lesson_id AND v.word_jp = n.word_jp
);


-- ============================================================================
-- FILE: fix_messages_conversation_fk_to_chat_rooms.sql
-- ============================================================================
-- ============================================================
-- Sửa FK messages.conversation_id → khớp API Chat (chat_rooms)
-- Lỗi: FK trỏ dbo.conversations trong khi backend dùng dbo.chat_rooms.
-- Chạy trên đúng database (vd: YumegojiDB). Nên backup trước.
-- ============================================================
USE YumegojiDB;
GO

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Messages_conversations_conversation_id'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages DROP CONSTRAINT FK_Messages_conversations_conversation_id;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_messages_conversation_id_chat_rooms'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages
    ADD CONSTRAINT FK_messages_conversation_id_chat_rooms
    FOREIGN KEY (conversation_id) REFERENCES dbo.chat_rooms (id);
END
GO

-- ========== Kiểm tra sau khi chạy (chạy từng khối SELECT) ==========
-- 1) Mọi FK từ bảng messages (mong đợi có FK_messages_conversation_id_chat_rooms -> chat_rooms):
SELECT name, OBJECT_NAME(referenced_object_id) AS bang_tham_chieu
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID(N'dbo.messages');

-- 2) Tin “mồ côi”: conversation_id không có trong chat_rooms — phải 0 dòng trước khi ADD FK thành công:
SELECT m.id, m.conversation_id
FROM dbo.messages AS m
LEFT JOIN dbo.chat_rooms AS r ON r.id = m.conversation_id
WHERE r.id IS NULL;

-- 3) Phòng id=4 (test Swagger /api/Chat/rooms/4/...):
SELECT id, name, type FROM dbo.chat_rooms WHERE id = 4;
GO


-- ============================================================================
-- FILE: fix_admin_password_bcrypt.sql
-- ============================================================================
-- Backend dùng BCrypt.Verify: cột password_hash PHẢI là chuỗi bcrypt (bắt đầu $2a$ hoặc $2b$).
-- KHÔNG được để plain text như '123456'.

-- Mật khẩu plain text tương ứng: 123456
-- (hash được tạo bằng BCrypt.Net-Next; mỗi lần HashPassword ra chuỗi khác nhưng đều hợp lệ)
UPDATE users
SET password_hash = N'$2a$11$v2rvjStCE8B3KNwXWSu4pevowO5Qngobu.PeyK0PQuYnm6AG5Wyzq',
    updated_at = SYSUTCDATETIME()
WHERE email = N'admin@yumegoji.vn';

-- Gán đúng vai moderator (nếu cần)
-- UPDATE users SET role = N'moderator', updated_at = SYSUTCDATETIME()
-- WHERE email = N'moderator@yumegoji.vn';


-- ============================================================================
-- FILE: seed_games_playable_fix_v1.sql
-- ============================================================================
/*
  Bổ sung game + bộ câu hỏi tối thiểu để /api/game/session/start không 400,
  và đủ ~46 câu Hiragana/Katakana (questions_per_round = 10).

  Chạy trên SQL Server (đổi USE). Cần đã có: dbo.games, dbo.game_question_sets,
  dbo.game_questions, dbo.game_score_configs, dbo.power_ups, dbo.levels (tuỳ chọn).

  Sau khi chạy: áp dụng patch_sp_start_game_session_level_fallback.sql nếu chưa có.
*/
SET NOCOUNT ON;
-- USE YumegojiDB;
GO

/* ---------- MERGE thêm game (slug chuẩn gạch ngang) ---------- */
MERGE dbo.games AS t
USING (VALUES
 (N'flashcard-vocabulary', N'Flashcard Battle', N'Đấu với Bot AI (~70% đúng mỗi vòng). Chọn nghĩa đúng cho từ.', N'vocabulary', N'N5', N'N3', 3, 0, 0, 20),
 (N'multiple-choice',       N'Chọn đáp án đúng', N'Trắc nghiệm nhiều lựa chọn.', N'mixed', N'N5', N'N3', 3, 0, 0, 21),
 (N'fill-in-blank',         N'Điền vào chỗ trống', N'Chọn từ điền đúng vào câu.', N'grammar', N'N5', N'N3', 3, 0, 0, 22),
 (N'listen-choose',         N'Nghe và chọn', N'(Mẫu) Nghe audio — chọn đáp án; mở rộng URL audio sau.', N'listening', N'N5', N'N3', 3, 0, 0, 23)
) AS s (slug, name, description, skill_type, level_min, level_max, max_hearts, is_pvp, is_boss_mode, sort_order)
ON t.slug = s.slug
WHEN MATCHED THEN UPDATE SET
    t.name = s.name, t.description = s.description, t.skill_type = s.skill_type,
    t.level_min = s.level_min, t.level_max = s.level_max, t.max_hearts = s.max_hearts,
    t.is_pvp = s.is_pvp, t.is_boss_mode = s.is_boss_mode, t.sort_order = s.sort_order,
    t.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (slug, name, description, skill_type, level_min, level_max, max_hearts, is_pvp, is_boss_mode, sort_order)
VALUES (s.slug, s.name, s.description, s.skill_type, s.level_min, s.level_max, s.max_hearts, s.is_pvp, s.is_boss_mode, s.sort_order);
GO

/* ---------- Helper: đảm bảo 1 set + score config ---------- */
DECLARE @n5 INT = (SELECT TOP 1 id FROM dbo.levels WHERE code = N'N5');

DECLARE @slug NVARCHAR(100);
DECLARE @gid INT;
DECLARE @setId INT;

DECLARE gcur CURSOR LOCAL FAST_FORWARD FOR
SELECT slug FROM (VALUES
 (N'flashcard-vocabulary'),
 (N'multiple-choice'),
 (N'fill-in-blank'),
 (N'listen-choose'),
 (N'kanji-memory'),
 (N'vocabulary-speed-quiz'),
 (N'sentence-builder'),
 (N'counter-quest'),
 (N'boss-battle'),
 (N'daily-challenge')
) x(slug);

OPEN gcur;
FETCH NEXT FROM gcur INTO @slug;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @gid = (SELECT id FROM dbo.games WHERE slug = @slug AND ISNULL(is_active, 1) = 1);
    IF @gid IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.game_question_sets WHERE game_id = @gid AND name = N'Bo mac dinh N5')
        BEGIN
            INSERT INTO dbo.game_question_sets (game_id, level_id, name, description, questions_per_round, time_per_question_s, is_active, sort_order)
            VALUES (@gid, @n5, N'Bo mac dinh N5', N'Seed tu dong — thay bang noi dung that', 10, 12, 1, 0);
        END
        ELSE
            UPDATE dbo.game_question_sets
            SET questions_per_round = 10, time_per_question_s = 12, is_active = 1
            WHERE game_id = @gid AND name = N'Bo mac dinh N5';

        IF NOT EXISTS (SELECT 1 FROM dbo.game_score_configs WHERE game_id = @gid)
            INSERT INTO dbo.game_score_configs (game_id, base_score, max_speed_bonus, speed_bonus_threshold_ms, xu_base_reward, exp_base_reward)
            VALUES (@gid, 100, 50, 3000, 10, 100);
    END
    FETCH NEXT FROM gcur INTO @slug;
END
CLOSE gcur;
DEALLOCATE gcur;
GO

/* ---------- Cau hoi mau (ASCII) cho cac game vocabulary / MCQ ---------- */
DECLARE @sample TABLE (slug NVARCHAR(100), qtype NVARCHAR(50), qtext NVARCHAR(500), opts NVARCHAR(MAX), ci INT, expl NVARCHAR(500));
INSERT INTO @sample VALUES
 (N'flashcard-vocabulary', N'vocab_meaning', N'おはよう', N'[{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Cam on"},{"text":"Xin loi"}]', 0, N'Ohayou'),
 (N'flashcard-vocabulary', N'vocab_meaning', N'ありがとう', N'[{"text":"Cam on"},{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Xin loi"}]', 0, N'Arigatou'),
 (N'flashcard-vocabulary', N'vocab_meaning', N'すみません', N'[{"text":"Xin loi"},{"text":"Cam on"},{"text":"Chao buoi sang"},{"text":"Tam biet"}]', 0, N'Sumimasen'),
 (N'vocabulary-speed-quiz', N'vocab_meaning', N'水', N'[{"text":"Nuoc"},{"text":"Lua"},{"text":"Dat"},{"text":"Gio"}]', 0, N'Mizu'),
 (N'vocabulary-speed-quiz', N'vocab_meaning', N'火', N'[{"text":"Lua"},{"text":"Nuoc"},{"text":"Dat"},{"text":"Gio"}]', 0, N'Hi'),
 (N'kanji-memory', N'kanji_reading', N'山', N'[{"text":"san (nui)"},{"text":"kawa (song)"},{"text":"ki (cay)"},{"text":"ame (mua)"}]', 0, N'Yama'),
 (N'kanji-memory', N'kanji_reading', N'川', N'[{"text":"kawa (song)"},{"text":"san (nui)"},{"text":"umi (bien)"},{"text":"mizu (nuoc)"}]', 0, N'Kawa'),
 (N'sentence-builder', N'sentence_order', N'Chon thu tu dung:', N'[{"text":"私は / 学生 / です / 。"},{"text":"学生 / 私は / です / 。"},{"text":"です / 私は / 学生 / 。"},{"text":"私は / です / 学生 / 。"}]', 0, N'Watashi wa gakusei desu'),
 (N'counter-quest', N'counter', N'Chon tro tu dem hop: 3 chiec ban', N'[{"text":"枚"},{"text":"台"},{"text":"匹"},{"text":"本"}]', 1, N'台 dung cho may, ban...'),
 (N'boss-battle', N'boss_round', N'Boss: Chon nghia dung cho 勉強', N'[{"text":"Hoc tap"},{"text":"An uong"},{"text":"Ngu nghi"},{"text":"Chay bo"}]', 0, N'Benkyou'),
 (N'daily-challenge', N'daily', N'「水」đọc là gì?', N'[{"text":"mizu"},{"text":"hi"},{"text":"ki"},{"text":"chi"}]', 0, N'Mizu'),
 (N'multiple-choice', N'mc', N'「はし」 co the la gi?', N'[{"text":"Dua / dua"},{"text":"Cai bat"},{"text":"Cai ly"},{"text":"Cai dia"}]', 0, N'Hashi'),
 (N'fill-in-blank', N'fill', N'Toi la hoc sinh: わたしは____です。', N'[{"text":"がくせい"},{"text":"せんせい"},{"text":"ともだち"},{"text":"かぞく"}]', 0, N'gakusei'),
 (N'listen-choose', N'listen', N'(Nghe mau) Chon tu ban nghe duoc', N'[{"text":"a"},{"text":"i"},{"text":"u"},{"text":"e"}]', 0, N'Dung audio URL sau');

INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
SELECT gqs.id, s.qtype, s.qtext, s.opts, s.ci, s.expl, 100, 1, 1, ROW_NUMBER() OVER (ORDER BY s.slug, s.qtext)
FROM @sample s
INNER JOIN dbo.games g ON g.slug = s.slug AND ISNULL(g.is_active, 1) = 1
INNER JOIN dbo.game_question_sets gqs ON gqs.game_id = g.id AND gqs.name = N'Bo mac dinh N5'
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.game_questions q
    WHERE q.set_id = gqs.id AND q.question_text = s.qtext);
GO

/* ---------- Hiragana / Katakana: 46 ky tu (NCHAR hex) ---------- */
DECLARE @n5 INT = (SELECT TOP 1 id FROM dbo.levels WHERE code = N'N5');
DECLARE @hid INT = (SELECT id FROM dbo.games WHERE slug = N'hiragana-match' AND ISNULL(is_active, 1) = 1);
DECLARE @setH INT = (
    SELECT TOP 1 gqs.id FROM dbo.game_question_sets gqs
    WHERE gqs.game_id = @hid ORDER BY gqs.id);
IF @hid IS NOT NULL AND @setH IS NULL
BEGIN
    INSERT INTO dbo.game_question_sets (game_id, level_id, name, description, questions_per_round, time_per_question_s, is_active, sort_order)
    VALUES (@hid, @n5, N'Hiragana N5 seed', N'Auto', 10, 10, 1, 0);
    SET @setH = SCOPE_IDENTITY();
END

IF @setH IS NOT NULL
BEGIN
    UPDATE dbo.game_question_sets SET questions_per_round = 10, time_per_question_s = 10 WHERE id = @setH;

    ;WITH k (cp, r) AS (
        SELECT * FROM (VALUES
        (0x3042,N'a'),(0x3044,N'i'),(0x3046,N'u'),(0x3048,N'e'),(0x304A,N'o'),
        (0x304B,N'ka'),(0x304D,N'ki'),(0x304F,N'ku'),(0x3051,N'ke'),(0x3053,N'ko'),
        (0x3055,N'sa'),(0x3057,N'shi'),(0x3059,N'su'),(0x305B,N'se'),(0x305D,N'so'),
        (0x305F,N'ta'),(0x3061,N'chi'),(0x3064,N'tsu'),(0x3066,N'te'),(0x3068,N'to'),
        (0x306A,N'na'),(0x306B,N'ni'),(0x306C,N'nu'),(0x306D,N'ne'),(0x306E,N'no'),
        (0x306F,N'ha'),(0x3072,N'hi'),(0x3075,N'fu'),(0x3078,N'he'),(0x307B,N'ho'),
        (0x307E,N'ma'),(0x307F,N'mi'),(0x3080,N'mu'),(0x3081,N'me'),(0x3082,N'mo'),
        (0x3084,N'ya'),(0x3086,N'yu'),(0x3088,N'yo'),
        (0x3089,N'ra'),(0x308A,N'ri'),(0x308B,N'ru'),(0x308C,N're'),(0x308D,N'ro'),
        (0x308F,N'wa'),(0x3092,N'wo'),(0x3093,N'n')
        ) v(cp,r)
    )
    INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
    SELECT @setH, N'char_to_romaji', NCHAR(k.cp),
           N'[{"text":"'+k.r+N'"},{"text":"a"},{"text":"i"},{"text":"u"}]', 0,
           NCHAR(k.cp) + N' = ' + k.r, 100, 1, 1, ROW_NUMBER() OVER (ORDER BY k.cp)
    FROM k k
    WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions q WHERE q.set_id = @setH AND q.question_text = NCHAR(k.cp));
END
GO

/* Katakana: 46 ky tu — batch rieng sau GO can khai bao lai @n5 */
DECLARE @n5 INT = (SELECT TOP 1 id FROM dbo.levels WHERE code = N'N5');
DECLARE @kid INT = (SELECT id FROM dbo.games WHERE slug = N'katakana-match' AND ISNULL(is_active, 1) = 1);
DECLARE @setK INT = (SELECT TOP 1 gqs.id FROM dbo.game_question_sets gqs WHERE gqs.game_id = @kid ORDER BY gqs.id);
IF @kid IS NOT NULL AND @setK IS NULL
BEGIN
    INSERT INTO dbo.game_question_sets (game_id, level_id, name, description, questions_per_round, time_per_question_s, is_active, sort_order)
    VALUES (@kid, @n5, N'Katakana N5 seed', N'Auto', 10, 10, 1, 0);
    SET @setK = SCOPE_IDENTITY();
END

IF @setK IS NOT NULL
BEGIN
    UPDATE dbo.game_question_sets SET questions_per_round = 10, time_per_question_s = 10 WHERE id = @setK;

    ;WITH k (cp, r) AS (
        SELECT * FROM (VALUES
        (0x30A2,N'a'),(0x30A4,N'i'),(0x30A6,N'u'),(0x30A8,N'e'),(0x30AA,N'o'),
        (0x30AB,N'ka'),(0x30AD,N'ki'),(0x30AF,N'ku'),(0x30B1,N'ke'),(0x30B3,N'ko'),
        (0x30B5,N'sa'),(0x30B7,N'shi'),(0x30B9,N'su'),(0x30BB,N'se'),(0x30BD,N'so'),
        (0x30BF,N'ta'),(0x30C1,N'chi'),(0x30C4,N'tsu'),(0x30C6,N'te'),(0x30C8,N'to'),
        (0x30CA,N'na'),(0x30CB,N'ni'),(0x30CC,N'nu'),(0x30CD,N'ne'),(0x30CE,N'no'),
        (0x30CF,N'ha'),(0x30D2,N'hi'),(0x30D5,N'fu'),(0x30D8,N'he'),(0x30DB,N'ho'),
        (0x30DE,N'ma'),(0x30DF,N'mi'),(0x30E0,N'mu'),(0x30E1,N'me'),(0x30E2,N'mo'),
        (0x30E4,N'ya'),(0x30E6,N'yu'),(0x30E8,N'yo'),
        (0x30E9,N'ra'),(0x30EA,N'ri'),(0x30EB,N'ru'),(0x30EC,N're'),(0x30ED,N'ro'),
        (0x30EF,N'wa'),(0x30F2,N'wo'),(0x30F3,N'n')
        ) v(cp,r)
    )
    INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
    SELECT @setK, N'char_to_romaji', NCHAR(k.cp),
           N'[{"text":"'+k.r+N'"},{"text":"a"},{"text":"i"},{"text":"u"}]', 0,
           NCHAR(k.cp) + N' = ' + k.r, 100, 1, 1, ROW_NUMBER() OVER (ORDER BY k.cp)
    FROM k k
    WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions q WHERE q.set_id = @setK AND q.question_text = NCHAR(k.cp));
END
GO

/* Timer theo dac ta: Hira/Kata 10s, Vocab Speed 8s; Daily 15 cau; mo ta 9 game */
UPDATE gqs
SET time_per_question_s = 10
FROM dbo.game_question_sets gqs
INNER JOIN dbo.games g ON g.id = gqs.game_id
WHERE g.slug IN (N'hiragana-match', N'katakana-match');

UPDATE gqs
SET time_per_question_s = 8
FROM dbo.game_question_sets gqs
INNER JOIN dbo.games g ON g.id = gqs.game_id
WHERE g.slug = N'vocabulary-speed-quiz';

UPDATE gqs
SET questions_per_round = 15
FROM dbo.game_question_sets gqs
INNER JOIN dbo.games g ON g.id = gqs.game_id
WHERE g.slug = N'daily-challenge';

UPDATE dbo.games SET description = N'Chọn đúng romaji cho chữ Hiragana (10 giây/câu).', updated_at = SYSUTCDATETIME()
WHERE slug = N'hiragana-match';
UPDATE dbo.games SET description = N'Chọn đúng romaji cho chữ Katakana (10 giây/câu).', updated_at = SYSUTCDATETIME()
WHERE slug = N'katakana-match';
UPDATE dbo.games SET description = N'Lật thẻ ghép Kanji với nghĩa (memory game).', updated_at = SYSUTCDATETIME()
WHERE slug = N'kanji-memory';
UPDATE dbo.games SET description = N'Quiz từ vựng phản xạ nhanh (8 giây/câu).', updated_at = SYSUTCDATETIME()
WHERE slug = N'vocabulary-speed-quiz';
UPDATE dbo.games SET description = N'Sắp xếp từ thành câu hoàn chỉnh.', updated_at = SYSUTCDATETIME()
WHERE slug = N'sentence-builder';
UPDATE dbo.games SET description = N'Chọn cách đếm đúng (trợ từ đếm).', updated_at = SYSUTCDATETIME()
WHERE slug = N'counter-quest';
UPDATE dbo.games
SET name = N'Flashcard Battle',
    description = N'Đấu với Bot AI (~70% đúng mỗi vòng). Chọn nghĩa đúng cho từ.',
    updated_at = SYSUTCDATETIME()
WHERE slug = N'flashcard-vocabulary';
UPDATE dbo.games SET description = N'Đánh boss bằng kiến thức — thanh HP boss và người chơi.', updated_at = SYSUTCDATETIME()
WHERE slug = N'boss-battle';
UPDATE dbo.games SET description = N'Mix 15 câu hỏi từ nhiều chủ đề.', updated_at = SYSUTCDATETIME()
WHERE slug = N'daily-challenge';

/* Daily: thay câu toán bằng từ vựng tiếng Nhật (đã seed trước đó vẫn còn trong DB). */
UPDATE q
SET question_text = N'「水」đọc là gì?',
    options_json = N'[{"text":"mizu"},{"text":"hi"},{"text":"ki"},{"text":"chi"}]',
    correct_index = 0,
    explanation = N'Mizu'
FROM dbo.game_questions q
INNER JOIN dbo.game_question_sets gqs ON gqs.id = q.set_id
INNER JOIN dbo.games g ON g.id = gqs.game_id
WHERE g.slug = N'daily-challenge'
  AND (q.question_text LIKE N'Daily:%' OR q.question_text LIKE N'%5 + 3%');

/*
  daily_challenges: bổ sung cột thiếu — PHẢI là batch riêng (GO) trước INSERT.
  Trong cùng một batch, SQL Server resolve tên cột lúc compile; ALTER ... ADD chưa “nhìn thấy” khi compile INSERT → Msg 207.
*/
IF OBJECT_ID(N'dbo.daily_challenges', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.daily_challenges', N'bonus_exp') IS NULL
        ALTER TABLE dbo.daily_challenges ADD bonus_exp INT NOT NULL CONSTRAINT DF_dc_bonus_exp_seed DEFAULT (0);
    IF COL_LENGTH(N'dbo.daily_challenges', N'bonus_xu') IS NULL
        ALTER TABLE dbo.daily_challenges ADD bonus_xu INT NOT NULL CONSTRAINT DF_dc_bonus_xu_seed DEFAULT (0);
    IF COL_LENGTH(N'dbo.daily_challenges', N'is_active') IS NULL
        ALTER TABLE dbo.daily_challenges ADD is_active BIT NOT NULL CONSTRAINT DF_dc_is_active_seed DEFAULT (1);
END
GO

/* Dòng daily_challenges cho ngày hiện tại (API /api/game/daily-challenge). */
DECLARE @dcGameId INT = (SELECT id FROM dbo.games WHERE slug = N'daily-challenge' AND ISNULL(is_active, 1) = 1);
IF @dcGameId IS NOT NULL AND OBJECT_ID(N'dbo.daily_challenges', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.daily_challenges
        WHERE game_id = @dcGameId AND challenge_date = CAST(GETUTCDATE() AS DATE))
        INSERT INTO dbo.daily_challenges (challenge_date, game_id, title, bonus_exp, bonus_xu, is_active)
        VALUES (CAST(GETUTCDATE() AS DATE), @dcGameId, N'15 câu N5 — từ vựng & bảng chữ', 40, 20, 1);
END

PRINT N'seed_games_playable_fix_v1: xong. Kiem tra lai bang Hiragana (na ni nu ne no) neu can chinh codepoint.';
GO


-- ============================================================================
-- FILE: seed_powerup_starter_inventory.sql
-- ============================================================================
/*
  Gán túi đồ power-up mẫu cho MỘT user (đổi @user_id) — để thử 6.2 trên môi trường dev.
  Giả định đã seed dbo.power_ups (yumegoji_game_system_spec.sql) và có dbo.user_inventory.
*/
SET NOCOUNT ON;

DECLARE @user_id INT = 1; /* TODO: đổi id user thật */

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
BEGIN
    PRINT N'seed_powerup_starter_inventory: không có user id = ' + CAST(@user_id AS NVARCHAR(20));
    RETURN;
END

INSERT INTO dbo.user_inventory (user_id, power_up_id, quantity, updated_at)
SELECT @user_id, p.id, 10, SYSUTCDATETIME()
FROM dbo.power_ups p
WHERE ISNULL(p.is_active, 1) = 1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.user_inventory i
      WHERE i.user_id = @user_id AND i.power_up_id = p.id);

PRINT N'seed_powerup_starter_inventory: đã gán (mỗi loại 10) nếu chưa có dòng — user ' + CAST(@user_id AS NVARCHAR(20));
GO


-- ============================================================================
-- FILE: seed_sample_lesson_content.sql
-- ============================================================================
-- Mẫu nhập nội dung bài học (Markdown trong cột content) + vài từ vựng.
-- Sửa @lesson_id và @category_id cho khớp DB của bạn (xem SELECT id FROM lessons / lesson_categories).

DECLARE @lesson_id INT = 1;
DECLARE @category_id INT = (SELECT category_id FROM lessons WHERE id = @lesson_id);

-- Nội dung bài: Markdown — app front-end render (vd. react-markdown).
UPDATE lessons
SET content = N'# Chào hỏi cơ bản

## Mục tiêu
- Chào buổi sáng / chiều / tối
- Tự giới thiệu tên

## Hội thoại mẫu
> A: おはようございます。  
> B: おはようございます。

## Lưu ý
Dùng **です／ます** trong ngữ cảnh lịch sự.
',
    updated_at = SYSUTCDATETIME()
WHERE id = @lesson_id;

-- Từ vựng mẫu (nếu chưa có — tránh trùng word_jp cùng lesson nếu có unique)
IF NOT EXISTS (SELECT 1 FROM vocabulary_items WHERE lesson_id = @lesson_id AND word_jp = N'おはよう')
INSERT INTO vocabulary_items (lesson_id, word_jp, reading, meaning_vi, meaning_en, example_sentence, audio_url, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'おはよう', N'ohayou', N'Chào buổi sáng (thân)', N'Good morning (casual)', N'おはよう！', NULL, 1, SYSUTCDATETIME(), SYSUTCDATETIME());

-- Kanji mẫu
IF NOT EXISTS (SELECT 1 FROM kanji_items WHERE lesson_id = @lesson_id AND character = N'朝')
INSERT INTO kanji_items (lesson_id, character, readings_on, readings_kun, meaning_vi, meaning_en, stroke_count, jlpt_level, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'朝', N'チョウ', N'あさ', N'buổi sáng', N'morning', 12, N'N5', 1, SYSUTCDATETIME(), SYSUTCDATETIME());

-- Ngữ pháp mẫu (level_id = cấp độ của category chứa bài)
DECLARE @level_id INT = (SELECT level_id FROM lesson_categories WHERE id = @category_id);
IF @level_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM grammar_items WHERE lesson_id = @lesson_id AND pattern = N'おはようございます')
INSERT INTO grammar_items (lesson_id, pattern, structure, meaning_vi, meaning_en, example_sentences, level_id, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'おはようございます', NULL, N'Xin chào (buổi sáng, lịch sự)', N'Good morning (polite)', N'おはようございます、先生。', @level_id, 1, SYSUTCDATETIME(), SYSUTCDATETIME());

