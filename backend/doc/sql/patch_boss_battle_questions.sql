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
