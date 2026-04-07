-- Chạy trên database YumegojiDB (SQL Server) nếu bảng chưa tồn tại.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lesson_quiz_questions')
BEGIN
    CREATE TABLE lesson_quiz_questions (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        lesson_id INT NOT NULL,
        question NVARCHAR(MAX) NOT NULL,
        options_json NVARCHAR(MAX) NOT NULL,
        correct_index INT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL,
        updated_at DATETIME2 NOT NULL,
        CONSTRAINT FK_lesson_quiz_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_lesson_quiz_lesson_sort ON lesson_quiz_questions(lesson_id, sort_order);
END
