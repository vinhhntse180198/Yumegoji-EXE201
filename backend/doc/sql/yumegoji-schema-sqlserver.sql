-- ============================================================
-- YUMEGO-JI - Website Học Tiếng Nhật qua Trò Chuyện
-- SQL Server Schema (chuyển từ DBML/PostgreSQL)
-- Chạy trên SQL Server 2016+ (hỗ trợ JSON)
-- ============================================================
Create Database YumegojiDB;
Use YumegojiDB;

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

