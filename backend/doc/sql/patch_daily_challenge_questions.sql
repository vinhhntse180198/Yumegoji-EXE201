/*
  Daily Challenge: đủ pool câu hỏi (>=5) + questions_per_round mặc định hợp lý.
  Trước đó seed chỉ có 1–2 câu → phiên chỉ 2/2 dù questions_per_round = 15.

  Chạy sau seed_games_playable_fix_v1 / patch sp_StartGameSession (đã có @question_count).
*/
SET NOCOUNT ON;
GO

DECLARE @gid INT = (SELECT id FROM dbo.games WHERE slug = N'daily-challenge' AND ISNULL(is_active, 1) = 1);
DECLARE @setId INT;

IF @gid IS NOT NULL
  SELECT TOP 1 @setId = gqs.id
  FROM dbo.game_question_sets gqs
  WHERE gqs.game_id = @gid AND ISNULL(gqs.is_active, 1) = 1
  ORDER BY gqs.sort_order, gqs.id;

IF @setId IS NOT NULL
BEGIN
  INSERT INTO dbo.game_questions (set_id, question_type, question_text, options_json, correct_index, explanation, base_score, difficulty, is_active, sort_order)
  SELECT @setId, v.qtype, v.qtext, v.opts, v.ci, v.expl, 100, 1, 1, 300 + ROW_NUMBER() OVER (ORDER BY v.qtext)
  FROM (VALUES
    (N'daily', N'「火」đọc là gì?', N'[{"text":"hi"},{"text":"mizu"},{"text":"ki"},{"text":"tsuchi"}]', 0, N'Hi'),
    (N'daily', N'「土」đọc là gì?', N'[{"text":"tsuchi"},{"text":"hi"},{"text":"kaze"},{"text":"yuki"}]', 0, N'Tsuchi'),
    (N'daily', N'「日」đọc là gì?', N'[{"text":"hi"},{"text":"tsuki"},{"text":"toshi"},{"text":"asa"}]', 0, N'Hi / nichi'),
    (N'daily', N'「月」đọc là gì?', N'[{"text":"tsuki"},{"text":"hi"},{"text":"toshi"},{"text":"shuu"}]', 0, N'Tsuki'),
    (N'daily', N'「人」đọc là gì?', N'[{"text":"hito"},{"text":"inu"},{"text":"ki"},{"text":"ie"}]', 0, N'Hito'),
    (N'daily', N'「川」đọc là gì?', N'[{"text":"kawa"},{"text":"yama"},{"text":"umi"},{"text":"mizu"}]', 0, N'Kawa'),
    (N'daily', N'「山」đọc là gì?', N'[{"text":"yama"},{"text":"kawa"},{"text":"mori"},{"text":"sato"}]', 0, N'Yama'),
    (N'daily', N'「木」đọc là gì?', N'[{"text":"ki"},{"text":"mizu"},{"text":"hi"},{"text":"tsuchi"}]', 0, N'Ki'),
    (N'daily', N'「雨」đọc là gì?', N'[{"text":"ame"},{"text":"yuki"},{"text":"kaze"},{"text":"kumo"}]', 0, N'Ame'),
    (N'daily', N'「口」đọc là gì?', N'[{"text":"kuchi"},{"text":"te"},{"text":"ashi"},{"text":"me"}]', 0, N'Kuchi'),
    (N'daily', N'「手」đọc là gì?', N'[{"text":"te"},{"text":"ashi"},{"text":"kuchi"},{"text":"mimi"}]', 0, N'Te'),
    (N'daily', N'「目」đọc là gì?', N'[{"text":"me"},{"text":"mimi"},{"text":"hana"},{"text":"kuchi"}]', 0, N'Me'),
    (N'daily', N'「耳」đọc là gì?', N'[{"text":"mimi"},{"text":"me"},{"text":"te"},{"text":"ashi"}]', 0, N'Mimi')
  ) AS v(qtype, qtext, opts, ci, expl)
  WHERE NOT EXISTS (SELECT 1 FROM dbo.game_questions x WHERE x.set_id = @setId AND x.question_text = v.qtext);

  UPDATE dbo.game_question_sets
  SET questions_per_round = 15,
      time_per_question_s = CASE WHEN time_per_question_s IS NULL OR time_per_question_s < 8 THEN 8 ELSE time_per_question_s END
  WHERE id = @setId;
END
GO

PRINT N'patch_daily_challenge_questions: xong.';
GO
