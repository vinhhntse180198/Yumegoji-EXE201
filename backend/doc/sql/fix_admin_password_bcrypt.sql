-- Backend dùng BCrypt.Verify: cột password_hash PHẢI là chuỗi bcrypt (bắt đầu $2a$ hoặc $2b$).
-- KHÔNG được để plain text như '123456'.

-- Mật khẩu plain text tương ứng: 123456
-- (hash được tạo bằng BCrypt.Net-Next; mỗi lần HashPassword ra chuỗi khác nhưng đều hợp lệ)
UPDATE users
SET password_hash = N'$2a$11$v2rvjStCE8B3KNwXWSu4pevowO5Qngobu.PeyK0PQuYnm6AG5Wyzq',
    updated_at = SYSUTCDATETIME()
WHERE email = N'admin@yumegoji.vn';

-- Gán đúng vai moderator (nếu cần)
-- UPDATE users SET role = N'moderator', updated_at = SYSUTCDATETIME()
-- WHERE email = N'moderator@yumegoji.vn';
