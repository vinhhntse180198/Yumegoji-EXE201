-- =============================================================================
-- YumeGo-ji — Hỗ trợ đăng nhập Google (OAuth ID token)
-- Chạy trên SQL Server (USE đúng database của bạn, ví dụ YumegojiDB).
-- An toàn khi chạy lại: chỉ thêm cột / chỉnh nullable nếu chưa có.
-- =============================================================================

USE YumegojiDB;
GO

/* Mật khẩu có thể NULL cho tài khoản chỉ đăng nhập Google */
IF EXISTS (
  SELECT 1 FROM sys.columns c
  JOIN sys.tables t ON c.object_id = t.object_id
  WHERE t.name = 'users' AND SCHEMA_NAME(t.schema_id) = 'dbo' AND c.name = 'password_hash' AND c.is_nullable = 0
)
BEGIN
  ALTER TABLE dbo.users ALTER COLUMN password_hash NVARCHAR(255) NULL;
END
GO

/* Mã định danh Google (sub trong JWT) — liên kết tài khoản, không bắt buộc cho email */
IF COL_LENGTH('dbo.users', 'google_sub') IS NULL
BEGIN
  ALTER TABLE dbo.users ADD google_sub NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'UX_users_google_sub' AND object_id = OBJECT_ID(N'dbo.users')
)
BEGIN
  CREATE UNIQUE INDEX UX_users_google_sub ON dbo.users (google_sub) WHERE google_sub IS NOT NULL;
END
GO
