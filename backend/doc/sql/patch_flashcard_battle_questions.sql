/*
  Flashcard Battle (slug seed: flashcard-vocabulary): thêm câu từ vựng để TOP N đủ bài khi không dùng bài học.
  Chạy trên SQL Server; cần sp_StartGameSession có @question_count.
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (
  SELECT TOP 1 id FROM dbo.games
  WHERE slug IN (N'flashcard-vocabulary', N'flashcard-battle') AND ISNULL(is_active, 1) = 1
  ORDER BY CASE WHEN slug = N'flashcard-vocabulary' THEN 0 ELSE 1 END);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 500 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'vocab_meaning', N'こんにちは', N'[{"text":"Xin chao (ban ngay)"},{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Cam on"}]', 0, N'Konnichiwa'),
    (N'vocab_meaning', N'こんばんは', N'[{"text":"Chao buoi toi"},{"text":"Chao buoi sang"},{"text":"Tam biet"},{"text":"Xin chao (ban ngay)"}]', 0, N'Konbanwa'),
    (N'vocab_meaning', N'さようなら', N'[{"text":"Tam biet"},{"text":"Chao buoi sang"},{"text":"Cam on"},{"text":"Xin loi"}]', 0, N'Sayounara'),
    (N'vocab_meaning', N'はい', N'[{"text":"Vang / dung"},{"text":"Khong"},{"text":"Co le"},{"text":"Xin loi"}]', 0, N'Hai'),
    (N'vocab_meaning', N'いいえ', N'[{"text":"Khong"},{"text":"Vang / dung"},{"text":"Cam on"},{"text":"Tam biet"}]', 0, N'Iie'),
    (N'vocab_meaning', N'水', N'[{"text":"Nuoc"},{"text":"Lua"},{"text":"Gio"},{"text":"Dat"}]', 0, N'Mizu'),
    (N'vocab_meaning', N'火', N'[{"text":"Lua"},{"text":"Nuoc"},{"text":"Cay"},{"text":"Nui"}]', 0, N'Hi'),
    (N'vocab_meaning', N'木', N'[{"text":"Cay"},{"text":"Nuoc"},{"text":"Nui"},{"text":"Song"}]', 0, N'Ki'),
    (N'vocab_meaning', N'山', N'[{"text":"Nui"},{"text":"Song"},{"text":"Bien"},{"text":"Cay"}]', 0, N'Yama'),
    (N'vocab_meaning', N'川', N'[{"text":"Song"},{"text":"Nui"},{"text":"Bien"},{"text":"Mua"}]', 0, N'Kawa'),
    (N'vocab_meaning', N'食べる', N'[{"text":"An"},{"text":"Uong"},{"text":"Ngu"},{"text":"Chay"}]', 0, N'Taberu'),
    (N'vocab_meaning', N'飲む', N'[{"text":"Uong"},{"text":"An"},{"text":"Doc"},{"text":"Viet"}]', 0, N'Nomu'),
    (N'vocab_meaning', N'見る', N'[{"text":"Nhin / xem"},{"text":"Nghe"},{"text":"Noi"},{"text":"Di"}]', 0, N'Miru'),
    (N'vocab_meaning', N'行く', N'[{"text":"Di"},{"text":"Den"},{"text":"O lai"},{"text":"Dung lai"}]', 0, N'Iku'),
    (N'vocab_meaning', N'来る', N'[{"text":"Den"},{"text":"Di"},{"text":"Ve"},{"text":"O"}]', 0, N'Kuru')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 10 THEN 10 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_flashcard_battle_questions: xong.';
GO
