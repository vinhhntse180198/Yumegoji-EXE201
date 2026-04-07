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
