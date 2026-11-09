---
name: frontend-patterns
description: Pattern Vue 3 cho Pam Travel — Composition API với JavaScript thuần, Pinia store, gọi API qua axios instance, polling và countdown cho sơ đồ ghế, form đặt vé, route guard theo role. Dùng khi build component hoặc view trong frontend/.
---

# Vue 3 Frontend Patterns

Pattern cho `frontend/` của Pam Travel. Đọc cùng [.claude/rules/vue-style.md](../../rules/vue-style.md).

**JavaScript thuần — KHÔNG TypeScript. Không UI framework.** Không thêm `lang="ts"`, không thêm Tailwind/Ant/Element.

## Khi nào dùng

- Build hoặc sửa component / view trong `frontend/src/`.
- Quản lý state qua Pinia.
- Làm việc với polling, countdown, form nhiều bước.
- Thêm trang mới có phân quyền.

## Khung một view

```vue
<template>
  <div class="trip-list">
    <p v-if="loading" class="loading">Đang tải chuyến đi...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!trips.length" class="empty">Không tìm thấy chuyến phù hợp</p>

    <article v-for="trip in trips" :key="trip.id" class="trip-card">
      <h3>{{ trip.operatorName }}</h3>
      <p>{{ formatTime(trip.departureTime) }} · {{ formatMoney(trip.price) }}</p>
      <button :disabled="!trip.availableSeats" @click="goToSeatMap(trip.id)">
        Chọn ghế
      </button>
    </article>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router  = useRouter()
const trips   = ref([])
const loading = ref(false)
const error   = ref('')

async function loadTrips(params) {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/trips/search', { params })
    trips.value = res.data.trips ?? []
  } catch (err) {
    error.value = err.response?.data?.error || 'Không tải được danh sách chuyến đi'
  } finally {
    loading.value = false
  }
}

function goToSeatMap(tripId) {
  router.push(`/trips/${tripId}/seats`)
}

onMounted(() => loadTrips(router.currentRoute.value.query))
</script>

<style scoped>
.trip-card { /* ... */ }
</style>
```

Bộ ba `loading` / `error` / dữ liệu là pattern chuẩn của mọi view gọi API. `finally` tắt `loading` — nếu không, lỗi làm spinner treo mãi.

## Props & emit

```vue
<script setup>
const props = defineProps({
  trip:     { type: Object, required: true },
  seats:    { type: Array,  default: () => [] },
  maxSeats: { type: Number, default: 5 },        // BR-02
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'cancel'])

function onPick(seat) {
  if (props.disabled) return
  emit('select', seat.id)
}
</script>
```

- Object syntax có `type` + `required`/`default` — không dùng mảng string.
- `default` của Array/Object phải là **factory** (`() => []`).
- **Không mutate `props`** — emit lên cha, cha sửa state.

## Pinia store

```js
import { defineStore } from 'pinia'
import api from '../services/api'
import { useAuthStore } from './authStore'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    tripId: null,
    selectedSeats: [],
    currentBooking: null,
    loading: false,
  }),

  getters: {
    seatCount:  (state) => state.selectedSeats.length,
    canAddSeat: (state) => state.selectedSeats.length < 5,              // BR-02
    totalPrice: (state) => state.selectedSeats.reduce((sum, s) => sum + s.price, 0),
  },

  actions: {
    toggleSeat(seat) {
      const idx = this.selectedSeats.findIndex(s => s.id === seat.id)
      if (idx >= 0) {
        this.selectedSeats = this.selectedSeats.filter(s => s.id !== seat.id)
        return
      }
      if (!this.canAddSeat) throw new Error('Chỉ được chọn tối đa 5 ghế')
      this.selectedSeats = [...this.selectedSeats, seat]
    },

    async createBooking() {
      this.loading = true
      try {
        const res = await api.post('/bookings', {
          userId:  useAuthStore().user.id,
          tripId:  this.tripId,
          seatIds: this.selectedSeats.map(s => s.id),
        })
        this.currentBooking = res.data
        return res.data
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.tripId = null
      this.selectedSeats = []
      this.currentBooking = null
    },
  },
})
```

- **Option syntax** (`{ state, getters, actions }`) — khớp store hiện có, đừng trộn setup syntax.
- Getter cho dữ liệu dẫn xuất (`totalPrice`, `canAddSeat`) — đừng tính lại ở từng view.
- Action **throw tiếp** lỗi để view hiện message; store chỉ lo state.
- Có `reset()` cho store theo luồng (`bookingStore`) — gọi khi hoàn tất hoặc hủy, nếu không state cũ rò rỉ sang lần đặt sau.
- State dùng chung nhiều view → store. State riêng 1 view → `ref` trong component.

## Session & auth — chỉ qua `authStore`

```js
import { useAuthStore } from '../stores/authStore'
const auth = useAuthStore()

auth.isLoggedIn   // boolean
auth.isAdmin      // role === 'ADMIN'
auth.user.id
await auth.login(identifier, password)
```

**Không** `sessionStorage.getItem('pam_user')` trong component — key đó là chi tiết nội bộ của store và `services/api.js`. Đổi cách lưu session sau này chỉ phải sửa 1 chỗ.

## Polling + countdown (SeatMapView — chỗ dễ sai nhất)

