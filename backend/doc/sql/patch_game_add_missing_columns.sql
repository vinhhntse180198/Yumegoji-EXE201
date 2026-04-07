/*
  Chạy file này MỘT LẦN nếu bảng games / power_ups đã tồn tại nhưng thiếu cột
  (lỗi Msg 207: sort_order, stackable, max_per_session...).

  Sau đó chạy lại phần INSERT seed trong create_game_module_tables.sql (hoặc chạy nguyên file đã cập nhật).
*/
USE YumegojiDB; /* đổi tên DB nếu cần */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.games', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.games', N'sort_order') IS NULL
        ALTER TABLE dbo.games ADD sort_order INT NOT NULL CONSTRAINT DF_games_sort_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_boss_mode') IS NULL
        ALTER TABLE dbo.games ADD is_boss_mode BIT NOT NULL CONSTRAINT DF_games_boss_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'is_active') IS NULL
        ALTER TABLE dbo.games ADD is_active BIT NOT NULL CONSTRAINT DF_games_active_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.games', N'config_json') IS NULL
        ALTER TABLE dbo.games ADD config_json NVARCHAR(MAX) NULL;
    IF COL_LENGTH(N'dbo.games', N'is_pvp') IS NULL
        ALTER TABLE dbo.games ADD is_pvp BIT NOT NULL CONSTRAINT DF_games_pvp_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.games', N'max_hearts') IS NULL
        ALTER TABLE dbo.games ADD max_hearts INT NOT NULL CONSTRAINT DF_games_hearts_patch DEFAULT (3);
END

IF OBJECT_ID(N'dbo.power_ups', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.power_ups', N'stackable') IS NULL
        ALTER TABLE dbo.power_ups ADD stackable BIT NOT NULL CONSTRAINT DF_pu_stack_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'max_per_session') IS NULL
        ALTER TABLE dbo.power_ups ADD max_per_session INT NULL;
    IF COL_LENGTH(N'dbo.power_ups', N'sort_order') IS NULL
        ALTER TABLE dbo.power_ups ADD sort_order INT NOT NULL CONSTRAINT DF_pu_sort_patch DEFAULT (0);
    IF COL_LENGTH(N'dbo.power_ups', N'is_active') IS NULL
        ALTER TABLE dbo.power_ups ADD is_active BIT NOT NULL CONSTRAINT DF_pu_active_patch DEFAULT (1);
    IF COL_LENGTH(N'dbo.power_ups', N'is_premium') IS NULL
        ALTER TABLE dbo.power_ups ADD is_premium BIT NOT NULL CONSTRAINT DF_pu_prem_patch DEFAULT (0);
END

PRINT N'patch_game_add_missing_columns: xong.';
GO
