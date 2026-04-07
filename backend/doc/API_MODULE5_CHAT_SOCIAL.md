# Module 5 – Chat & kết bạn (mapping yêu cầu đề tài)

## 5.1 Phòng chat (bảng `chat_rooms`; `messages.room_id` → `chat_rooms.id`, `messages.user_id` → `users.id` — theo `yumegoji-schema-sqlserver.sql`)

| Yêu cầu | Cách map DB / API |
|--------|-------------------|
| Phòng chung, N5/N4/N3, chủ đề… | `type` = `public` \| `level` \| `group`, `level_id` (N5/N4/N3), `slug` (vd: `jlpt-prep`, `free-chat`). Seed dữ liệu theo `ChatRoomCatalog` (`GET /api/Chat/room-catalog`). |
| Lọc phòng | `GET /api/Chat/public-rooms?type=&slug=&levelId=` |

## 5.2 Tính năng chat

| Tính năng | REST API / ghi chú |
|-----------|-------------------|
| Tin nhắn thời gian thực | **SignalR** `/hubs/chat` — sau khi kết nối JWT, gọi `JoinRoom(roomId)`; server emit `ReceiveMessage`, `MessageUpdated`, `MessageDeleted`, `MemberRemoved`. WebSocket: thêm query `?access_token=<jwt>`. |
| Online trong phòng | `GET /api/Chat/rooms/{roomId}/presence` — đếm `user_online_status.status = online` trong thành viên phòng. |
| Lịch sử (cuộn lên) | `GET /api/Chat/rooms/{roomId}/messages?cursor=&limit=` |
| Emoji / icon | `type` = `emoji` hoặc text có emoji; reaction: `POST/DELETE .../messages/{id}/reactions` (bảng `message_reactions`). |
| Ảnh / file | `type` = `image` \| `file`, `content` = JSON `{ "url":"...", "name":"...", "sizeBytes":123 }` (theo quy ước app). |
| Mention @username | Lưu trong `content` dạng text — không bảng riêng. |
| Reaction (like, love…) | `emoji` trong body: `like`, `love`, `haha`, … |
| Ghim (moderator) | `POST/DELETE .../messages/{id}/pin` — role phòng `moderator`/`admin` hoặc role hệ thống `moderator`/`admin`. |
| Reply | `replyToId` trong `SendMessageRequest`. |
| Chia sẻ bài học / thành tích | `type` = `lesson_share` \| `achievement_share`, `content` = JSON metadata. |
| Sticker (game) | `type` = `sticker`, `content` = JSON `{ "stickerId": ... }`. |

**Cảnh báo từ khóa:** `POST .../messages` trả `sensitiveKeywordMatches` (bảng `sensitive_keywords`).

## 5.3 Kết bạn

| Tính năng | API |
|-----------|-----|
| Lời mời / chấp nhận / từ chối / hủy | `/api/Social/friend-requests...` |
| Hủy kết bạn | `DELETE /api/Social/friends/{friendId}` |
| Danh sách bạn + online | `GET /api/Social/friends` (có `isOnline`, `lastSeenAt`) + `POST /api/Social/presence` để cập nhật trạng thái |
| Chặn | `/api/Social/blocks...` |
| Báo cáo người dùng | `POST /api/Moderation/reports` (`reportedUserId`) |
| Gợi ý kết bạn | `GET /api/Social/friends/suggestions` (cùng `level_id`) |
| Tìm kiếm | `GET /api/Social/users/search?q=` |

## 5.4 Chat riêng

| Tính năng | API |
|-----------|-----|
| 1-1 | `POST /api/Chat/direct` |
| Nhóm ≤10 | `POST /api/Chat/rooms` với `type=group` (mặc định `max_members=10` nếu không gửi). |
| Tên / avatar nhóm | `PUT /api/Chat/rooms/{id}` |
| Mời thêm | `POST /api/Chat/rooms/{id}/invite` (bạn bè, admin phòng). |
| Tạo nhóm kèm thành viên | `POST /api/Chat/rooms` body `initialMemberIds: [ ... ]` (chỉ `type=group`, bạn bè, không vượt `max_members`). |
| Kick thành viên | `DELETE /api/Chat/rooms/{roomId}/members/{userId}` (admin nhóm, không dùng cho private 1-1). |
| Rời / giải tán | `POST .../leave`, `DELETE .../rooms/{id}` (admin). |

## 5.5 An toàn & kiểm duyệt

