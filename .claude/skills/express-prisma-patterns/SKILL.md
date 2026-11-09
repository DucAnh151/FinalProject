---
name: express-prisma-patterns
description: Pattern backend cho Pam Travel — cấu trúc route Express, Prisma Client, transaction chống double booking, background job, xử lý BigInt và timezone VN. Dùng khi làm việc trong js/ (routes, lib, jobs, server.js).
---

# Express + Prisma Patterns

Pattern cho backend `js/` của Pam Travel. Đọc cùng [.claude/rules/express-prisma-style.md](../../rules/express-prisma-style.md).

## Khi nào dùng

- Thêm/sửa endpoint trong `js/routes/*.js`.
- Viết helper nghiệp vụ trong `js/lib/`.
- Thêm/sửa background job trong `js/jobs/`.
- Xử lý concurrency (ghế, ví, thanh toán).

## Cấu trúc route

```js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/trips/search?originId=1&destinationId=3&departureDate=2026-06-10
router.get('/search', async (req, res) => { /* ... */ });

// GET /api/trips/:id/seats
router.get('/:id/seats', async (req, res) => { /* ... */ });

module.exports = router;
```

**Thứ tự khai báo quan trọng:** route tĩnh (`/search`, `/me`, `/stats`) phải đứng **trước** route có param (`/:id`) trong cùng method, nếu không Express khớp `/:id` trước và route tĩnh không bao giờ chạy.

## Handler: validate → try → response

```js
router.post('/', async (req, res) => {
  const { userId, tripId, seatIds } = req.body;

  // 1. Validate ngoài try — lỗi input là 400, không phải 500
  if (!userId || !tripId || !Array.isArray(seatIds) || !seatIds.length)
    return res.status(400).json({ error: 'Thiếu thông tin đặt vé' });
  if (seatIds.length > MAX_SEATS_PER_BOOKING)
    return res.status(400).json({ error: `Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế` });   // BR-02

  try {
    // 2. Nghiệp vụ
    const booking = await createBooking({ userId, tripId, seatIds });

    // 3. Response — convert BigInt/Decimal tường minh
    res.status(201).json({
      success:   true,
      bookingId: Number(booking.id),
      total:     Number(booking.total_amount),
      expiresAt: booking.expires_at,
    });
  } catch (e) {
    console.error('[Bookings] create error:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});
```

Mã trạng thái: 400 thiếu/sai input · 401 sai đăng nhập · 403 không đủ quyền / bị khoá · 404 không tìm thấy · 409 trùng dữ liệu hoặc xung đột trạng thái · 500 lỗi server.

## BigInt & Decimal (bẫy số 1)

Prisma trả `BigInt` cho `BIGSERIAL` và `Decimal` cho `NUMERIC`. `JSON.stringify` **throw** với `BigInt`.

```js
// SAI — trả thẳng record Prisma → 500 "Do not know how to serialize a BigInt"
res.json(booking);

// ĐÚNG — map tường minh
res.json({
  id:        Number(booking.id),
  userId:    Number(booking.user_id),
  total:     Number(booking.total_amount),
  status:    booking.status,
});
```

`js/server.js` có patch `BigInt.prototype.toJSON` làm lưới an toàn, nhưng **không dựa vào nó** — map tường minh để rõ hợp đồng API và tránh lộ cột không muốn trả.

Chiều ngược lại: `BigInt(id)` khi query, và chỉ sau khi đã verify `id` là số (`BigInt('abc')` throw → 500).

## Timezone VN (bẫy số 2)

```js
// SAI — '2026-06-10' bị hiểu là UTC, lệch 7 tiếng
const start = new Date(departureDate);

// ĐÚNG — theo giờ VN
const start = new Date(`${departureDate}T00:00:00+07:00`);
const end   = new Date(`${departureDate}T23:59:59+07:00`);
end.setDate(end.getDate() + 1);
```

