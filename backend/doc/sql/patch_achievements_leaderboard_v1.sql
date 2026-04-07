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
