/*
  Yumegoji — mô-đun Game (SQL Server) — bản rút gọn / cũ.
  Đặc tả đầy đủ (question sets, SP scoring, boss_configs, user_statistics…):
  xem yumegoji_game_system_spec.sql

  Chạy một lần trên database đang dùng (vd. YumegojiDB).
  Giả định đã có: dbo.users (id), dbo.lessons (id) — FK tùy chọn.

  Bao gồm:
  - games, game_questions, game_sessions
  - power_ups, user_inventory
  - daily_challenges, user_daily_challenges
  - leaderboard_periods, leaderboard_entries
  - achievements, user_achievements
  - pvp_rooms, boss_battles

  Combo / speed: lưu tại game_sessions (max_combo, combo_bonus_points, speed_bonus_points, duration_ms...).
*/

SET NOCOUNT ON;
GO

/* ---------- games ---------- */
IF OBJECT_ID(N'dbo.games', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.games (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_games PRIMARY KEY,
        slug            NVARCHAR(100) NOT NULL,
        name            NVARCHAR(200) NOT NULL,
        description     NVARCHAR(MAX) NULL,
        skill_type      NVARCHAR(50) NULL,       /* vocabulary, listening, kanji, grammar, kana, mixed */
        max_hearts      INT NOT NULL CONSTRAINT DF_games_max_hearts DEFAULT (3),
        is_pvp          BIT NOT NULL CONSTRAINT DF_games_is_pvp DEFAULT (0),
        is_boss_mode    BIT NOT NULL CONSTRAINT DF_games_boss DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_games_active DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_games_sort DEFAULT (0),
        config_json     NVARCHAR(MAX) NULL,      /* độ khó mặc định, số câu, v.v. */
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_games_created DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2 NOT NULL CONSTRAINT DF_games_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_games_slug UNIQUE (slug)
    );
    CREATE INDEX IX_games_skill_active ON dbo.games (skill_type, is_active);
END
ELSE
BEGIN
    /* Bảng games đã có từ script khác — bổ sung cột thiếu (tránh Msg 207 khi INSERT/seed) */
    IF COL_LENGTH(N'dbo.games', N'sort_order') IS NULL
        ALTER TABLE dbo.games ADD sort_order INT NOT NULL CONSTRAINT DF_games_sort_alter DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_boss_mode') IS NULL
        ALTER TABLE dbo.games ADD is_boss_mode BIT NOT NULL CONSTRAINT DF_games_boss_alter DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_active') IS NULL
        ALTER TABLE dbo.games ADD is_active BIT NOT NULL CONSTRAINT DF_games_active_alter DEFAULT (1);
    IF COL_LENGTH(N'dbo.games', N'config_json') IS NULL
        ALTER TABLE dbo.games ADD config_json NVARCHAR(MAX) NULL;
    IF COL_LENGTH(N'dbo.games', N'is_pvp') IS NULL
        ALTER TABLE dbo.games ADD is_pvp BIT NOT NULL CONSTRAINT DF_games_pvp_alter DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'max_hearts') IS NULL
        ALTER TABLE dbo.games ADD max_hearts INT NOT NULL CONSTRAINT DF_games_hearts_alter DEFAULT (3);
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
        effect_type     NVARCHAR(50) NOT NULL,   /* fifty_fifty, skip_question, double_points, hint */
        stackable       BIT NOT NULL CONSTRAINT DF_pu_stack DEFAULT (1),
        max_per_session INT NULL,
        xu_price        INT NULL,
        is_active       BIT NOT NULL CONSTRAINT DF_pu_active DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_pu_sort DEFAULT (0),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_pu_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_power_ups_slug UNIQUE (slug)
    );
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.power_ups', N'stackable') IS NULL
        ALTER TABLE dbo.power_ups ADD stackable BIT NOT NULL CONSTRAINT DF_pu_stack_alter DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'max_per_session') IS NULL
        ALTER TABLE dbo.power_ups ADD max_per_session INT NULL;
    IF COL_LENGTH(N'dbo.power_ups', N'sort_order') IS NULL
        ALTER TABLE dbo.power_ups ADD sort_order INT NOT NULL CONSTRAINT DF_pu_sort_alter DEFAULT (0);
    IF COL_LENGTH(N'dbo.power_ups', N'is_active') IS NULL
        ALTER TABLE dbo.power_ups ADD is_active BIT NOT NULL CONSTRAINT DF_pu_active_alter DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'is_premium') IS NULL
        ALTER TABLE dbo.power_ups ADD is_premium BIT NOT NULL CONSTRAINT DF_pu_prem_alter DEFAULT (0);
