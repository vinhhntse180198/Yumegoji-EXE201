-- Bổ sung từ vựng số 1–10 cho bài có tiêu đề chứa "Số đếm 1-10" (khi DB thiếu sau import).
-- Chạy trên SQL Server. Kiểm tra @lesson_id trước khi chạy.

DECLARE @lesson_id INT = (
  SELECT TOP 1 id FROM lessons
  WHERE title LIKE N'%Số đếm%1%10%' OR title LIKE N'%đếm%1%10%'
  ORDER BY id
);

IF @lesson_id IS NULL
BEGIN
  RAISERROR(N'Không tìm thấy bài khớp tiêu đề. Gán thủ công: DECLARE @lesson_id INT = ...', 16, 1);
  RETURN;
END

DECLARE @base INT = ISNULL(
  (SELECT MAX(sort_order) FROM vocabulary_items WHERE lesson_id = @lesson_id),
  0
);

;WITH need(word_jp, reading, meaning_vi, sort_order) AS (
  SELECT * FROM (VALUES
    (N'いち', N'ichi', N'Một (1)', 1),
    (N'に', N'ni', N'Hai (2)', 2),
    (N'さん', N'san', N'Ba (3)', 3),
    (N'し／よん', N'shi / yon', N'Bốn (4)', 4),
    (N'ご', N'go', N'Năm (5)', 5),
    (N'ろく', N'roku', N'Sáu (6)', 6),
    (N'なな／しち', N'nana / shichi', N'Bảy (7)', 7),
    (N'はち', N'hachi', N'Tám (8)', 8),
    (N'きゅう', N'kyū', N'Chín (9)', 9),
    (N'じゅう', N'jū', N'Mười (10)', 10)
  ) AS t(word_jp, reading, meaning_vi, sort_order)
)
INSERT INTO vocabulary_items (lesson_id, word_jp, reading, meaning_vi, meaning_en, example_sentence, audio_url, sort_order, created_at, updated_at)
SELECT @lesson_id, n.word_jp, n.reading, n.meaning_vi, NULL, NULL, NULL, @base + n.sort_order, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM need n
WHERE NOT EXISTS (
  SELECT 1 FROM vocabulary_items v
  WHERE v.lesson_id = @lesson_id AND v.word_jp = n.word_jp
);