Mốc thời gian tương đối tính từ `Date.now()`:
```js
const minDeparture = new Date(Date.now() + TRIP_CLOSE_MINUTES * 60 * 1000);   // BR-06
const lockUntil    = new Date(Date.now() + SEAT_LOCK_MINUTES * 60 * 1000);    // BR-01
```

## Transaction chống double booking (BR-03)

Chốt chống race condition là **điều kiện trạng thái nằm trong `where` của lệnh ghi**, không phải check trước rồi ghi sau.

```js
// SAI — có khe hở giữa đọc và ghi, 2 request cùng lúc đều thấy AVAILABLE
const seats = await prisma.trip_seat_status.findMany({
  where: { trip_id: tripId, seat_id: { in: seatIds }, status: 'AVAILABLE' }
});
if (seats.length !== seatIds.length) return res.status(409).json({ error: 'Ghế đã có người chọn' });
await prisma.trip_seat_status.updateMany({ /* ... */ });

// ĐÚNG — điều kiện trong where + kiểm tra count, tất cả trong transaction
const lockUntil = new Date(Date.now() + SEAT_LOCK_MINUTES * 60 * 1000);

const booking = await prisma.$transaction(async (tx) => {
  const locked = await tx.trip_seat_status.updateMany({
    where: {
      trip_id: BigInt(tripId),
      seat_id: { in: seatIds.map(BigInt) },
      status:  'AVAILABLE',
    },
    data: { status: 'LOCKED', locked_until: lockUntil, locked_by_user_id: BigInt(userId) },
  });

  if (locked.count !== seatIds.length)
    throw new ConflictError('Một số ghế đã có người khác chọn');

  return tx.bookings.create({ data: { /* ... */ } });
});
```

Quy tắc transaction:
- Dùng **`tx`** cho mọi lệnh bên trong. Lỡ dùng `prisma` là thoát ra ngoài transaction → mất tính atomic.
- Helper gọi trong transaction phải nhận `db` làm tham số (`confirmBooking(tx, id)`), không tự `require` prisma riêng.
- Throw trong callback → Prisma tự rollback. Bắt ở `catch` ngoài, map sang 409.
- Giữ transaction **ngắn**. Không gọi HTTP bên ngoài, không `await` việc chậm bên trong.
- Thao tác ví/thanh toán cũng phải atomic (BR-09 — số dư không âm): trừ ví và ghi `wallet_transactions` trong cùng transaction, kiểm tra số dư bằng điều kiện trong `where`.

## Tránh N+1

```js
// SAI — 1 + N query
const trips = await prisma.trips.findMany({ where: { status: 'OPEN' } });
for (const t of trips) {
  t.operator = await prisma.operators.findUnique({ where: { id: t.operator_id } });
}

// ĐÚNG — 1 query
const trips = await prisma.trips.findMany({
  where: { status: 'OPEN' },
  include: {
    operators: true,
    vehicles:  { include: { vehicle_types: true } },
    routes:    {
      include: {
        provinces_routes_origin_province_idToprovinces:      true,
        provinces_routes_destination_province_idToprovinces: true,
      }
    },
  },
  orderBy: { departure_time: 'asc' },
  take: 50,
});
```

Tên quan hệ do `prisma db pull` sinh ra rất dài khi có nhiều FK về cùng bảng — **đọc `prisma/schema.prisma` trước**, đừng đoán.

Dùng `select` thay `include` khi chỉ cần vài cột (nhẹ hơn, không lộ cột nhạy cảm như `password_hash`).

## Phân trang

```js
const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

const [rows, total] = await Promise.all([
  prisma.bookings.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { created_at: 'desc' } }),
  prisma.bookings.count({ where }),
]);

res.json({ total, page, limit, bookings: rows.map(toBookingDto) });
```

Mọi endpoint trả danh sách **phải** có `take` — danh sách không giới hạn sẽ chết khi dữ liệu lớn.

## Helper nghiệp vụ trong `js/lib/`

