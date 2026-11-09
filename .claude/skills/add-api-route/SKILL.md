---
name: add-api-route
description: Thêm 1 endpoint API mới vào Pam Travel đúng convention — handler trong js/routes, mount trong js/server.js, rồi gọi từ Pinia store và view. Dùng khi user yêu cầu "thêm API mới", "thêm endpoint X", "cho phép làm Y từ UI".
---

# Thêm endpoint API mới

Dự án **không có file registry route** — hợp đồng API nằm ở 3 chỗ phải khớp nhau: định nghĩa (`js/routes/*.js`) → mount (`js/server.js`) → tiêu thụ (`frontend/src/`).

## Bước 0 — Xác định chỗ đặt

```bash
grep -rnE "^router\.(get|post|put|delete|patch)\(" js/routes/*.js | grep -i "<từ khoá>"
```

- Thuộc domain đã có (`auth`, `trips`, `bookings`, `payments`, `tickets`, `admin`, `driver`, `wallet`, `landing`, `reviews`) → thêm vào file đó, **không tạo file mới**.
- Domain mới hoàn toàn → tạo `js/routes/<domain>.js` và mount ở Bước 2.

Trước khi viết, đọc `prisma/schema.prisma` cho bảng liên quan — tên cột là `snake_case`, tên quan hệ do `db pull` sinh ra có thể dài và lạ, **không đoán**.

## Bước 1 — Handler trong `js/routes/<domain>.js`

```js
// POST /api/bookings/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId)
    return res.status(400).json({ error: 'Thiếu thông tin người dùng' });
  if (!Number.isInteger(Number(id)))
    return res.status(400).json({ error: 'Mã đơn không hợp lệ' });

  try {
    // Ràng buộc quyền sở hữu ngay trong query (backend chưa verify token)
    const booking = await prisma.bookings.findFirst({
      where: { id: BigInt(id), user_id: BigInt(userId) },
    });
    if (!booking)
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt vé' });

    // BR-04: phí hủy 10%, hoàn 90% vào ví
    const result = await prisma.$transaction(async (tx) => {
      // ... thao tác ghi liên quan nhau đặt hết trong đây, dùng `tx`
    });

    res.json({
      success:  true,
      refund:   Number(result.refund),
      bookingId: Number(booking.id),
    });
  } catch (e) {
    console.error('[Bookings] cancel error:', e.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});
```

Checklist handler:
- [ ] Dòng comment header `// METHOD /api/<đường dẫn đầy đủ>` (đúng convention hiện có).
- [ ] Validate input **trước** `try` → `res.status(400).json({ error: '<tiếng Việt>' })`.
- [ ] `BigInt(id)` chỉ sau khi đã kiểm tra là số — `BigInt('abc')` throw và thành 500.
- [ ] Ràng buộc `user_id` trong `where` cho dữ liệu người dùng; `role` đọc từ DB nếu là endpoint admin/driver.
- [ ] Nhiều lệnh ghi liên quan → `prisma.$transaction`, dùng `tx` bên trong (BR-03).
- [ ] Response: `BigInt`/`Decimal` → `Number(...)`; lỗi dùng key **`error`**.
- [ ] `catch` log có prefix `[Domain]`, trả client message chung chung.
- [ ] **Route tĩnh khai báo TRƯỚC route có param** trong cùng method — `router.get('/search')` đặt sau `router.get('/:id')` sẽ không bao giờ khớp.

## Bước 2 — Mount (chỉ khi tạo file route mới)

Trong [js/server.js](../../../js/server.js), đặt cạnh nhóm route liên quan:

```js
const refundRoutes = require('./routes/refunds');
app.use('/api/refunds', refundRoutes);
```

Và cuối file route mới: `module.exports = router;`

Quên bước này → **404 im lặng**, rất mất thời gian debug. Verify:
```bash
grep -nE "app\.use\('/api" js/server.js
```

## Bước 3 — Gọi từ frontend

Luôn qua axios instance dùng chung. Path **tương đối, không có `/api`** (baseURL đã chứa):

### Trong Pinia store (khi state dùng chung nhiều view)

```js
// frontend/src/stores/bookingStore.js
async cancelBooking(bookingId) {
  this.loading = true
  try {
    const res = await api.post(`/bookings/${bookingId}/cancel`, {
      userId: useAuthStore().user.id,
    })
    this.currentBooking = null
    return res.data
  } finally {
    this.loading = false
  }
}
```

### Trong view (khi chỉ 1 trang dùng)

```vue
<script setup>
import { ref } from 'vue'
import api from '../services/api'

const error   = ref('')
const loading = ref(false)

async function cancel(bookingId) {
  loading.value = true
  error.value = ''
  try {
    const res = await api.post(`/bookings/${bookingId}/cancel`, { userId: auth.user.id })
    // cập nhật UI
  } catch (err) {
    error.value = err.response?.data?.error || 'Không thể hủy vé, vui lòng thử lại'
  } finally {
    loading.value = false
  }
}
</script>
```

Nếu feature có nhiều endpoint → gom vào `frontend/src/services/<domain>.js` và export function, thay vì rải path trong view.

## Bước 4 — Verify

```bash
# Syntax backend
node --check js/routes/<domain>.js

# Backend đang chạy? thử endpoint
curl -X POST http://localhost:3001/api/bookings/1/cancel \
  -H "Content-Type: application/json" -d '{"userId":1}'

# Frontend compile sạch
cd frontend && npm run build
```

Không có cách test tự động → nêu rõ cho user bước thử tay: endpoint, dữ liệu mẫu, kết quả mong đợi.

## Checklist trước khi báo xong

- [ ] Handler đúng convention (comment header, validate, try/catch, key `error`).
- [ ] File route mới đã được mount trong `js/server.js`.
- [ ] Route tĩnh đứng trước route param.
- [ ] `BigInt`/`Decimal` đã convert trong response.
- [ ] Thao tác ghi liên quan nhau nằm trong `$transaction`.
- [ ] Ràng buộc quyền sở hữu/role; **đã nêu** giới hạn "backend chưa verify token" nếu endpoint đụng dữ liệu người dùng hoặc tiền.
- [ ] Frontend gọi qua `api` instance, path không chứa `/api`, không hard-code host.
- [ ] Lỗi hiện message từ `err.response?.data?.error`, `loading` tắt trong `finally`.
- [ ] `node --check` sạch; `npm run build` ở `frontend/` sạch.
- [ ] Đã ghi entry vào `.claude/memory/memory.md`.

## Kiểm tra tổng thể

Gọi agent `api-route-keeper` để soát toàn bộ: route chưa mount, route bị che, lời gọi FE không khớp, URL hard-code, path lặp `/api`.
