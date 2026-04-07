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