```js
// js/lib/refund.js
const CANCEL_FEE_RATE = 0.1;   // BR-04

function calcRefund(totalAmount) {
  const fee = Math.round(totalAmount * CANCEL_FEE_RATE);
  return { fee, refund: totalAmount - fee };
}

async function refundToWallet(db, userId, amount) {
  // db là `prisma` hoặc `tx`
  await db.users.update({
    where: { id: BigInt(userId) },
    data:  { wallet_balance: { increment: amount } },
  });
  await db.wallet_transactions.create({ data: { /* ... */ } });
}

module.exports = { calcRefund, refundToWallet, CANCEL_FEE_RATE };
```

- Nhận `db` làm tham số đầu → dùng được cả trong và ngoài transaction.
- Dùng `{ increment: n }` / `{ decrement: n }` của Prisma cho số dư — atomic hơn đọc-rồi-ghi.
- Hàm tính toán thuần (như `calcRefund`) tách riêng → dễ verify và dễ test khi dự án có test.

## Background job

```js
// js/jobs/<tên>.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INTERVAL_MS = 60 * 1000;

async function doWork() {
  try {
    const now = new Date();
    // Điều kiện trạng thái trong where → chạy lại an toàn (idempotent)
    const result = await prisma.trip_seat_status.updateMany({
      where: { status: 'LOCKED', locked_until: { lt: now } },
      data:  { status: 'AVAILABLE', locked_until: null, locked_by_user_id: null },
    });
    if (result.count) console.log(`[TênJob] Xử lý ${result.count} bản ghi lúc ${now.toISOString()}`);
  } catch (e) {
    console.error('[TênJob] Loi:', e.message);
  }
}

function startJob() {
  console.log('[TênJob] Da khoi dong - chay moi 60 giay');
  setInterval(doWork, INTERVAL_MS);
  doWork();
}

module.exports = { startJob };
```

Quy tắc job:
- `try/catch` bọc **toàn bộ** thân job — một lần throw không bắt sẽ không giết `setInterval`, nhưng unhandled rejection làm log nhiễu và có thể crash process ở Node mới.
- **Idempotent**: điều kiện trạng thái trong `where`, chạy lại cho cùng kết quả.
- Gọi ngay 1 lần khi khởi động (đừng chờ hết interval đầu tiên).
- Log có prefix `[TênJob]`, chỉ log khi thật sự có việc (tránh spam mỗi 60 giây).
- Mount trong `js/server.js`: `const { startJob } = require('./jobs/x'); startJob();`
- Job và endpoint có thể chạy đồng thời trên cùng hàng dữ liệu → job cũng phải dùng `$transaction` khi sửa nhiều bảng liên quan (xem `seatUnlocker`).

## Error class cho mã trạng thái

Khi handler có nhiều nhánh lỗi nghiệp vụ:

```js
// js/lib/errors.js
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = { AppError };

// trong route
} catch (e) {
  if (e instanceof AppError)
    return res.status(e.status).json({ error: e.message });
  console.error('[Bookings] error:', e.message);
  res.status(500).json({ error: 'Lỗi server' });
}
```

Giúp helper trong `js/lib/` báo lỗi nghiệp vụ (409 ghế đã bị lấy, 400 số dư không đủ) mà không cần biết `res`.

## Những điều KHÔNG làm

- **Không** thêm logic mới vào route legacy trong `js/server.js` (`/login`, `/register`, `/query`, `/health`) hay vào `js/db.js` / `js/auth.js`.
- **Không** `new PrismaClient()` ngoài `js/routes/*.js` và `js/jobs/*.js` (mỗi file đúng 1 instance, ở top-level — không bao giờ trong handler).
- **Không** nối chuỗi vào SQL. Raw query dùng template tag `prisma.$queryRaw` hoặc `pool.query(sql, [params])`.
- **Không** trả `e.message` của Prisma/Postgres về client (lộ tên bảng/cột).
- **Không** log `req.body` nguyên khối (chứa password/PIN/OTP).
- **Không** tự chạy lệnh ghi DB — xem skill `db-change`.
