---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.vue"
---
# JavaScript / Vue — Testing

> Mở rộng từ [common/testing.md](../common/testing.md).

## Trạng thái hiện tại (đọc trước)

Dự án **chưa có hạ tầng test**: không `test` script, không test runner, không file test nào. Vì vậy:

- **Không** báo "đã test" khi chỉ đọc code. Nói rõ là **review tĩnh** (đọc file + `grep`).
- **Không** tự dựng cả hạ tầng test chỉ vì sửa 1 feature — hỏi user trước (cài devDependency, thêm script, thêm config là thay đổi ngoài phạm vi task).
- Test **không chặn merge** ở dự án này. Gate chất lượng dựa vào review tĩnh đối sánh BR/SRS.

Cách verify thực tế đang dùng:
- Backend: `node --check js/routes/<file>.js` (kiểm syntax), đọc lại luồng, và **nhờ user chạy thử** endpoint rồi báo kết quả.
- Frontend: `cd frontend && npm run dev` (hoặc `npm run build`) để chắc không lỗi compile, rồi user bấm thử trên UI.

## Khi user yêu cầu thêm test

Stack đề xuất (khớp Vite đã có):

```bash
# frontend/
npm i -D vitest @vue/test-utils jsdom

# package.json (frontend)
"scripts": { "test": "vitest" }
```

Backend: `vitest` hoặc `node:test` (có sẵn trong Node ≥ 18, không cần cài gì) + `supertest` cho endpoint.

Ưu tiên viết test cho, theo thứ tự giá trị:
1. **Logic nghiệp vụ thuần** — tính tiền hoàn BR-04, giảm giá VIP BR-08, điều kiện VIP BR-07, giới hạn ghế BR-02. Đây là hàm thuần, dễ test, dễ sai.
2. **Helper dùng chung** — `js/lib/*`.
3. **Endpoint quan trọng** — booking, payment, wallet (cần DB test riêng, **không** chạy trên DB thật của user).
4. **Composable** có timer/polling.

## Cấu trúc test (AAA)

```js
import { describe, it, expect } from 'vitest'
import { calcRefund } from '../js/lib/refund'

describe('calcRefund (BR-04)', () => {
  it('thu phí 10% và hoàn 90% vào ví', () => {
    // Arrange
    const total = 500_000

    // Act
    const { fee, refund } = calcRefund(total)

    // Assert
    expect(fee).toBe(50_000)
    expect(refund).toBe(450_000)
  })

  it('làm tròn phí về số nguyên VNĐ', () => {
    expect(calcRefund(333_333).fee).toBe(33_333)
  })
})
```

## Đặt tên test

Mô tả hành vi + mã BR khi có:

```js
it('không cho chọn quá 5 ghế trong 1 lần đặt (BR-02)', () => {})
it('trả 403 khi role ADMIN gọi API đặt vé (BR-13)', () => {})
it('nhả ghế về AVAILABLE khi lock quá 5 phút (BR-01)', () => {})
```

Tránh `test1`, `should work`, `ok case`.

## Test component Vue

```js
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import SeatMap from '../src/components/SeatMap.vue'

describe('SeatMap', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('đánh dấu ghế BOOKED là không chọn được', () => {
    const wrapper = mount(SeatMap, {
      props: { seats: [{ id: 1, code: 'A1', status: 'BOOKED' }] }
    })
    expect(wrapper.find('[data-seat="A1"]').classes()).toContain('disabled')
  })
})
```

Component dùng store → `setActivePinia(createPinia())` trong `beforeEach`, nếu không sẽ lỗi "no active Pinia".

## Mock API

```js
import { vi } from 'vitest'
vi.mock('../src/services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { trips: [] } }) }
}))
```

## Tuyệt đối không

- **Không** chạy test ghi vào DB `pam_travel` thật của user. Test cần DB → tạo database riêng và nói user tự tạo.
- **Không** sửa test cho pass khi implementation sai — sửa implementation.
- **Không** để test phụ thuộc thứ tự chạy hoặc dữ liệu seed sẵn có.
