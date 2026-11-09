---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.vue"
---
# JavaScript / Vue — Coding Style

> Mở rộng từ [common/coding-style.md](../common/coding-style.md). Dự án **không dùng TypeScript** — đừng thêm type annotation, `.ts`, hay `lang="ts"`.

## Không có type checker → hợp đồng phải rõ bằng cách khác

Vì không có TS, mô tả input/output bằng **tên tham số rõ ràng** và **JSDoc cho function dùng chung**:

```js
/**
 * Tính tiền hoàn khi hủy vé (BR-04: phí 10%, hoàn 90%).
 * @param {number} totalAmount - tổng tiền vé đã thanh toán (VNĐ)
 * @returns {{ fee: number, refund: number }}
 */
function calcRefund(totalAmount) {
  const fee = Math.round(totalAmount * 0.1);
  return { fee, refund: totalAmount - fee };
}
```

Chỉ JSDoc cho **helper dùng chung** (`js/lib/`, composable, util). Handler route và component không cần.

## Destructuring + giá trị mặc định

```js
// Backend
const { originId, destinationId, departureDate } = req.query;

// Có mặc định
const { page = 1, limit = 20 } = req.query;
```

## Optional chaining & nullish coalescing

Dùng `?.` và `??` thay cho chuỗi `&&` dài:

```js
// SAI
const name = user && user.profile && user.profile.fullName ? user.profile.fullName : 'Khách'

// ĐÚNG
const name = user?.profile?.fullName ?? 'Khách'
```

Lưu ý `??` khác `||`: `0 || 10` → `10`, `0 ?? 10` → `0`. Với số (số dư ví, số ghế) dùng `??`.

## Bất biến

```js
// SAI — mutate tham số
function updateUser(user, name) {
  user.full_name = name
  return user
}

// ĐÚNG
function updateUser(user, name) {
  return { ...user, full_name: name }
}
```

Mảng: `[...arr, item]`, `arr.filter(...)`, `arr.map(...)` thay vì `push`/`splice` trên dữ liệu đến từ props/store.

## async/await

- Luôn `async/await`, không `.then()` chuỗi, không callback.
- `await` trong loop chỉ khi các bước **phụ thuộc nhau** (vd. transaction tuần tự trong `seatUnlocker`). Các lời gọi độc lập → `Promise.all`:
  ```js
  const [trips, operators, banners] = await Promise.all([
    api.get('/landing/trips'),
    api.get('/landing/operators'),
    api.get('/landing/banners'),
  ])
  ```
- Mọi `await` có thể throw phải nằm trong `try/catch` ở biên (handler route, action store, hàm load của view).
- **Không dùng top-level `await`** trong module frontend — đã từng gây lỗi ở `LandingView` (xem git log `d3c7029`); gói vào function và gọi trong `onMounted`.

## Số và tiền

- Tiền tính bằng **số nguyên VNĐ**. Làm tròn tường minh (`Math.round`) khi nhân phần trăm (BR-04 10%, BR-08 20%) — đừng để lẻ số thập phân rồi lưu DB.
- `Decimal`/`BigInt` của Prisma phải `Number(...)` trước khi tính hoặc trả về client.
- So sánh số: `parseInt(value, 10)` / `Number(value)` cho query param (luôn là string).

## Xử lý lỗi

```js
// Backend
try {
  const booking = await prisma.bookings.create({ data });
  res.status(201).json({ success: true, bookingId: Number(booking.id) });
} catch (e) {
  console.error('[Bookings] create error:', e.message);
  res.status(500).json({ error: 'Lỗi server' });
}

// Frontend
try {
  await bookingStore.confirm()
} catch (err) {
  error.value = err.response?.data?.error || 'Không thể xác nhận đặt vé'
} finally {
  loading.value = false
}
```

- Không `catch {}` rỗng.
- Không trả `e.message` thô của DB về client (lộ tên bảng/cột).
- `finally` để tắt `loading` — đừng để spinner treo khi lỗi.

## console

- `console.error` / `console.warn` có prefix module (`[SeatUnlocker]`, `[Payments]`) — đúng convention hiện có. Giữ lại ở backend.
- **Xoá `console.log` debug** trước khi báo xong, ở cả backend và frontend.

## Module system

- Backend: CommonJS (`require` / `module.exports`).
- Frontend: ESM (`import` / `export`) — `frontend/package.json` có `"type": "module"`.
- Không trộn lẫn.