| Tính năng | API / bảng |
|-----------|------------|
| Báo cáo tin nhắn | `POST /api/Moderation/reports` (`messageId`, `roomId`, `type`, …) |
| Từ khóa nhạy cảm | `sensitive_keywords` + cảnh báo khi gửi tin |
| Moderator xóa tin | `DELETE /api/Chat/rooms/{roomId}/messages/{messageId}/moderate` |
| Chặn / báo cáo quấy rối | Social blocks + Moderation reports |
| Lịch sử cảnh cáo | `GET /api/Moderation/warnings/me` (`warnings`) |

---

**Lưu ý:** `level_id` trong catalog mặc định 1,2,3 — cần khớp bảng `levels` sau khi seed DB.

---

## So sánh với tham khảo (action-based, không CRUD cứng)

Ý **không nên CRUD cứng cho chat** là đúng: nghiệp vụ là **hành động** (join, send, react, recall, report) + **lưu trữ** qua REST; **realtime** nên qua **SignalR** (push tin/presence), không lấy `GET` liên tục.

Dưới đây là **map tham khảo → API hiện tại** (cùng chức năng, khác đường dẫn / chi tiết):

### Phòng

| Tham khảo | API hiện tại | Ghi chú |
|-----------|--------------|---------|
| `GET /api/rooms` (public/level + online_count) | `GET /api/Chat/public-rooms` + (tuỳ chọn) `GET .../rooms/{id}/presence` | `online_count` nằm ở endpoint **presence**; có thể gộp vào DTO phòng sau nếu cần. |
| `GET /api/rooms/{roomId}` | `GET /api/Chat/public-rooms/{roomId}` (chưa join) hoặc `GET /api/Chat/rooms/{roomId}` (đã là member) | Hai luồng: xem catalog vs thành viên. |
| `POST .../join` / `leave` | `POST /api/Chat/rooms/{roomId}/join` · `POST .../leave` | Khớp. |

### Tin nhắn

| Tham khảo | API hiện tại | Ghi chú |
|-----------|--------------|---------|
| `GET .../messages` (pagination/cursor) | `GET /api/Chat/rooms/{roomId}/messages?cursor=&limit=` | Cursor theo `id` tin — khớp. |
| `POST .../messages` | `POST /api/Chat/rooms/{roomId}/messages` | Body: `content`, `type`, `replyToId`. |
| `DELETE /api/messages/{messageId}` | `DELETE /api/Chat/rooms/{roomId}/messages/{messageId}` | **Có `roomId`** — tránh nhầm tin giữa các phòng; vẫn là soft-delete DB. |
| `POST .../reactions` (toggle) | `POST` + `DELETE` …`/reactions` | Tham khảo toggle một endpoint; hiện tại **thêm / xóa** tách bạch (đủ dùng). |
| `POST .../pin` | `POST` + `DELETE` …`/messages/{id}/pin` | Khớp (moderator/admin). |

### Bạn bè

| Tham khảo | API hiện tại | Ghi chú |
|-----------|--------------|---------|
| `GET /api/users/search?q=` | `GET /api/Social/users/search?q=` | Khớp (prefix `Social`). |
| `GET /api/friends` | `GET /api/Social/friends` | Khớp; kèm online trong DTO. |
| `GET /api/friends/suggestions` | `GET /api/Social/friends/suggestions` | Khớp (cùng `level_id`). |
| `GET /api/friends/requests` (nhận + gửi) | `GET .../friend-requests/incoming` + `.../outgoing` | **Tách 2 endpoint** thay vì một; rõ ràng hơn cho UI. |
| `POST .../friends/requests` | `POST /api/Social/friend-requests` body `toUserId` | Khớp. |
| `PUT .../requests/{id}` action accept/reject | `POST .../accept` · `POST .../reject` | Cùng nghiệp vụ, **REST style khác** (không bắt buộc đổi nếu frontend đã gắn). |
| `DELETE /api/friends/{friendId}` | `DELETE /api/Social/friends/{friendId}` | Khớp. |
| `GET /api/friends/online-status` | `GET /api/Social/friends` + `POST /api/Social/presence` | Online gộp trong **friends**; client cập nhật **presence**. |

### Chat riêng / nhóm

| Tham khảo | API hiện tại | Ghi chú |
|-----------|--------------|---------|
| `POST /api/rooms/private` | `POST /api/Chat/direct` body `peerUserId` | Cùng ý “tạo/lấy phòng 1-1”. |
| `POST /api/rooms/group` + `member_ids[]` | `POST /api/Chat/rooms` (`type=group`) + `POST .../invite` từng người | Tham khảo tạo kèm danh sách; hiện tại **tạo phòng rồi mời** (đủ max 10). |
| `PUT /api/rooms/{roomId}` | `PUT /api/Chat/rooms/{roomId}` | Khớp. |
| `POST .../members` | `POST .../invite` | Khớp ý mời. |
| `DELETE .../members/{userId}` | `DELETE /api/Chat/rooms/{roomId}/members/{userId}` | Admin nhóm kick; tự rời vẫn dùng `POST .../leave`. |

