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
