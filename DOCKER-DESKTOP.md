# Hướng dẫn Docker Desktop cho dự án Yumegoji / EXE201

## 1. Một số khái niệm nhanh

| Thuật ngữ | Ý nghĩa |
|-----------|---------|
| **Image** | Bản “cài đặt” sẵn (vd SQL Server 2022) — tải về chỉ là **chưa chạy** database. |
| **Container** | Một **máy SQL đang chạy** tạo ra từ image — ứng dụng kết nối vào **container**, không kết nối vào image. |
| **Volume** | Ổ dữ liệu để **SQL trong container không mất** khi tắt container (vd `exe201_yumegoji_mssql_data`). |

Bạn thấy image `mcr.microsoft.com/mssql/server:2022-latest` trong tab **Images** = đã sẵn sàng; cần **tạo container** (hoặc dùng Compose) thì SQL mới lắng nghe cổng.

---

## 2. Cách khuyến nghị: `docker compose` (đúng với repo này)

Mở **PowerShell** hoặc **Terminal**:

```powershell
cd E:\EXE201\EXE201
docker compose up -d
```

- `-d` = chạy nền (Docker Desktop → tab **Containers** sẽ có container, thường tên `yumegoji-sql`).
- Volume `exe201_yumegoji_mssql_data` là **bình thường** — dữ liệu SQL nằm ở đó.

**Dừng container** (giữ volume / giữ data):

```powershell
docker compose down
```

**Xem log** SQL:

```powershell
docker compose logs -f sqlserver
```

Sau khi chạy, đợi **20–40 giây** rồi mới kết nối SSMS.

---

## 3. Cách bấm **Run** từ tab Images (nếu không dùng Compose)

Khi mở **Run a new container** từ image SQL Server:

1. **Container name** (tên container — *không* phải tên database):
   - Có thể đặt: `yumegoji-sql` hoặc `yumegoji-db`  
   - **YumegojiDB** là tên **database** bên trong SQL; tạo bằng script SQL, không bắt buộc trùng tên container.

2. **Ports — Host port:** nhập **`14333`**  
   - Bên phải giữ **`1433`** (cổng trong container).  
   - Kết nối từ Windows: `localhost,14333`.

3. **Environment variables** — thêm **2 dòng** (bắt buộc):

   | Variable | Value |
   |----------|--------|
   | `ACCEPT_EULA` | `Y` |
   | `MSSQL_SA_PASSWORD` | Mật khẩu **mạnh** (vd `Yumegoji_Sql_2024!`) |

   Image SQL trên Linux **thường từ chối** mật khẩu quá yếu như `12345` → container sẽ **tự thoát**.

4. Bấm **Run** → sang tab **Containers** kiểm tra trạng thái **Running** (xanh).

**Lưu ý:** Nếu đã dùng `docker compose` trước đó, không cần Run thủ công thêm một container thứ hai trừ khi bạn biết rõ (hai container cùng map `14333` sẽ lỗi cổng).

---

## 4. Kết nối bằng SSMS / Azure Data Studio

| Trường | Giá trị |
|--------|---------|
| Server | `localhost,14333` |
| Xác thực | SQL Server Authentication |
| Login | `sa` |
| Password | Trùng với `MSSQL_SA_PASSWORD` trong Compose / form Run (mặc định compose trong repo: `Yumegoji_Sql_2024!`) |

Sau đó chạy script:

`backend\doc\sql\YumegojiDB-AllScripts.sql`

để tạo database **`YumegojiDB`** và bảng.

---

## 5. Kết nối backend .NET với SQL Docker

Trong repo đã có:

- `backend\appsettings.Docker.json` — `Server=localhost,14333`, `Database=YumegojiDB`, mật khẩu trùng compose mặc định.
- Profile **`Docker`** trong `launchSettings.json`.

Chạy API:

```powershell
cd E:\EXE201\EXE201\backend
dotnet run --launch-profile Docker
```

Swagger: `http://localhost:5056/swagger`

Nếu bạn đổi mật khẩu trong `.env` / Compose, sửa **cùng** mật khẩu trong `appsettings.Docker.json`.

---

## 6. Khác với SQL Server trên Windows (`LAPTOP-...\VINH`)

- **Windows SQL:** `Server=LAPTOP-EF9AH3K8\VINH`, `sa` / `12345` (trong `appsettings.json` khi chạy Development).
- **Docker SQL:** `Server=localhost,14333`, `sa` / mật khẩu container (không nhất thiết là `12345`).

Hai cái **song song được**; chỉ cần đúng **chuỗi kết nối** khi chạy backend.

---

## 7. Gỡ rối nhanh

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| Container **Exited** ngay sau Run | Xem **Logs**: thiếu `ACCEPT_EULA`, mật khẩu yếu, hoặc cổng bận. |
| Không kết nối được `localhost,14333` | Kiểm tra container đang **Running**; host port đúng **14333**. |
| `docker compose up` báo cổng đã dùng | Đổi trong `docker-compose.yml` thành `"14334:1433"` và sửa connection string + SSMS cho khớp. |

---

*Tài liệu tổng quan chạy dự án: [README.md](README.md).*
