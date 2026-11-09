# System Design — <Task-ID>: <Tên task>

| | |
|---|---|
| **Task ID** | <Task-01 / BR-19 / ...> |
| **Người viết** | ba-analyst |
| **Ngày** | <YYYY-MM-DD> |
| **Trạng thái** | Draft / Đã chốt bởi Leader / Đang implement / Done |
| **Nguồn yêu cầu** | `docs/BRD.md §...`, `docs/SRS.md ...`, `README.md Task ...` |

---

## 1. Mục tiêu & Phạm vi

**Mục tiêu:** <2-3 câu — task này giải quyết nhu cầu gì của ai>

**Trong phạm vi:**
- <...>

**NGOÀI phạm vi (không làm trong task này):**
- <...>

---

## 2. Vai trò liên quan

| Vai trò | Được làm gì | Ghi chú |
|---|---|---|
| CUSTOMER | | |
| DRIVER | | |
| ADMIN | | |

---

## 3. Luồng nghiệp vụ

### 3.1 Luồng chính (happy path)

1. <...>
2. <...>

### 3.2 Luồng ngoại lệ

| Tình huống | Hệ thống xử lý | Thông báo cho user (tiếng Việt) |
|---|---|---|
| | | |

### 3.3 Chuyển trạng thái

Nêu rõ trạng thái trước → sau, và điều kiện. Giá trị trạng thái lấy **đúng theo `prisma/schema.prisma`**.

```
booking: PENDING --(thanh toán thành công)--> CONFIRMED
         PENDING --(hết 5 phút, BR-01)------> CANCELLED
```

---

## 4. Business Rules áp dụng

Mọi rule **phải trích nguồn**. Rule không có trong tài liệu → đưa xuống mục 10 (BLOCKER), không tự quyết.

| Mã | Nội dung | Nguồn | Áp dụng ở đâu |
|---|---|---|---|
| BR-0x | | `docs/BRD.md §5` | |

---

## 5. Thiết kế API

### `<METHOD> /api/<domain>/<path>`

**Mục đích:** <...>

**Request**
```json
{
  "userId": 1,
  "...": "..."
}
```

**Response thành công** (`200` / `201`)
```json
{
  "success": true,
  "...": "..."
}
```

**Response lỗi**

| Status | `error` | Khi nào |
|---|---|---|
| 400 | `Thiếu thông tin ...` | |
| 403 | `Bạn không có quyền ...` | |
| 404 | `Không tìm thấy ...` | |
| 409 | `...` | xung đột trạng thái / trùng dữ liệu |

**Lưu ý kỹ thuật**
- [ ] Cần `$transaction`? (thao tác ghế/booking/payment/ví → **có**, BR-03)
- [ ] Id/tiền trả về đã `Number(...)` (BigInt/Decimal)
- [ ] Ngày parse theo `+07:00`
- [ ] Ràng buộc quyền sở hữu (`user_id` trong `where`) / kiểm `role` từ DB

---

## 6. Thiết kế dữ liệu

### 6.1 Bảng/cột liên quan (đã có)

| Bảng | Cột | Kiểu | Ghi chú |
|---|---|---|---|
| | | | |

### 6.2 Thay đổi schema (nếu có)

| Thao tác | Bảng | Cột | Kiểu | Nullable | Default |
|---|---|---|---|---|---|
| ADD COLUMN | | | | | |

- [ ] Có giá trị trạng thái mới → phải mở rộng **CHECK constraint** (xem skill `db-change`).
- [ ] Dev sinh file `sql/<YYYY-MM-DD>_<slug>.sql` **idempotent**, **user tự chạy**.
- [ ] Cập nhật `prisma/schema.prisma` khớp SQL.

> Không thay đổi schema → ghi rõ: **"Không thay đổi DB."**

---

## 7. Thiết kế UI (nếu có)

**Màn hình / view:** `frontend/src/views/<X>View.vue`

| Thành phần | Dữ liệu | Hành vi |
|---|---|---|
| | | |

- Route: `<path>` · `meta`: `requiresAuth` / `role` / `disallowRoles` / `guestOnly`
- State đặt ở: <store nào, hay `ref` trong view>
- Timer (polling/countdown)? → nêu rõ chu kỳ và điều kiện dừng

---

## 8. Ánh xạ code (gợi ý cho Dev)

| Việc | File | Ghi chú |
|---|---|---|
| Endpoint | `js/routes/<domain>.js` | thêm vào file có sẵn / tạo mới + mount `js/server.js` |
| Helper nghiệp vụ | `js/lib/<name>.js` | nhận `db` (prisma hoặc tx) làm tham số |
| Job | `js/jobs/<name>.js` | |
| Store | `frontend/src/stores/<x>Store.js` | |
| View | `frontend/src/views/<X>View.vue` | |
| Route FE | `frontend/src/router/index.js` | |

**Code có thể tái sử dụng** (BA đã `grep`):
- <file:line — mô tả>

**Code dùng chung sẽ bị chạm** (Dev phải kiểm regression):
- <file — luồng nào khác đang dùng>

---

## 9. Acceptance Criteria

Phải **đo được**, mỗi dòng Dev/Leader verify được.

| ID | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-01 | | |
| AC-02 | | |

---

## 10. Câu hỏi cần làm rõ (BLOCKER)

Còn BLOCKER chưa trả lời → **Leader không cho Dev bắt đầu**.

| # | Câu hỏi | Vì sao chặn | Người trả lời |
|---|---|---|---|
| 1 | | | user |

> Không có BLOCKER → ghi rõ: **"Không có BLOCKER."**

---

## 11. Rủi ro & Ghi chú

- **Bảo mật:** <nếu task đụng dữ liệu người dùng hoặc tiền → nêu rõ backend hiện chưa verify token, ràng buộc quyền chỉ dựa trên `userId` client gửi>
- **Hiệu năng:** <N+1, phân trang, polling>
- **Regression:** <luồng nào có thể bị ảnh hưởng>
- **Cần user chạy:** <SQL, `npx prisma generate`, restart>
