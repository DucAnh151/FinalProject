# Hướng dẫn bảo mật

## Checklist bắt buộc trước khi merge

- [ ] Không có secret hard-code (API key, password, token).
- [ ] Toàn bộ input từ user đã validate.
- [ ] Phòng SQL injection (parameterized query).
- [ ] Phòng XSS (sanitize HTML).
- [ ] Có CSRF protection.
- [ ] Đã verify authentication / authorization.
- [ ] Có rate limiting trên endpoint.
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
