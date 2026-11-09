# Coding Style — Quy tắc chung

## Tính bất biến (CRITICAL)

LUÔN tạo object mới, KHÔNG mutate object có sẵn:

```
SAI:   modify(original, field, value)  → đổi original tại chỗ
ĐÚNG:  update(original, field, value)  → trả về bản sao mới đã cập nhật
```

Lý do: dữ liệu bất biến tránh side-effect ẩn, dễ debug, an toàn khi concurrent.

## Nguyên tắc cốt lõi

### KISS (Keep It Simple)
- Chọn giải pháp đơn giản nhất mà hoạt động đúng.
- Tránh tối ưu sớm. Code rõ ràng quan trọng hơn code khôn ngoan.

### DRY (Don't Repeat Yourself)
- Trích logic lặp lại thành function/utility dùng chung.
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

## Xử lý lỗi

LUÔN xử lý lỗi đầy đủ:
- Bắt và xử lý lỗi rõ ràng ở từng layer.
- UI: hiển thị thông báo dễ hiểu cho user.
- Server: log chi tiết bối cảnh.
- Không bao giờ "nuốt" lỗi im lặng.

## Validate input

LUÔN validate ở biên hệ thống:
- Validate input từ user trước khi xử lý.
- Dùng schema validation khi có thể (Zod, Bean Validation).
- Fail-fast với thông báo rõ ràng.
- Không tin dữ liệu ngoài (API response, file content, user input).

## Quy ước đặt tên

- Biến/function: `camelCase`, tên có nghĩa.
- Boolean: ưu tiên prefix `is`, `has`, `should`, `can`.
- Interface/type/component: `PascalCase`.
- Hằng số: `UPPER_SNAKE_CASE`.
- Custom hook (Vue composable): tiền tố `use`.

## KHÔNG comment code (BẮT BUỘC)

KHÔNG viết comment trong code mới — mọi ngôn ngữ, mọi phần: Java (`//`, `/* */`, Javadoc), TS/JS/Vue script (`//`, `/* */`), Vue template/HTML (`<!-- -->`), SQL (`--`, `/* */`).

- Code tự diễn giải bằng tên hàm/biến/hằng rõ ràng thay cho comment.
- Cần giải thích quyết định/nghiệp vụ → ghi vào System Design (`docs/tasks/...`) hoặc memory, KHÔNG ghi trong code.
- Ngoại lệ DUY NHẤT (directive tooling, không phải comment giải thích): `// eslint-disable-next-line`, `// @ts-ignore`, `@SuppressWarnings` — chỉ giữ khi cần cho build/lint.
- Chỉ áp cho code mới viết/sửa; KHÔNG đi xoá comment code cũ ngoài phạm vi task (giữ diff tối thiểu).

## Code smell cần tránh

### Lồng sâu
Dùng early return thay vì lồng nhiều cấp `if`.

### Magic number
Đặt tên hằng số cho ngưỡng/timing/limit có ý nghĩa.

### Function quá dài
Tách thành các function nhỏ với 1 trách nhiệm rõ ràng.

## Checklist trước khi đánh dấu xong

- [ ] Code dễ đọc, đặt tên tốt.
- [ ] Function nhỏ (<50 dòng).
- [ ] File tập trung (<800 dòng).
- [ ] Không lồng quá sâu (>4 cấp).
- [ ] Có xử lý lỗi đầy đủ.
- [ ] Không hard-code giá trị (dùng constant/config).
- [ ] Không mutate dữ liệu (theo pattern bất biến).
