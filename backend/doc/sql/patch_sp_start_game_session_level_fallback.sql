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
