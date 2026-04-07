-- ============================================================
-- Sửa FK messages.conversation_id → khớp API Chat (chat_rooms)
-- Lỗi: FK trỏ dbo.conversations trong khi backend dùng dbo.chat_rooms.
-- Chạy trên đúng database (vd: YumegojiDB). Nên backup trước.
-- ============================================================
USE YumegojiDB;
GO

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Messages_conversations_conversation_id'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages DROP CONSTRAINT FK_Messages_conversations_conversation_id;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_messages_conversation_id_chat_rooms'
      AND parent_object_id = OBJECT_ID(N'dbo.messages'))
BEGIN
    ALTER TABLE dbo.messages
    ADD CONSTRAINT FK_messages_conversation_id_chat_rooms
    FOREIGN KEY (conversation_id) REFERENCES dbo.chat_rooms (id);
END
GO

-- ========== Kiểm tra sau khi chạy (chạy từng khối SELECT) ==========
-- 1) Mọi FK từ bảng messages (mong đợi có FK_messages_conversation_id_chat_rooms -> chat_rooms):
SELECT name, OBJECT_NAME(referenced_object_id) AS bang_tham_chieu
FROM sys.foreign_keys
WHERE parent_object_id = OBJECT_ID(N'dbo.messages');

-- 2) Tin “mồ côi”: conversation_id không có trong chat_rooms — phải 0 dòng trước khi ADD FK thành công:
SELECT m.id, m.conversation_id
FROM dbo.messages AS m
LEFT JOIN dbo.chat_rooms AS r ON r.id = m.conversation_id
WHERE r.id IS NULL;

-- 3) Phòng id=4 (test Swagger /api/Chat/rooms/4/...):
SELECT id, name, type FROM dbo.chat_rooms WHERE id = 4;
GO
