IF OBJECT_ID(N'placement_results_app', N'U') IS NOT NULL
BEGIN
    DROP TABLE placement_results_app;
END;
GO

CREATE TABLE placement_results_app (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    user_id       INT           NOT NULL,
    correct_count INT           NOT NULL,
    total_count   INT           NOT NULL,
    level_label   NVARCHAR(10)  NOT NULL,  -- 'N5', 'N4', 'N3'
    created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_placement_results_app_user_created
    ON placement_results_app(user_id, created_at);
GO

