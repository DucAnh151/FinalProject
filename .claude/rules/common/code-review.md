# Tiêu chuẩn Code Review

## Mục đích
Đảm bảo chất lượng, bảo mật và khả năng bảo trì trước khi merge.

## Khi nào phải review

BẮT BUỘC review khi:
- Vừa viết hoặc sửa code.
- Code đụng vào auth, payment, dữ liệu người dùng.
- Có thay đổi kiến trúc.
- Trước khi merge PR.

Trước khi xin review:
- Backend: `node --check` sạch trên file vừa sửa.
- Frontend: `npm run dev` / `npm run build` trong `frontend/` không lỏi.
- Đã giải quyết hết conflict; branch đã update với target branch.

(Dự án không có CI — không có check tự động nào chặn merge.)

## Checklist code

- [ ] Đặt tên rõ ràng, dễ đọc.
- [ ] Function tập trung (<50 dòng).
- [ ] File cohesive (<800 dòng).
- [ ] Không lồng quá sâu (>4 cấp).
- [ ] Lỗi được xử lý rõ ràng.
- [ ] Không hard-code secret/credential.
- [ ] Không có `console.log`/lệnh debug bỏ sót.
- [ ] Comment (nếu có) nêu "tại sao", tham chiếu mã BR khi là rule nghiệp vụ.
- [ ] Đúng BR liên quan (đọc `docs/BRD.md` §5 trước khi sửa logic nghiệp vụ).

## Khi nào DỪNG để review bảo mật riêng

- Code authentication / authorization.
- Xử lý input từ user.
- Truy vấn database.
- Thao tác file system.
- Gọi API bên ngoài.
- Crypto / xử lý token.
- Tính năng thanh toán / tài chính.

→ Dùng skill `security-review`.

## Mức độ nghiêm trọng

| Mức | Ý nghĩa | Hành động |
|-----|--------|-----------|
| CRITICAL | Lỗ hổng bảo mật, nguy cơ mất dữ liệu | **CHẶN** — phải fix trước khi merge |
| HIGH | Bug hoặc vấn đề chất lượng nghiêm trọng | **CẢNH BÁO** — nên fix trước merge |
| MEDIUM | Vấn đề bảo trì | **THÔNG TIN** — cân nhắc fix |
| LOW | Style, gợi ý nhỏ | **GHI CHÚ** — tuỳ chọn |

## Quy trình review

1. Đọc `git diff` để hiểu thay đổi.
2. Kiểm tra checklist bảo mật trước.
3. Kiểm tra checklist chất lượng code.
4. Đọc BR liên quan trong `docs/BRD.md` §5 để đối sánh.
5. Review tĩnh (dự án chưa có test — xem `javascript/testing.md`); đề xuất lệnh/thao tác user tự verify.
6. Dùng agent phù hợp cho review chi tiết.

## Lỗi thường gặp cần bắt

### Bảo mật
- Secret hard-code (API key, password, token).
- SQL injection (nối chuỗi vào query).
- XSS (chưa escape input người dùng).
- Path traversal (chưa sanitize đường dẫn).
- Thiếu CSRF protection.
- Bypass authentication / thiếu ràng buộc quyền sở hữu (`user_id`) trong query — xem `javascript/security.md`.

### Chất lượng
- Function lớn (>50 dòng) → tách nhỏ.
- File lớn (>800 dòng) → trích module.
- Lồng sâu (>4 cấp) → early return.
- Thiếu xử lý lỗi.
- Mutation thay vì immutable.
- `BigInt` chưa convert → `JSON.stringify` throw 500.
- Ngày parse không có offset `+07:00` → lệch ngày.

### Hiệu năng
- N+1 query → dùng `include`/`select` lồng của Prisma thay vì loop query.
- Thiếu phân trang → thêm LIMIT.
- Query không giới hạn → thêm ràng buộc.
- Thiếu cache cho thao tác đắt.

## Tiêu chí chấp thuận

- **Approve**: không có CRITICAL hoặc HIGH.
- **Warning**: chỉ có HIGH (merge cẩn trọng).
- **Block**: có CRITICAL.
