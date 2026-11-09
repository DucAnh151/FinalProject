# Pattern chung

## Dùng cái đã có trong repo trước khi viết mới

1. `grep` tìm route/helper/component đã làm việc tương tự (`js/routes/`, `js/lib/`, `frontend/src/views/`).
2. Nếu có → clone pattern đó, giữ cấu trúc nhất quán với codebase.
3. Nếu không → tìm giải pháp đã được kiểm chứng ngoài repo (xem skill `search-first`), đánh giá về bảo mật, maintain, mức phù hợp.
4. Chỉ tự viết khi hai bước trên không ra gì.

Nhất quán quan trọng hơn "đẹp hơn một chút": một pattern lạ nằm giữa 10 file cùng kiểu làm cả codebase khó đọc hơn.

## Layer của dự án

```
Request
  → js/server.js          mount route theo prefix /api/<domain>
  → js/routes/<domain>.js validate input → gọi Prisma → build response
  → js/lib/<helper>.js    logic nghiệp vụ dùng chung (nhận prisma/tx làm tham số)
  → Prisma Client         truy cập PostgreSQL
```

```
UI
  → frontend/src/views/<X>View.vue       render + xử lý tương tác
  → frontend/src/stores/<x>Store.js      state dùng chung + action gọi API
  → frontend/src/services/api.js         axios instance duy nhất
```

Giữ đúng hướng phụ thuộc: view → store → api. View **không** tự dựng request riêng; store **không** chứa logic render.

## Định dạng API Response của dự án

Convention thực tế (không phải envelope generic):

```js
// Thành công
res.json({ success: true, user: {...} })
res.json({ trips: [...] })
res.status(201).json({ success: true, bookingId: 123 })

// Lỗi — key luôn là `error`, message tiếng Việt
res.status(400).json({ error: 'Thiếu thông tin tìm kiếm' })
```

Frontend đọc `err.response?.data?.error`. Endpoint mới phải giữ đúng key `error`, nếu không UI sẽ hiện thông báo rỗng.

Danh sách có phân trang → trả kèm `total` để UI dựng pager.

## Helper nhận `prisma` hoặc `tx` làm tham số

Logic nghiệp vụ dùng chung phải chạy được cả trong và ngoài transaction:

```js
// js/lib/bookingConfirm.js
async function confirmBooking(db, bookingId) {
  // db là `prisma` hoặc `tx` — gọi được từ cả 2 ngữ cảnh
}
module.exports = { confirmBooking };
```

Đừng `require` prisma instance riêng bên trong helper — sẽ thoát ra ngoài transaction và mất tính atomic (BR-03).

## Hằng số nghiệp vụ

Mọi con số đến từ BR phải có tên và chú thích mã BR. Dùng ở nhiều file → `js/lib/constants.js` và `frontend/src/constants.js`, giữ 2 bên khớp giá trị. Chi tiết: [javascript/patterns.md](../javascript/patterns.md).

## Idempotent cho thao tác lặp

Job chạy theo interval (`seatUnlocker`, `tripCloser`) và file SQL migration phải **chạy nhiều lần cho cùng kết quả**:

- Job: điều kiện trạng thái nằm trong `where` (`status: 'PENDING'`, `locked_until: { lt: now }`) → chạy lại không làm sai dữ liệu.
- SQL: `IF NOT EXISTS` / `WHERE NOT EXISTS` / kiểm tra cột trước khi `ALTER` (xem skill `db-change`).
