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