END
GO

/* ---------- achievements ---------- */
IF OBJECT_ID(N'dbo.achievements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.achievements (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_achievements PRIMARY KEY,
        slug            NVARCHAR(100) NOT NULL,
        name            NVARCHAR(200) NOT NULL,
        description     NVARCHAR(MAX) NULL,
        icon_url        NVARCHAR(500) NULL,
        criteria_type   NVARCHAR(50) NOT NULL,   /* score_reached, streak, games_played, combo, rank */
        criteria_json   NVARCHAR(MAX) NULL,
        reward_exp      INT NOT NULL CONSTRAINT DF_ach_exp DEFAULT (0),
        reward_xu       INT NOT NULL CONSTRAINT DF_ach_xu DEFAULT (0),
        sort_order      INT NOT NULL CONSTRAINT DF_ach_sort DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_ach_active DEFAULT (1),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_ach_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_achievements_slug UNIQUE (slug)
    );
END
GO

/* ---------- daily_challenges ---------- */
IF OBJECT_ID(N'dbo.daily_challenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.daily_challenges (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_daily_challenges PRIMARY KEY,
        challenge_date  DATE NOT NULL,
        game_id         INT NOT NULL,
        title           NVARCHAR(200) NOT NULL,
        rules_json      NVARCHAR(MAX) NULL,
        bonus_exp       INT NOT NULL CONSTRAINT DF_dc_exp DEFAULT (0),
        bonus_xu        INT NOT NULL CONSTRAINT DF_dc_xu DEFAULT (0),
        is_active       BIT NOT NULL CONSTRAINT DF_dc_active DEFAULT (1),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_dc_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_daily_challenges_game FOREIGN KEY (game_id) REFERENCES dbo.games (id),
        CONSTRAINT UQ_daily_challenges_date_game UNIQUE (challenge_date, game_id)
    );
    CREATE INDEX IX_daily_challenges_date ON dbo.daily_challenges (challenge_date, is_active);
END
GO

