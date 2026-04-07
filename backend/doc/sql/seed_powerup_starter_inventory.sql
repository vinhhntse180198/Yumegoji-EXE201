/*
  Gán túi đồ power-up mẫu cho MỘT user (đổi @user_id) — để thử 6.2 trên môi trường dev.
  Giả định đã seed dbo.power_ups (yumegoji_game_system_spec.sql) và có dbo.user_inventory.
*/
SET NOCOUNT ON;

DECLARE @user_id INT = 1; /* TODO: đổi id user thật */

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @user_id)
BEGIN
    PRINT N'seed_powerup_starter_inventory: không có user id = ' + CAST(@user_id AS NVARCHAR(20));
    RETURN;
END

INSERT INTO dbo.user_inventory (user_id, power_up_id, quantity, updated_at)
SELECT @user_id, p.id, 10, SYSUTCDATETIME()
FROM dbo.power_ups p
WHERE ISNULL(p.is_active, 1) = 1
  AND NOT EXISTS (
      SELECT 1 FROM dbo.user_inventory i
      WHERE i.user_id = @user_id AND i.power_up_id = p.id);

PRINT N'seed_powerup_starter_inventory: đã gán (mỗi loại 10) nếu chưa có dòng — user ' + CAST(@user_id AS NVARCHAR(20));
GO
