/*
  Premium QR payment MVP
  - Cấu hình gói Premium (admin đổi giá)
  - Yêu cầu thanh toán (token ngắn)
  - Subscription 30 ngày (hoặc theo config)
*/
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.premium_payment_config', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_payment_config (
        id                   INT NOT NULL CONSTRAINT PK_premium_payment_config PRIMARY KEY,
        bank_code            NVARCHAR(16) NOT NULL,
        account_no           NVARCHAR(64) NOT NULL,
        account_name         NVARCHAR(200) NOT NULL,
        premium_price_vnd    INT NOT NULL,
        premium_duration_days INT NOT NULL,
        is_active            BIT NOT NULL CONSTRAINT DF_premium_cfg_active DEFAULT (1),
        updated_at           DATETIME2 NOT NULL CONSTRAINT DF_premium_cfg_updated DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.premium_payment_config WHERE id = 1)
BEGIN
    INSERT INTO dbo.premium_payment_config
        (id, bank_code, account_no, account_name, premium_price_vnd, premium_duration_days, is_active, updated_at)
    VALUES
        (1, N'ICB', N'105877558159', N'HOANG NGUYEN THE VINH', 10000, 30, 1, SYSUTCDATETIME());
END
GO

IF OBJECT_ID(N'dbo.premium_payment_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_payment_requests (
        id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_premium_payment_requests PRIMARY KEY,
        user_id         INT NOT NULL,
        token           NVARCHAR(32) NOT NULL,
        amount_vnd      INT NOT NULL,
        duration_days   INT NOT NULL,
        status          NVARCHAR(32) NOT NULL, /* created, pending_review, approved, rejected */
        created_at      DATETIME2 NOT NULL CONSTRAINT DF_premium_req_created DEFAULT SYSUTCDATETIME(),
        confirmed_at    DATETIME2 NULL,
        approved_at     DATETIME2 NULL,
        approved_by     INT NULL,
        note            NVARCHAR(500) NULL,
        bank_code       NVARCHAR(16) NOT NULL,
        account_no      NVARCHAR(64) NOT NULL,
        account_name    NVARCHAR(200) NOT NULL,
        CONSTRAINT FK_premium_req_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_premium_req_admin FOREIGN KEY (approved_by) REFERENCES dbo.users (id)
    );
    CREATE UNIQUE INDEX UX_premium_req_token ON dbo.premium_payment_requests(token);
    CREATE INDEX IX_premium_req_user ON dbo.premium_payment_requests(user_id, id DESC);
    CREATE INDEX IX_premium_req_status ON dbo.premium_payment_requests(status, id DESC);
END
GO

IF OBJECT_ID(N'dbo.premium_subscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.premium_subscriptions (
        id                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_premium_subscriptions PRIMARY KEY,
        user_id             INT NOT NULL,
        payment_request_id  INT NULL,
        started_at          DATETIME2 NOT NULL,
        expires_at          DATETIME2 NOT NULL,
        is_active           BIT NOT NULL CONSTRAINT DF_premium_sub_active DEFAULT (1),
        CONSTRAINT FK_premium_sub_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
        CONSTRAINT FK_premium_sub_request FOREIGN KEY (payment_request_id) REFERENCES dbo.premium_payment_requests (id)
    );
    CREATE INDEX IX_premium_sub_user ON dbo.premium_subscriptions(user_id, expires_at DESC);
END
GO

PRINT N'[patch_premium_upgrade_qr_v1] Done.';
GO
