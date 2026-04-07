# YUMEGO-JI – Cấu trúc Backend (ASP.NET Core 8)

**Website Học Tiếng Nhật qua Trò Chuyện** – Cấu trúc ánh xạ theo Tài liệu đặc tả hệ thống.

---

## 1. Phần nào là API? (Tách bạch rõ)

**API** trong project này là **toàn bộ thư mục `Controllers/`** – mỗi file `*Controller.cs` tương ứng **một nhóm API** (một “vùng” endpoint). Client (web/mobile) chỉ gọi HTTP vào các URL này; không gọi trực tiếp vào Services hay Models.

| STT | Tên API (Controller) | Đường dẫn URL (route) | Mô-đun đặc tả | File trong project |
|-----|----------------------|------------------------|----------------|--------------------|
| 1 | **Auth** | `api/Auth` | Hệ thống Xác thực | `Controllers/AuthController.cs` |
| 2 | **Learning** | `api/Learning` | Hệ thống Học tập | `Controllers/LearningController.cs` |
| 3 | **Assessment** | `api/Assessment` | Hệ thống Kiểm tra | `Controllers/AssessmentController.cs` |
| 4 | **Game** | `api/Game` | Hệ thống Trò chơi | `Controllers/GameController.cs` |
| 5 | **Chat** | `api/Chat` | Hệ thống Trò chuyện | `Controllers/ChatController.cs` |
| 6 | **Social** | `api/Social` | Hệ thống Xã hội | `Controllers/SocialController.cs` |
| 7 | **Moderation** | `api/Moderation` | Hệ thống Kiểm duyệt | `Controllers/ModerationController.cs` |
| 8 | **Admin** | `api/Admin` | Hệ thống Quản trị | `Controllers/AdminController.cs` |
| 9 | **Payment** | `api/Payment` | Hệ thống Thanh toán | `Controllers/PaymentController.cs` |
| 10 | **AI** | `api/AI` | Hệ thống AI | `Controllers/AIController.cs` |

**Tóm tắt:**

- **API** = chỉ có **Controllers**. Ví dụ: `GET api/Learning/lessons`, `POST api/Auth/login` (sẽ thêm sau khi code).
- **Services** = không phải API; là lớp xử lý nghiệp vụ, được Controller gọi bên trong server.
- **Models** = không phải API; là entity/dữ liệu dùng trong server và database.
- **DTOs** = không phải API; là kiểu dữ liệu request/response của từng API (định nghĩa “hình dạng” API).

Khi triển khai, mỗi Controller sẽ có nhiều **action** (endpoint), ví dụ: `api/Auth/register`, `api/Auth/login`, `api/Learning/lessons`, … Phần đó sẽ bổ sung khi bắt đầu code.

---

## 2. Sơ đồ thư mục

```
backend/
├── Controllers/                    # API theo từng mô-đun
│   ├── AuthController.cs          # [1] Xác thực
│   ├── LearningController.cs      # [2] Học tập
│   ├── AssessmentController.cs    # [3] Kiểm tra
│   ├── GameController.cs          # [4] Trò chơi
│   ├── ChatController.cs          # [5] Trò chuyện
│   ├── SocialController.cs        # [6] Xã hội (kết bạn, hồ sơ)
│   ├── ModerationController.cs   # [7] Kiểm duyệt
│   ├── AdminController.cs         # [8] Quản trị
│   ├── PaymentController.cs       # [9] Thanh toán
│   ├── AIController.cs            # [10] AI / Chatbot
│   └── WeatherForecastController.cs
│
├── Services/                       # Business logic theo mô-đun
│   ├── Auth/                      # [1] Đăng ký, đăng nhập, xác minh email, quên mật khẩu
│   ├── Learning/                  # [2] Bài học, từ vựng, Kanji, ngữ pháp, tiến độ
│   ├── Assessment/                # [3] Kiểm tra đầu vào, kiểm tra nhanh, thi thử
│   ├── Game/                      # [4] Game, bảng xếp hạng, thành tích
│   ├── Chat/                      # [5] Phòng chat, chat riêng, nhóm, realtime
│   ├── Social/                    # [6] Kết bạn, hồ sơ, thông báo
│   ├── Moderation/                # [7] Báo cáo, cảnh cáo, khóa tài khoản
│   ├── Admin/                     # [8] Dashboard, quản lý user, doanh thu
│   ├── Payment/                   # [9] Gói Premium, vật phẩm game
│   └── AI/                        # [10] Chatbot, gợi ý lộ trình
│
├── Models/                        # Entity / bảng DB theo domain
│   ├── Auth/                      # User, Role (Guest/User/Moderator/Admin)
│   ├── Learning/                  # Lesson, Vocabulary, Kanji, Grammar, Progress
│   ├── Assessment/                # Question, PlacementTest, QuickTest
│   ├── Game/                      # Game, GameSession, Achievement, Leaderboard, PowerUp
│   ├── Chat/                      # ChatRoom, Message, RoomMember
│   ├── Social/                    # Friend, FriendRequest, Profile, Notification
│   ├── Moderation/                # Report, Warning, Mute
│   └── Payment/                   # Subscription, Transaction, PremiumPackage
│
├── DTOs/                          # Request/Response theo mô-đun
│   ├── Auth/
│   ├── Learning/
│   ├── Assessment/
│   ├── Game/
│   ├── Chat/
│   ├── Social/
│   ├── Moderation/
│   ├── Admin/
│   ├── Payment/
│   └── AI/
│
├── Data/                          # DbContext, cấu hình EF Core, migrations
├── Middleware/                    # Auth, xử lý lỗi, logging
├── appsettings.json
├── Program.cs
└── backend.csproj
```