/* ---------- leaderboard_periods ---------- */
IF OBJECT_ID(N'dbo.leaderboard_periods', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.leaderboard_periods (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_leaderboard_periods PRIMARY KEY,
        game_id         INT NULL,                /* NULL = bảng tổng / toàn hệ thống */
        period_type     NVARCHAR(20) NOT NULL,   /* weekly, monthly, all_time, daily */
        label           NVARCHAR(100) NULL,
        starts_at       DATETIME2 NOT NULL,
        ends_at         DATETIME2 NULL,
        is_current      BIT NOT NULL CONSTRAINT DF_lbp_current DEFAULT (0),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_lbp_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_leaderboard_periods_game FOREIGN KEY (game_id) REFERENCES dbo.games (id)
    );
    CREATE INDEX IX_leaderboard_periods_lookup ON dbo.leaderboard_periods (game_id, period_type, is_current, starts_at);
END
GO

/* ---------- boss_battles ---------- */
IF OBJECT_ID(N'dbo.boss_battles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.boss_battles (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_boss_battles PRIMARY KEY,
        game_id         INT NOT NULL,
        slug            NVARCHAR(100) NOT NULL,
        title           NVARCHAR(200) NOT NULL,
        topic           NVARCHAR(200) NULL,
        level_id        INT NULL,                /* optional: gắn JLPT level */
        boss_hp         INT NOT NULL CONSTRAINT DF_bb_hp DEFAULT (100),
        time_limit_sec  INT NULL,
        reward_exp      INT NOT NULL CONSTRAINT DF_bb_rexp DEFAULT (0),
        reward_xu       INT NOT NULL CONSTRAINT DF_bb_rxu DEFAULT (0),
        config_json     NVARCHAR(MAX) NULL,
        is_active       BIT NOT NULL CONSTRAINT DF_bb_active DEFAULT (1),
        sort_order      INT NOT NULL CONSTRAINT DF_bb_sort DEFAULT (0),
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_bb_created DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2 NOT NULL CONSTRAINT DF_bb_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_boss_battles_game FOREIGN KEY (game_id) REFERENCES dbo.games (id),
        CONSTRAINT UQ_boss_battles_slug UNIQUE (slug)
    );
    CREATE INDEX IX_boss_battles_game ON dbo.boss_battles (game_id, is_active);
END
GO

IF OBJECT_ID(N'dbo.levels', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_boss_battles_level')
BEGIN
    ALTER TABLE dbo.boss_battles
    ADD CONSTRAINT FK_boss_battles_level FOREIGN KEY (level_id) REFERENCES dbo.levels (id);
END
GO

/* ---------- pvp_rooms ---------- */
IF OBJECT_ID(N'dbo.pvp_rooms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.pvp_rooms (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_pvp_rooms PRIMARY KEY,
        room_code           NVARCHAR(32) NOT NULL,
        game_id             INT NOT NULL,
        host_user_id        INT NOT NULL,
        guest_user_id       INT NULL,
        status              NVARCHAR(20) NOT NULL CONSTRAINT DF_pvp_status DEFAULT (N'waiting'),
        /* waiting, active, finished, cancelled */
        host_score          INT NOT NULL CONSTRAINT DF_pvp_hscore DEFAULT (0),
        guest_score         INT NOT NULL CONSTRAINT DF_pvp_gscore DEFAULT (0),
        winner_user_id      INT NULL,
        settings_json       NVARCHAR(MAX) NULL,
        created_at          DATETIME2 NOT NULL CONSTRAINT DF_pvp_created DEFAULT SYSUTCDATETIME(),
        started_at          DATETIME2 NULL,
        ended_at            DATETIME2 NULL,
        CONSTRAINT FK_pvp_rooms_game FOREIGN KEY (game_id) REFERENCES dbo.games (id),
        CONSTRAINT FK_pvp_rooms_host FOREIGN KEY (host_user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_pvp_rooms_guest FOREIGN KEY (guest_user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_pvp_rooms_winner FOREIGN KEY (winner_user_id) REFERENCES dbo.users (id),
        CONSTRAINT UQ_pvp_rooms_code UNIQUE (room_code)
    );
    CREATE INDEX IX_pvp_rooms_status ON dbo.pvp_rooms (status, created_at);
    CREATE INDEX IX_pvp_rooms_host ON dbo.pvp_rooms (host_user_id);
END
GO

/* ---------- game_questions ---------- */
IF OBJECT_ID(N'dbo.game_questions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_questions (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_game_questions PRIMARY KEY,
        game_id             INT NOT NULL,
        lesson_id           INT NULL,
        question_type       NVARCHAR(50) NOT NULL,
        /* hiragana_match, katakana_match, kanji_pair, multiple_choice, audio_select, order_sentence */
        prompt              NVARCHAR(MAX) NULL,
        prompt_json         NVARCHAR(MAX) NULL,  /* cấu trúc phức tạp: cặp, audio id... */
        correct_answer      NVARCHAR(500) NULL,
        options_json        NVARCHAR(MAX) NULL,   /* đáp án nhiễu, cặp kanji... */
        media_url           NVARCHAR(500) NULL,
        difficulty          INT NULL,
        points_base         INT NOT NULL CONSTRAINT DF_gq_points DEFAULT (10),
        time_bonus_ms       INT NULL,            /* ngưỡng để tính speed bonus (tuỳ app) */
        sort_order          INT NOT NULL CONSTRAINT DF_gq_sort DEFAULT (0),
        is_active           BIT NOT NULL CONSTRAINT DF_gq_active DEFAULT (1),
        created_at          DATETIME2 NOT NULL CONSTRAINT DF_gq_created DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2 NOT NULL CONSTRAINT DF_gq_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_game_questions_game FOREIGN KEY (game_id) REFERENCES dbo.games (id)
    );
    CREATE INDEX IX_game_questions_game_active ON dbo.game_questions (game_id, is_active, sort_order);
END
GO

/* Không thêm FK lesson_id → lessons ở đây: bảng game_questions từ yumegoji_game_system_spec
   dùng set_id, không có lesson_id — ALTER FK sẽ gây Msg 1769. Cột lesson_id chỉ có khi tạo
   bảng từ khối IF NULL phía trên; ràng buộc lessons (nếu cần) thêm tay trong SSMS. */

/* ---------- user_inventory ---------- */
IF OBJECT_ID(N'dbo.user_inventory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_inventory (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_user_inventory PRIMARY KEY,
        user_id         INT NOT NULL,
        power_up_id     INT NOT NULL,
        quantity        INT NOT NULL CONSTRAINT DF_ui_qty DEFAULT (0),
        updated_at      DATETIME2 NOT NULL CONSTRAINT DF_ui_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_user_inventory_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT FK_user_inventory_pu FOREIGN KEY (power_up_id) REFERENCES dbo.power_ups (id),
        CONSTRAINT UQ_user_inventory_user_pu UNIQUE (user_id, power_up_id)
    );
    CREATE INDEX IX_user_inventory_user ON dbo.user_inventory (user_id);
END
GO

/* ---------- user_achievements ---------- */
IF OBJECT_ID(N'dbo.user_achievements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_achievements (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_user_achievements PRIMARY KEY,
        user_id         INT NOT NULL,
        achievement_id  INT NOT NULL,
        progress_json   NVARCHAR(MAX) NULL,
        earned_at       DATETIME2 NOT NULL CONSTRAINT DF_ua_earned DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_user_achievements_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT FK_user_achievements_ach FOREIGN KEY (achievement_id) REFERENCES dbo.achievements (id),
        CONSTRAINT UQ_user_achievements_user_ach UNIQUE (user_id, achievement_id)
    );
    CREATE INDEX IX_user_achievements_user ON dbo.user_achievements (user_id);
END
GO

/* ---------- user_daily_challenges ---------- */
IF OBJECT_ID(N'dbo.user_daily_challenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_daily_challenges (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_user_daily_challenges PRIMARY KEY,
        user_id             INT NOT NULL,
        daily_challenge_id  INT NOT NULL,
        progress_percent    INT NOT NULL CONSTRAINT DF_udc_prog DEFAULT (0),
        best_score          INT NULL,
        attempts            INT NOT NULL CONSTRAINT DF_udc_attempts DEFAULT (0),
        completed_at        DATETIME2 NULL,
        rewards_claimed     BIT NOT NULL CONSTRAINT DF_udc_claimed DEFAULT (0),
        updated_at          DATETIME2 NOT NULL CONSTRAINT DF_udc_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_udc_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
        CONSTRAINT FK_udc_dc FOREIGN KEY (daily_challenge_id) REFERENCES dbo.daily_challenges (id),
        CONSTRAINT UQ_udc_user_challenge UNIQUE (user_id, daily_challenge_id)
    );
    CREATE INDEX IX_udc_user ON dbo.user_daily_challenges (user_id);
END
GO

/* ---------- leaderboard_entries ---------- */
IF OBJECT_ID(N'dbo.leaderboard_entries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.leaderboard_entries (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_leaderboard_entries PRIMARY KEY,
        period_id           INT NOT NULL,
        user_id             INT NOT NULL,
        score               INT NOT NULL CONSTRAINT DF_le_score DEFAULT (0),
        rank                INT NULL,
        accuracy_avg        DECIMAL(5,2) NULL,
        games_played        INT NOT NULL CONSTRAINT DF_le_games DEFAULT (0),
        best_combo          INT NOT NULL CONSTRAINT DF_le_combo DEFAULT (0),
        avg_duration_ms     INT NULL,
        metadata_json       NVARCHAR(MAX) NULL,
        updated_at          DATETIME2 NOT NULL CONSTRAINT DF_le_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_le_period FOREIGN KEY (period_id) REFERENCES dbo.leaderboard_periods (id) ON DELETE CASCADE,
        CONSTRAINT FK_le_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT UQ_le_period_user UNIQUE (period_id, user_id)
    );
    CREATE INDEX IX_le_period_rank ON dbo.leaderboard_entries (period_id, score DESC);
    CREATE INDEX IX_le_user ON dbo.leaderboard_entries (user_id);
END
GO

/* ---------- game_sessions ---------- */
IF OBJECT_ID(N'dbo.game_sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.game_sessions (
        id                      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_game_sessions PRIMARY KEY,
        user_id                 INT NOT NULL,
        game_id                 INT NOT NULL,
        mode                    NVARCHAR(30) NOT NULL CONSTRAINT DF_gs_mode DEFAULT (N'solo'),
        /* solo, pvp, boss, daily, practice */
        score                   INT NOT NULL CONSTRAINT DF_gs_score DEFAULT (0),
        max_combo               INT NOT NULL CONSTRAINT DF_gs_mcombo DEFAULT (0),
        combo_bonus_points      INT NOT NULL CONSTRAINT DF_gs_cb DEFAULT (0),
        speed_bonus_points      INT NOT NULL CONSTRAINT DF_gs_sb DEFAULT (0),
        base_points             INT NOT NULL CONSTRAINT DF_gs_base DEFAULT (0),
        hearts_remaining        INT NULL,
        hearts_lost             INT NOT NULL CONSTRAINT DF_gs_hlost DEFAULT (0),
        duration_ms             INT NULL,
        questions_correct       INT NOT NULL CONSTRAINT DF_gs_qok DEFAULT (0),
        questions_total         INT NOT NULL CONSTRAINT DF_gs_qtot DEFAULT (0),
        accuracy_percent        DECIMAL(5,2) NULL,
        exp_earned              INT NOT NULL CONSTRAINT DF_gs_exp DEFAULT (0),
        xu_earned               INT NOT NULL CONSTRAINT DF_gs_xu DEFAULT (0),
        opponent_user_id        INT NULL,
        pvp_room_id             INT NULL,
        boss_battle_id          INT NULL,
        daily_challenge_id      INT NULL,
        result                  NVARCHAR(20) NULL,  /* win, loss, draw, abandoned, completed */
        power_ups_used_json     NVARCHAR(MAX) NULL,
        metadata_json           NVARCHAR(MAX) NULL,
        started_at              DATETIME2 NOT NULL,
        ended_at                DATETIME2 NULL,
        created_at              DATETIME2 NOT NULL CONSTRAINT DF_gs_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_gs_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_gs_game FOREIGN KEY (game_id) REFERENCES dbo.games (id),
        CONSTRAINT FK_gs_opponent FOREIGN KEY (opponent_user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_gs_pvp FOREIGN KEY (pvp_room_id) REFERENCES dbo.pvp_rooms (id),
        CONSTRAINT FK_gs_boss FOREIGN KEY (boss_battle_id) REFERENCES dbo.boss_battles (id),
        CONSTRAINT FK_gs_daily FOREIGN KEY (daily_challenge_id) REFERENCES dbo.daily_challenges (id)
    );
    CREATE INDEX IX_game_sessions_user_started ON dbo.game_sessions (user_id, started_at DESC);
    CREATE INDEX IX_game_sessions_game_started ON dbo.game_sessions (game_id, started_at DESC);
    CREATE INDEX IX_game_sessions_pvp ON dbo.game_sessions (pvp_room_id);
END
GO

/* ---------- seed tối thiểu (power-ups + games mẫu) ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.power_ups WHERE slug = N'fifty_fifty')
INSERT INTO dbo.power_ups (slug, name, description, effect_type, stackable, max_per_session, xu_price, sort_order)
VALUES
 (N'fifty_fifty', N'50:50', N'Loại bỏ hai đáp án sai', N'fifty_fifty', 1, 3, 50, 1),
 (N'skip_question', N'Bỏ qua câu', N'Bỏ qua một câu hỏi', N'skip_question', 1, 2, 40, 2),
 (N'double_points', N'Nhân đôi điểm', N'Nhân đôi điểm câu tiếp theo', N'double_points', 0, 1, 80, 3);

IF NOT EXISTS (SELECT 1 FROM dbo.games WHERE slug = N'hiragana-match')
INSERT INTO dbo.games (slug, name, description, skill_type, max_hearts, is_pvp, is_boss_mode, sort_order)
VALUES
 (N'hiragana-match', N'Ghép Hiragana', N'Ghép ký tự với phiên âm', N'kana', 3, 0, 0, 1),
 (N'katakana-match', N'Ghép Katakana', N'Ghép Katakana', N'kana', 3, 0, 0, 2),
 (N'kanji-memory', N'Trí nhớ Kanji', N'Lật thẻ ghép cặp', N'kanji', 5, 0, 0, 3),
 (N'vocab-speed', N'Đố vui từ vựng', N'Chọn nghĩa đúng theo thời gian', N'vocabulary', 3, 0, 0, 4),
 (N'listen-pick', N'Nghe và chọn', N'Nghe audio chọn đáp án', N'listening', 3, 0, 0, 5),
 (N'order-sentence', N'Sắp xếp câu', N'Kéo thả thành câu đúng', N'grammar', 3, 0, 0, 6),
 (N'flashcard-pvp', N'Flashcard PvP', N'Đấu flashcard với bạn', N'vocabulary', 3, 1, 0, 7),
 (N'boss-topic', N'Boss theo chủ đề', N'Boss battle', N'mixed', 1, 0, 1, 8);

PRINT N'Game module tables + seed: xong. Bước tiếp: map EF Core + API gameplay.';
GO
