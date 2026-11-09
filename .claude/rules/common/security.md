# Hướng dẫn bảo mật

## Checklist bắt buộc trước khi merge

- [ ] Không có secret hard-code (API key, password, token).
- [ ] Toàn bộ input từ user đã validate.
- [ ] Phòng SQL injection (parameterized query).
- [ ] Phòng XSS (sanitize HTML).
- [ ] Đã ràng buộc quyền sở hữu (`user_id`) và `role` đọc từ DB, không tin client.
- [ ] Thông báo lỗi không lộ thông tin nhạy cảm.

## Quản lý secret

- KHÔNG hard-code secret trong source.
- LUÔN dùng environment variable hoặc secret manager.
- Validate secret bắt buộc có ngay khi khởi động app.
- Nếu secret bị lộ → rotate ngay.

## Phản ứng khi phát hiện vấn đề bảo mật

1. DỪNG ngay.
2. Ưu tiên xử lý CRITICAL trước.
3. Rotate mọi secret đã bị lộ.
4. Quét lại codebase tìm vấn đề tương tự.
5. Document lại để tránh lặp lại.

## Nhật ký (logging)

- Không log password, token, PII (CMND, số thẻ, email đầy đủ tuỳ ngữ cảnh).
- Log đủ context để truy vết: user id, request id, thời gian.
- Stack trace chỉ ở server log, không trả về client.

## Nợ bảo mật đã biết của Pam Travel

Ghi ở đây để không ai "phát hiện lại" rồi tưởng là bug mới, và để không mô tả sai về hệ thống:

| Vấn đề | Hiện trạng | Khi nào phải nhắc user |
|---|---|---|
| Không verify token | `JWT_SECRET` khai báo nhưng không có middleware auth; endpoint tin `userId` client gửi (IDOR) | Mỗi khi thêm/sửa endpoint đụng dữ liệu người dùng hoặc tiền |
| `POST /query` legacy | `js/server.js` nhận SQL thô từ client, chỉ chặn bằng `startsWith('SELECT')` | Khi user hỏi về dọn code legacy — đề xuất xoá cùng `js/db.js` |
| CORS mở toàn bộ | `app.use(cors())` cho mọi origin | Khi bàn chuyện deploy |
| Không rate limiting | Login / OTP / payment brute-force được | Khi sửa luồng auth hoặc thanh toán |
| Session ở `sessionStorage` | XSS đọc được session | Khi bàn nâng cấp auth |

Không tự ý sửa những mục này trong một task khác — chúng là thay đổi kiến trúc, phải hỏi user. Nhưng **phải nêu** khi làm việc trong phạm vi liên quan.

Chi tiết cách viết code an toàn với ràng buộc hiện tại: [javascript/security.md](../javascript/security.md).
