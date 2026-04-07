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