---

## 3. Ánh xạ Đặc tả → Cấu trúc

| STT | Mô-đun đặc tả           | Controller      | Service (thư mục) | Models (gợi ý) |
|-----|--------------------------|-----------------|--------------------|----------------|
| 1   | Hệ thống Xác thực       | AuthController  | Services/Auth      | User, Role     |
| 2   | Hệ thống Học tập        | LearningController | Services/Learning | Lesson, Vocabulary, Kanji, Grammar, Progress |
| 3   | Hệ thống Kiểm tra       | AssessmentController | Services/Assessment | Question, PlacementTest, QuickTest |
| 4   | Hệ thống Trò chơi       | GameController  | Services/Game      | Game, GameSession, Achievement, Leaderboard |
| 5   | Hệ thống Trò chuyện     | ChatController  | Services/Chat      | ChatRoom, Message |
| 6   | Hệ thống Xã hội         | SocialController| Services/Social    | Friend, Profile, Notification |
| 7   | Hệ thống Kiểm duyệt     | ModerationController | Services/Moderation | Report, Warning |
| 8   | Hệ thống Quản trị       | AdminController | Services/Admin     | (dùng chung User, Report, Transaction...) |
| 9   | Hệ thống Thanh toán     | PaymentController | Services/Payment | Subscription, Transaction |
| 10  | Hệ thống AI             | AIController    | Services/AI        | (tích hợp API bên ngoài) |

---

## 4. Vai trò và quyền (đặc tả)

- **Guest**: Xem trang chủ, nội dung giới hạn, bảng xếp hạng; không chat, không game, không AI.
- **User**: Đầy đủ học tập, game, chat, kết bạn, hồ sơ, chatbot, báo cáo.
- **Moderator**: Dashboard kiểm duyệt, quản lý báo cáo, xử lý vi phạm, giám sát chat, quản lý nội dung học tập.
- **Admin**: Dashboard tổng quan, quản lý user/nội dung/game/kiểm duyệt/doanh thu/hệ thống.

Khi code: dùng **Middleware** hoặc **Authorization Policy** (Role: Guest, User, Moderator, Admin) bảo vệ từng Controller/action.

---

## 5. Gợi ý thứ tự triển khai

1. **Auth** – Đăng ký, đăng nhập, JWT, Role → có User và phân quyền.
2. **Models + Data** – DbContext, bảng User, Role, Lesson, Vocabulary, … (EF Core).
3. **Learning** – API bài học, từ vựng, Kanji, ngữ pháp, tiến độ.
4. **Assessment** – Kiểm tra đầu vào (30 câu), kiểm tra nhanh.
5. **Game** – API game, điểm, combo, power-ups, thành tích.
6. **Chat** – API phòng chat, tin nhắn (realtime dùng SignalR sau).
7. **Social** – Kết bạn, hồ sơ, thông báo.
8. **Moderation** – Báo cáo, cảnh cáo, mute/khóa.
9. **Admin** – Dashboard, CRUD user/nội dung, thống kê.
10. **Payment** – Gói Premium, giao dịch (tích hợp cổng thanh toán sau).
11. **AI** – Chatbot (tích hợp API AI bên ngoài).

---

## 6. Chạy dự án

- **Visual Studio**: F5 hoặc Run.
- **CLI**: `dotnet run` trong thư mục chứa `backend.csproj`.
- **Swagger**: `https://localhost:<port>/swagger` (môi trường Development).

Hiện tại tất cả Controller/Service chỉ là placeholder (không logic). Bước tiếp theo: thêm Entity trong `Models/`, DTO trong `DTOs/`, và implement từng Service + Controller theo đặc tả.