### An toàn

| Tham khảo | API hiện tại | Ghi chú |
|-----------|--------------|---------|
| `POST /api/reports` | `POST /api/Moderation/reports` | Khớp (prefix `Moderation`). |
| `POST /api/users/{id}/block` | `POST /api/Social/blocks` body `blockedUserId` | Cùng bảng `blocked_users`. |
| `DELETE .../block` | `DELETE /api/Social/blocks/{blockedUserId}` | Khớp. |

### Realtime (bắt buộc cho “thời gian thực”)

- REST chỉ **lưu DB** + **đồng bộ lịch sử** khi vào phòng.
- **SignalR:** hub `/hubs/chat` — sau `POST .../messages` server **broadcast** `ReceiveMessage` tới group `chat_room_{roomId}` (client phải `JoinRoom`).

### Từ khóa nhạy cảm (tham khảo: chặn / auto-report)

- Hiện tại: **cảnh báo** (`sensitiveKeywordMatches`) + vẫn lưu tin (có thể đổi policy: chặn gửi hoặc tạo `reports` tự động nếu cần khớp đề).

---

## Gợi ý tích hợp frontend & phân loại lỗi

| Hiện tượng | Phía nào? | Ý nghĩa |
|-------------|-----------|---------|
| **500** trên `POST/GET .../api/Chat/...` | Backend / DB | Request tới server nhưng exception (bảng thiếu, FK, chưa migration, v.v.). Xem log ASP.NET. |
| **net::ERR_CONNECTION_REFUSED** | Môi trường | Không có process lắng nghe URL đó (backend tắt, **sai cổng**: API mặc định project là **`http://localhost:5056`**, không phải 8080/8888 trừ khi bạn cấu hình lại). |
| **404** trên Chat | Frontend thường gặp | Sai path: dùng **`/api/Chat/public-rooms`** (gạch ngang), **không** dùng `public_rooms`. Lọc theo cấp: `type=level` + **`levelId=1`** (số), không dùng `type=level1`. |

**Việc nên làm:** chạy `dotnet run` (profile **http** → cổng **5056**); frontend/Vite **proxy** `/api` → `5056` hoặc set base URL đúng. Trước khi gọi tin nhắn: user phải **`POST .../join`** (phòng public) hoặc đã là thành viên. Gửi tin: body JSON camelCase `content`, `type` (vd. `"text"`, không dùng literal `"string"`), `replyToId` bỏ qua hoặc `null` nếu không trả lời tin (không gửi `0`).

**Cột bảng `messages` khác script chuẩn:** file `yumegoji-schema-sqlserver.sql` dùng **`room_id`** + **`user_id`**. Nếu DB của bạn có **`conversation_id`** / **`sender_id`** (kiểu migrate/Moji), cấu hình trong `appsettings` (hoặc `appsettings.Development.json`):

- `Yumegoji:MessagesRoomColumn` = `conversation_id` hoặc `room_id`
- `Yumegoji:MessagesAuthorColumn` = `sender_id` hoặc `user_id`

Giá trị `conversation_id` phải trùng **`id` của `chat_rooms`** (cùng ý nghĩa phòng chat).

**Lỗi FK `FK_Messages_conversations_conversation_id` → `conversations`:** đây là **schema DB** (không phải frontend). SQL Server đang bắt `conversation_id` tồn tại trong bảng **`conversations`**, trong khi API tạo/lấy phòng từ **`chat_rooms`**. Cách xử lý: sửa FK trong SQL để `conversation_id` tham chiếu **`chat_rooms(id)`** — xem script `doc/sql/fix_messages_conversation_fk_to_chat_rooms.sql` (chạy SSMS, chỉnh `USE` đúng DB). Trước đó cần dữ liệu sạch: mọi `conversation_id` trong `messages` phải là `id` có thật trong `chat_rooms`.

---

**Kết luận:** Thiết kế tham khảo và code hiện tại **cùng hướng action + persistence**; khác chủ yếu **prefix route** (`Chat` / `Social` / `Moderation`) và vài lựa chọn (cursor, `roomId` trong URL tin, tách incoming/outgoing). **Không bắt buộc** đổi toàn bộ sang đúng path `/api/rooms` trừ khi muốn thống nhất tài liệu — có thể thêm **controller facade** hoặc **rewrite** sau.
