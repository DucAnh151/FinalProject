# Coding Style — Quy tắc chung

## Tính bất biến (CRITICAL)

LUÔN tạo object mới, KHÔNG mutate object có sẵn:

```
SAI:   modify(original, field, value)  → đổi original tại chỗ
ĐÚNG:  update(original, field, value)  → trả về bản sao mới đã cập nhật
```

Lý do: dữ liệu bất biến tránh side-effect ẩn, dễ debug, an toàn khi concurrent.

Ngoại lệ hợp lệ: biến tích luỹ cục bộ trong 1 function (vd. mảng `result` được `push` rồi trả về) — không rò rỉ ra ngoài thì không tính là mutate.

## Nguyên tắc cốt lõi

### KISS (Keep It Simple)
- Chọn giải pháp đơn giản nhất mà hoạt động đúng.
- Tránh tối ưu sớm. Code rõ ràng quan trọng hơn code khôn ngoan.

### DRY (Don't Repeat Yourself)
- Trích logic lặp lại thành function/utility dùng chung (backend: `js/lib/`; frontend: `frontend/src/composables/` hoặc `frontend/src/utils/`).
- Tránh copy-paste rồi mỗi nơi sửa khác nhau.
- Trừu tượng hoá khi có ít nhất 2-3 chỗ thật sự lặp — không phải vì "có thể sẽ cần".

### YAGNI (You Aren't Gonna Need It)
- Không build feature/abstraction cho nhu cầu giả định trong tương lai.
- Bắt đầu đơn giản, refactor khi áp lực thực tế xuất hiện.

## Tổ chức file

NHIỀU FILE NHỎ > VÀI FILE LỚN:
- Cohesion cao, coupling thấp.
- 200-400 dòng/file là vừa, tối đa 800.
- Tách utility ra khỏi module quá lớn.
- Tổ chức theo feature/domain, không theo loại file.

> Lưu ý thực tế: [js/routes/admin.js](../../../js/routes/admin.js) đang ~780 dòng. Thêm endpoint admin mới → cân nhắc tách file theo domain (`admin/users.js`, `admin/vehicles.js`...) thay vì nối tiếp cho file phình to.

## Xử lý lỗi

LUÔN xử lý lỗi đầy đủ:
- Bắt và xử lý lỗi rõ ràng ở từng layer.
- UI: hiển thị thông báo tiếng Việt dễ hiểu cho user.
- Server: log chi tiết bối cảnh (`console.error('[Module] ...', e.message)`), trả client message chung chung.
- Không bao giờ "nuốt" lỗi im lặng (`catch {}` rỗng).

## Validate input

LUÔN validate ở biên hệ thống:
- Validate input từ user trước khi xử lý — kể cả khi UI đã validate (client có thể bị bypass).
- Fail-fast với thông báo rõ ràng: `return res.status(400).json({ error: '...' })`.
- Không tin dữ liệu ngoài (request body, query param, API response, nội dung file).

## Quy ước đặt tên

- Biến/function JS: `camelCase`, tên có nghĩa.
- Boolean: ưu tiên prefix `is`, `has`, `should`, `can`.
- Component Vue / file `.vue`: `PascalCase`.
- Hằng số: `UPPER_SNAKE_CASE`.
- Composable Vue: tiền tố `use`.
- **Cột/bảng DB và field Prisma: `snake_case`** (`full_name`, `trip_seat_status`) — đây là schema thật, không đổi. Khi trả về client thì map sang `camelCase` (`fullName`). Giữ đúng ranh giới này.

## Code smell cần tránh

### Lồng sâu
Dùng early return thay vì lồng nhiều cấp `if`.

### Magic number
Đặt tên hằng số cho ngưỡng/timing/limit có ý nghĩa — đặc biệt các con số đến từ BR (5 phút lock, 5 ghế, 10%, 60 phút, 20%). Kèm mã BR trong tên hoặc comment.

### Function quá dài
Tách thành các function nhỏ với 1 trách nhiệm rõ ràng. Handler route dài → trích phần nghiệp vụ ra `js/lib/`.

## Checklist trước khi đánh dấu xong

- [ ] Code dễ đọc, đặt tên tốt.
- [ ] Function nhỏ (<50 dòng).
- [ ] File tập trung (<800 dòng).
- [ ] Không lồng quá sâu (>4 cấp).
- [ ] Có xử lý lỗi đầy đủ.
- [ ] Không hard-code giá trị (dùng constant/config/env).
- [ ] Không mutate dữ liệu đầu vào.
- [ ] Comment (nếu có) nêu "tại sao", tham chiếu BR khi là rule nghiệp vụ.
