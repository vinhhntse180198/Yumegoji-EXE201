/*
  Bổ sung level_min / level_max cho dbo.games (đặc tả STT game N5–N3…).
  Backend GET /api/game SELECT các cột này — chạy nếu bảng games chưa có cột.
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.games', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.games', N'level_min') IS NULL
        ALTER TABLE dbo.games ADD level_min NVARCHAR(10) NULL;
    IF COL_LENGTH(N'dbo.games', N'level_max') IS NULL
        ALTER TABLE dbo.games ADD level_max NVARCHAR(10) NULL;
END
GO

PRINT N'patch_games_level_range_columns: xong.';
GO