Sơ đồ ghế cần: polling trạng thái mỗi 5 giây + countdown 5 phút lock (BR-01). **Mọi timer phải được clear khi rời trang**, nếu không UI đã unmount vẫn gọi API mãi.

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../services/api'

const POLL_MS       = 5000
const LOCK_SECONDS  = 5 * 60        // BR-01

const seats     = ref([])
const remaining = ref(LOCK_SECONDS)

let pollTimer  = null
let countTimer = null

async function fetchSeats() {
  try {
    const res = await api.get(`/trips/${tripId}/seats`)
    seats.value = res.data.seats ?? []
  } catch {
    // Lỗi polling: giữ dữ liệu cũ, không làm trống UI
  }
}

function startCountdown() {
  countTimer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      stopAll()
      onLockExpired()
    }
  }, 1000)
}

function stopAll() {
  if (pollTimer)  { clearInterval(pollTimer);  pollTimer  = null }
  if (countTimer) { clearInterval(countTimer); countTimer = null }
}

onMounted(() => {
  fetchSeats()
  pollTimer = setInterval(fetchSeats, POLL_MS)
  startCountdown()
})

onUnmounted(stopAll)
</script>
```

Quy tắc:
- Mỗi `setInterval`/`setTimeout` có một `clear` tương ứng trong `onUnmounted`.
- Gán timer vào biến thường (`let`), không cần `ref` — không dùng để render.
- Lỗi trong polling: **nuốt có chủ đích** (giữ dữ liệu cũ), đừng hiện toast mỗi 5 giây.
- Countdown hết → dừng timer **trước** khi điều hướng, tránh gọi tiếp sau unmount.
- Tách được thì đưa vào composable `usePolling` trong `frontend/src/composables/`.

## Composable

```js
// frontend/src/composables/useCountdown.js
import { ref, onUnmounted } from 'vue'

export function useCountdown(seconds, onExpire) {
  const remaining = ref(seconds)
  let timer = null

  function start() {
    stop()
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) {
        stop()
        onExpire?.()
      }
    }, 1000)
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null }
  }

  onUnmounted(stop)
  return { remaining, start, stop }
}
```

- Tên `useXxx`, đặt trong `frontend/src/composables/`.
- **Luôn** cleanup trong `onUnmounted` ngay trong composable — người dùng nó không phải nhớ.
- Trả về object có `ref` + function điều khiển.

## Form nhiều bước (BookingView → PaymentView)

Dữ liệu đi qua nhiều trang → đặt ở store, **không** truyền qua query param (F5 là mất, và lộ dữ liệu trên URL).

```js
// BookingView: lưu thông tin hành khách vào store rồi điều hướng
bookingStore.passengers = passengers.value
await bookingStore.savePassengers()
router.push('/payment')

// PaymentView: đọc từ store, nếu rỗng thì quay lại
onMounted(() => {
  if (!bookingStore.currentBooking) {
    router.replace('/search')
  }
})
```

Mỗi trang trong luồng phải tự kiểm tra tiền đề (`currentBooking` tồn tại) và `router.replace` về bước trước nếu thiếu — user có thể vào trực tiếp bằng URL.

Validate form ở client để UX tốt, nhưng **backend vẫn phải validate lại** — client bypass được.

## Route mới có phân quyền

```js
// frontend/src/router/index.js
{
  path: '/refunds',
  component: () => import('../views/RefundView.vue'),
  meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }   // BR-13
}
```

- `component: () => import(...)` — lazy load, đúng pattern hiện có.
- `meta`: `requiresAuth` · `role: 'ADMIN'|'DRIVER'` · `disallowRoles: [...]` · `guestOnly`.
- Guard là **UX, không phải bảo mật** — backend phải tự kiểm quyền.

## Hiển thị dữ liệu

```js
function formatMoney(amount) {
  return `${Number(amount).toLocaleString('vi-VN')}đ`
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
  })
}
```

Đặt ở `frontend/src/utils/format.js` khi dùng ở nhiều view, đừng copy vào từng file.

## Performance

```vue
<script setup>
import { computed } from 'vue'

// Lọc/sắp xếp bằng computed — tự cache, chỉ tính lại khi dependency đổi
const sortedTrips = computed(() =>
  [...trips.value].sort((a, b) => a.price - b.price)
)
</script>
```

- `computed` cho dữ liệu dẫn xuất; **không** gọi function trong template để lọc danh sách (chạy lại mỗi lần re-render).
- `[...arr].sort()` — `sort()` mutate mảng gốc.
- Route lazy load đã chia bundle sẵn; đừng import tĩnh toàn bộ view vào `router/index.js`.
- Ảnh trong `frontend/public/images/` tham chiếu bằng path (`/images/operators/x.png`), không `import` vào JS.

## Những điều KHÔNG làm

- **Không** `fetch()` hay `axios` trực tiếp — chỉ `api` từ `services/api.js`.
- **Không** để `/api` trong path truyền vào `api.get()` (baseURL đã có) → `/api/api/...`.
- **Không** xử lý lại 401 ở view — interceptor đã xoá session và điều hướng.
- **Không** top-level `await` trong module (đã gây lỗi ở `LandingView`) — gói vào function, gọi trong `onMounted`.
- **Không** `v-html` với dữ liệu từ user/API khi chưa sanitize.
- **Không** `||` cho giá trị số có thể bằng `0` (số dư, số ghế trống) — dùng `??`.
- **Không** để `console.log` sót lại.
