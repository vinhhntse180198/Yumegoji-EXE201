-- Mẫu nhập nội dung bài học (Markdown trong cột content) + vài từ vựng.
-- Sửa @lesson_id và @category_id cho khớp DB của bạn (xem SELECT id FROM lessons / lesson_categories).

DECLARE @lesson_id INT = 1;
DECLARE @category_id INT = (SELECT category_id FROM lessons WHERE id = @lesson_id);

-- Nội dung bài: Markdown — app front-end render (vd. react-markdown).
UPDATE lessons
SET content = N'# Chào hỏi cơ bản

## Mục tiêu
- Chào buổi sáng / chiều / tối
- Tự giới thiệu tên

## Hội thoại mẫu
> A: おはようございます。  
> B: おはようございます。

## Lưu ý
Dùng **です／ます** trong ngữ cảnh lịch sự.
',
    updated_at = SYSUTCDATETIME()
WHERE id = @lesson_id;

-- Từ vựng mẫu (nếu chưa có — tránh trùng word_jp cùng lesson nếu có unique)
IF NOT EXISTS (SELECT 1 FROM vocabulary_items WHERE lesson_id = @lesson_id AND word_jp = N'おはよう')
INSERT INTO vocabulary_items (lesson_id, word_jp, reading, meaning_vi, meaning_en, example_sentence, audio_url, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'おはよう', N'ohayou', N'Chào buổi sáng (thân)', N'Good morning (casual)', N'おはよう！', NULL, 1, SYSUTCDATETIME(), SYSUTCDATETIME());

-- Kanji mẫu
IF NOT EXISTS (SELECT 1 FROM kanji_items WHERE lesson_id = @lesson_id AND character = N'朝')
INSERT INTO kanji_items (lesson_id, character, readings_on, readings_kun, meaning_vi, meaning_en, stroke_count, jlpt_level, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'朝', N'チョウ', N'あさ', N'buổi sáng', N'morning', 12, N'N5', 1, SYSUTCDATETIME(), SYSUTCDATETIME());

-- Ngữ pháp mẫu (level_id = cấp độ của category chứa bài)
DECLARE @level_id INT = (SELECT level_id FROM lesson_categories WHERE id = @category_id);
IF @level_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM grammar_items WHERE lesson_id = @lesson_id AND pattern = N'おはようございます')
INSERT INTO grammar_items (lesson_id, pattern, structure, meaning_vi, meaning_en, example_sentences, level_id, sort_order, created_at, updated_at)
VALUES (@lesson_id, N'おはようございます', NULL, N'Xin chào (buổi sáng, lịch sự)', N'Good morning (polite)', N'おはようございます、先生。', @level_id, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
