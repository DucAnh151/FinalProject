---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.vue"
---
# JavaScript / Vue — Pattern

> Mở rộng từ [common/patterns.md](../common/patterns.md).

## Response API của dự án

Backend không dùng envelope `{ success, data, error }` thống nhất ở mọi endpoint — convention thực tế:

```js
// Thành công: success + payload đặt tên theo domain
res.json({ success: true, user: {...} })
res.json({ trips: [...] })

// Lỗi: luôn là key `error`
res.status(400).json({ error: 'Thiếu thông tin tìm kiếm' })
```

Endpoint mới: giữ `error` cho lỗi (frontend phụ thuộc), `success: true` cho thao tác ghi. Danh sách trả kèm `total` nếu có phân trang.

## Service layer frontend

Hiện frontend gọi `api` trực tiếp từ store hoặc view. Pattern khuyến nghị cho feature mới nhiều endpoint — gom vào `frontend/src/services/<domain>.js`:

```js
import api from './api'

export function searchTrips({ originId, destinationId, departureDate }) {
  return api.get('/trips/search', { params: { originId, destinationId, departureDate } })
}

export function getSeatMap(tripId) {
  return api.get(`/trips/${tripId}/seats`)
}
```

View/store import function này thay vì tự ghép path. Lợi: đổi endpoint sửa 1 chỗ, và `api-route-keeper` quét được.

## Composable (custom hook)

Đặt ở `frontend/src/composables/`, tên `useXxx.js`, luôn cleanup trong `onUnmounted`:

```js
import { ref, onUnmounted } from 'vue'

export function usePolling(fn, intervalMs) {
  const timer = ref(null)

  function start() {
    stop()
    fn()
    timer.value = setInterval(fn, intervalMs)
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  onUnmounted(stop)
  return { start, stop }
}
```

Dùng cho polling sơ đồ ghế 5 giây và countdown lock 5 phút (BR-01) ở `SeatMapView` — **bắt buộc** clear interval, nếu không rời trang vẫn gọi API.

## Pinia store

```js
import { defineStore } from 'pinia'
import api from '../services/api'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    currentBooking: null,
    selectedSeats: [],
    loading: false,
  }),

  getters: {
    seatCount: (state) => state.selectedSeats.length,
    canAddSeat: (state) => state.selectedSeats.length < 5,   // BR-02
  },

  actions: {
    async createBooking(tripId) {
      this.loading = true
      try {
        const res = await api.post('/bookings', { tripId, seats: this.selectedSeats })
        this.currentBooking = res.data
        return res.data
      } finally {
        this.loading = false
      }
    },
  },
})
```

- Option syntax (khớp store hiện có).
- Getter cho dữ liệu dẫn xuất (đừng tính lại trong nhiều view).
- Action throw tiếp lỗi để view hiện message; store chỉ lo state.

## Transaction cho thao tác ghế/tiền (backend)

Mọi luồng đụng ghế, booking, payment, ví phải atomic (BR-03, BR-09):

```js
await prisma.$transaction(async (tx) => {
  await tx.trip_seat_status.updateMany({
    where: { trip_id: tripId, seat_id: { in: seatIds }, status: 'AVAILABLE' },
    data: { status: 'LOCKED', locked_until: lockUntil, locked_by_user_id: userId },
  });
  await tx.bookings.create({ data: { ... } });
});
```

- Dùng `tx` bên trong, **không** dùng `prisma` (ra ngoài transaction là mất tính atomic).
- Điều kiện trạng thái đặt ngay trong `where` (`status: 'AVAILABLE'`) rồi kiểm tra `count` — đây là chốt chống double booking, đừng check trước rồi ghi sau.

## Hằng số nghiệp vụ

Số đến từ BR → đặt tên, không rải magic number:

```js
const SEAT_LOCK_MINUTES = 5;        // BR-01
const MAX_SEATS_PER_BOOKING = 5;    // BR-02
const CANCEL_FEE_RATE = 0.1;        // BR-04
const TRIP_CLOSE_MINUTES = 60;      // BR-06
const VIP_DISCOUNT_RATE = 0.2;      // BR-08
```

Dùng ở nhiều file → đưa vào `js/lib/constants.js` (backend) và `frontend/src/constants.js`, giữ 2 bên khớp giá trị.

## Repository / helper dùng chung

Logic nghiệp vụ dùng ở nhiều route → trích ra `js/lib/` (mẫu: [js/lib/bookingConfirm.js](../../../js/lib/bookingConfirm.js)), nhận `tx`/`prisma` làm tham số để dùng được cả trong và ngoài transaction:

```js
async function confirmBooking(tx, bookingId) { /* ... */ }
module.exports = { confirmBooking };
```
