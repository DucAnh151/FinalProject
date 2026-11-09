# Quy tắc backend Express + Prisma (riêng cho dự án)

Áp dụng cho `js/` — trừ code legacy (`js/db.js`, `js/auth.js`, các route `/login`, `/register`, `/query`, `/health` nằm trực tiếp trong `js/server.js`).

## Cấu trúc 1 file route

```js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/trips/search?originId=1&destinationId=3&departureDate=2026-06-10
router.get('/search', async (req, res) => {
  const { originId, destinationId, departureDate } = req.query;

  if (!originId || !destinationId || !departureDate)
    return res.status(400).json({ error: 'Thiếu thông tin tìm kiếm' });

  try {
    // ...
    res.json({ success: true, trips: result });
  } catch (e) {
    console.error('[Trips] search error:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
```

Quy tắc:
- CommonJS (`require`/`module.exports`) — **không** dùng `import`. `package.json` gốc không có `"type": "module"`.
- Mỗi handler: validate trước → `try/catch` quanh phần DB → `res.json`.
- `module.exports = router` ở cuối, mount trong [js/server.js](../../js/server.js) với prefix `/api/<domain>`.
- Thêm file route mới → thêm đúng 2 dòng `require` + `app.use` vào `js/server.js`, đặt cạnh các route cùng nhóm.

## Response format

Thành công:
```js
res.json({ success: true, data... })        // hoặc trả trực tiếp object/array domain
res.status(201).json({ success: true, ... }) // khi tạo mới
```

Lỗi:
```js
res.status(400).json({ error: 'Thông báo tiếng Việt cho user' })
```

- Key lỗi là `error` (chuỗi), **không** phải `message`/`errors` — frontend đang đọc `err.response.data.error`.
- 400 thiếu/sai input · 401 sai thông tin đăng nhập · 403 không đủ quyền / tài khoản bị khoá · 404 không tìm thấy · 409 trùng dữ liệu · 500 lỗi server.
- Message 500 trả client luôn chung chung (`'Lỗi server'`); chi tiết đi vào `console.error`.

## BigInt (BẮT BUỘC)

Prisma map `BIGSERIAL` → `BigInt`. `js/server.js` đã patch `BigInt.prototype.toJSON`, nhưng convention của codebase là **convert tường minh khi build response**:

```js
res.json({
  id:    Number(booking.id),
  tripId: Number(booking.trip_id),
  total: Number(booking.total_amount),
});
```

Lý do: rõ ràng tại điểm trả về, không phụ thuộc global patch. `Decimal` của Prisma cũng phải `Number(...)` trước khi trả.

## Ngày/giờ — luôn theo giờ VN (+07:00)

Client gửi `YYYY-MM-DD`. Parse phải có offset `+07:00` (xem [js/routes/trips.js](../../js/routes/trips.js)) — `new Date('2026-06-10')` bị hiểu là UTC và lệch ngày với user Việt Nam.

Cột thời gian trong DB là `TIMESTAMPTZ` — so sánh bằng `Date` object, không so sánh chuỗi.

## Prisma

- Dùng Prisma Client cho code mới. Không thêm query `pg` thô; nếu bắt buộc raw thì `prisma.$queryRaw` với **tham số hoá** (`` prisma.$queryRaw`SELECT ... WHERE id = ${id}` ``), KHÔNG nối chuỗi.
- Field trong `where`/`data`/`select` là **`snake_case`** đúng theo `schema.prisma`.
- Tên quan hệ do `prisma db pull` sinh ra có thể dài và lạ (`provinces_routes_origin_province_idToprovinces`) — **đọc `prisma/schema.prisma` trước khi viết `include`**, đừng đoán tên.
- Nhiều lệnh ghi liên quan nhau → bọc `prisma.$transaction(async (tx) => { ... })` và dùng `tx` bên trong (xem [js/jobs/seatUnlocker.js](../../js/jobs/seatUnlocker.js)). Thao tác ghế/booking/payment **bắt buộc** transaction (BR-03).
- Tránh N+1: dùng `include`/`select` lồng thay vì loop gọi query. Danh sách phải có `take`/phân trang.
- `new PrismaClient()` đúng 1 lần ở đầu file route. **Không** khởi tạo trong handler.

## Không tự chạy lệnh ghi DB

`prisma db push`, `prisma migrate`, `psql`, chạy file `.sql` → **user tự chạy**. Đổi schema thì sinh file `sql/YYYY-MM-DD_<slug>.sql` idempotent (xem skill `db-change`), rồi nhắc user.

`npx prisma generate` và `npx prisma validate` thì được tự chạy (chỉ sinh client, không đụng DB).

## Secret & biến môi trường

- `process.env.*` cho mọi cấu hình. Không hard-code host/port/password/secret.
- Thêm biến môi trường mới → cập nhật [.env.example](../../.env.example) cùng lúc.
- Không log password, PIN, token, OTP, số dư đầy đủ.

## Background job

Job trong `js/jobs/`, export `start<Tên>()`, gọi từ `js/server.js`. Mẫu: `setInterval` + gọi ngay 1 lần khi khởi động, bọc toàn bộ thân job trong `try/catch` để một lần lỗi không giết interval. Log có prefix `[TênJob]`.

## Auth — trạng thái hiện tại

**Chưa có middleware verify token.** Endpoint hiện nhận `userId` từ client. Khi thêm endpoint đụng dữ liệu người dùng/tiền:

- Tối thiểu: kiểm tra bản ghi có thuộc `userId` được gửi lên không trước khi đọc/ghi (`where: { id, user_id: userId }`), và kiểm tra `role` cho endpoint admin/driver.
- Nêu rõ trong báo cáo rằng ràng buộc này vẫn bypass được vì `userId` do client gửi.
- Không viết comment hay tài liệu khẳng định endpoint "đã được bảo vệ".
