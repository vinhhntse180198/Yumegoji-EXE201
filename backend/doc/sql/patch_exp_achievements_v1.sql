/*
  Thành tích mốc tổng EXP (criteria_type = total_exp, criteria_json: {"minExp":N}).
  Phần thưởng EXP = 0 để tránh nhảy mốc phức tạp; có thể chỉnh sau.

  Chạy trên SQL Server sau khi đã có dbo.achievements (xem patch_achievements_leaderboard_v1.sql).
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.achievements', N'U') IS NULL
BEGIN
    RAISERROR(N'Thieu bang dbo.achievements.', 16, 1);
    RETURN;
END
GO

IF COL_LENGTH(N'dbo.achievements', N'condition_type') IS NOT NULL
BEGIN
    MERGE dbo.achievements AS t
    USING (VALUES
     (N'exp-100',       N'EXP 100',       N'Đạt 100 EXP tích lũy',       N'total_exp', N'{"minExp":100}',   0, 10, 20),
     (N'exp-500',       N'EXP 500',       N'Đạt 500 EXP tích lũy',       N'total_exp', N'{"minExp":500}',   0, 15, 21),
     (N'exp-1000',      N'EXP 1.000',     N'Đạt 1.000 EXP tích lũy',     N'total_exp', N'{"minExp":1000}',  0, 20, 22),
     (N'exp-2500',      N'EXP 2.500',     N'Đạt 2.500 EXP tích lũy',     N'total_exp', N'{"minExp":2500}',  0, 25, 23),
     (N'exp-5000',      N'EXP 5.000',     N'Đạt 5.000 EXP tích lũy',     N'total_exp', N'{"minExp":5000}',  0, 30, 24)
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
     (N'exp-100',       N'EXP 100',       N'Đạt 100 EXP tích lũy',       N'total_exp', N'{"minExp":100}',   0, 10, 20),
     (N'exp-500',       N'EXP 500',       N'Đạt 500 EXP tích lũy',       N'total_exp', N'{"minExp":500}',   0, 15, 21),
     (N'exp-1000',      N'EXP 1.000',     N'Đạt 1.000 EXP tích lũy',     N'total_exp', N'{"minExp":1000}',  0, 20, 22),
     (N'exp-2500',      N'EXP 2.500',     N'Đạt 2.500 EXP tích lũy',     N'total_exp', N'{"minExp":2500}',  0, 25, 23),
     (N'exp-5000',      N'EXP 5.000',     N'Đạt 5.000 EXP tích lũy',     N'total_exp', N'{"minExp":5000}',  0, 30, 24)
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

PRINT N'[patch_exp_achievements_v1] Xong seed thanh tich tong EXP.';
GO
