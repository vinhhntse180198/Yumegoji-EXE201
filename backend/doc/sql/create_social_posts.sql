IF OBJECT_ID(N'posts', N'U') IS NOT NULL
    DROP TABLE posts;
IF OBJECT_ID(N'post_comments', N'U') IS NOT NULL
    DROP TABLE post_comments;
IF OBJECT_ID(N'post_reactions', N'U') IS NOT NULL
    DROP TABLE post_reactions;
GO

CREATE TABLE posts (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NOT NULL,
    content     NVARCHAR(MAX) NULL,
    image_url   NVARCHAR(500) NULL,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2     NULL
);
GO

CREATE TABLE post_comments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    post_id     INT           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INT           NOT NULL,
    content     NVARCHAR(MAX) NOT NULL,
    is_deleted  BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE post_reactions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    post_id     INT           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INT           NOT NULL,
    emoji       NVARCHAR(50)  NOT NULL,
    created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_posts_user_created
    ON posts(user_id, created_at DESC);

CREATE UNIQUE INDEX IX_post_reactions_unique
    ON post_reactions(post_id, user_id, emoji);

