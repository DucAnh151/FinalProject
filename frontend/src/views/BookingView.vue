<template>
  <div class="booking-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <button class="btn-back-nav" @click="$router.back()">← Quay lại</button>
    </nav>

    <div v-if="!booking" class="full-loading">
      <div class="spinner"></div>
      <span>Đang tải thông tin...</span>
    </div>

    <div v-else class="content">
      <!-- COUNTDOWN -->
      <div :class="['countdown-bar', { urgent: timeLeft < 120 }]">
        <span class="cd-label">⏱ Ghế được giữ trong</span>
        <span class="cd-time">{{ formatCountdown(timeLeft) }}</span>
        <span class="cd-note">— Hoàn tất trước khi hết giờ</span>
      </div>

      <div class="layout">
        <!-- LEFT: form -->
        <div class="form-panel">
          <div class="panel-title">THÔNG TIN HÀNH KHÁCH</div>

          <!-- Mỗi ghế = 1 form row -->
          <div
            v-for="(seat, idx) in booking.seats"
            :key="seat.seatId"
            class="passenger-block"
          >
            <div class="passenger-header">
              <span class="seat-tag">{{ seat.seatName }}</span>
              <span class="passenger-num">Hành khách {{ idx + 1 }}</span>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Họ và tên *</label>
                <input
                  v-model="passengers[idx].name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  :class="{ 'field-error': errors[`name_${idx}`] }"
                />
                <span v-if="errors[`name_${idx}`]" class="err-msg">{{ errors[`name_${idx}`] }}</span>
              </div>
              <div class="field">
                <label>Số điện thoại *</label>
                <input
                  v-model="passengers[idx].phone"
                  type="tel"
                  placeholder="0901234567"
                  :class="{ 'field-error': errors[`phone_${idx}`] }"
                />
                <span v-if="errors[`phone_${idx}`]" class="err-msg">{{ errors[`phone_${idx}`] }}</span>
              </div>
            </div>
          </div>

          <!-- Điểm đón / trả -->
          <div class="panel-title" style="margin-top: 1.75rem">ĐIỂM ĐÓN & TRẢ</div>

          <div v-if="loadingStops" class="stops-loading">Đang tải điểm dừng...</div>
          <div v-else class="field-row">
            <div class="field">
              <label>Điểm đón *</label>
              <select
                v-model="pickupStopId"
                :class="{ 'field-error': errors.pickup }"
              >
                <option value="">-- Chọn điểm đón --</option>
                <option
                  v-for="s in pickupStops"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </select>
              <span v-if="errors.pickup" class="err-msg">{{ errors.pickup }}</span>
            </div>
            <div class="field">
              <label>Điểm trả *</label>
              <select
                v-model="dropoffStopId"
                :class="{ 'field-error': errors.dropoff }"
              >
                <option value="">-- Chọn điểm trả --</option>
                <option
                  v-for="s in dropoffStops"
                  :key="s.id"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </select>
              <span v-if="errors.dropoff" class="err-msg">{{ errors.dropoff }}</span>
            </div>
          </div>

          <div v-if="errors.general" class="alert-error">{{ errors.general }}</div>
        </div>

        <!-- RIGHT: tóm tắt -->
        <div class="summary-panel">
          <div class="summary-title">TÓM TẮT ĐƠN</div>

          <div class="summary-trip">
            <div class="s-route">{{ booking.trip?.origin }} → {{ booking.trip?.destination }}</div>
            <div class="s-time">{{ formatTime(booking.trip?.departureTime) }}</div>
            <div class="s-meta">{{ booking.trip?.operator }} · {{ booking.trip?.vehicleType }}</div>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-seats">
            <div class="s-label">Ghế đã chọn</div>
            <div class="seat-tags">
              <span v-for="s in booking.seats" :key="s.seatId" class="seat-tag-sm">
                {{ s.seatName }}
              </span>
            </div>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-row">
            <span>{{ booking.seats?.length }} ghế × {{ formatPrice(booking.trip?.price) }}</span>
            <span>{{ formatPrice(totalPrice) }}</span>
          </div>
          <div class="summary-row total">
            <span>Tổng tiền</span>
            <span class="total-price">{{ formatPrice(totalPrice) }}</span>
          </div>

          <button
            class="btn-pay"
            :disabled="submitting || timeLeft <= 0"
            @click="submit"
          >
            <span v-if="submitting">Đang xử lý...</span>
            <span v-else-if="timeLeft <= 0">Đã hết giờ giữ ghế</span>
            <span v-else>TIẾP TỤC THANH TOÁN →</span>
          </button>

          <div class="secure-note">🔒 Thông tin được bảo mật</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const booking      = ref(null)
const passengers   = ref([])
const pickupStopId  = ref('')
const dropoffStopId = ref('')
const stops        = ref([])
const loadingStops = ref(true)
const submitting   = ref(false)
const errors       = ref({})
const timeLeft     = ref(600) // 10 phút = 600 giây

let countdown = null

// Điểm đón = PICKUP hoặc BOTH
const pickupStops = computed(() =>
  stops.value.filter(s => s.type === 'PICKUP' || s.type === 'BOTH')
)
// Điểm trả = DROPOFF hoặc BOTH
const dropoffStops = computed(() =>
  stops.value.filter(s => s.type === 'DROPOFF' || s.type === 'BOTH')
)

const totalPrice = computed(() => {
  const seats = booking.value?.seats?.length || 0
  const price = booking.value?.trip?.price || 0
  return seats * price
})

onMounted(async () => {
  // Lấy booking từ session (do SeatMapView lưu sau khi gọi POST /bookings)
  const saved = sessionStorage.getItem('current_booking')
  if (!saved) { router.push('/'); return }

  booking.value = JSON.parse(saved)

  // Khởi tạo form passengers
  passengers.value = booking.value.seats.map(() => ({ name: '', phone: '' }))

  // Tính thời gian còn lại từ expiresAt
  if (booking.value.expiresAt) {
    const remaining = Math.floor((new Date(booking.value.expiresAt) - Date.now()) / 1000)
    timeLeft.value = Math.max(0, remaining)
  }

  // Bắt đầu đếm ngược
  countdown = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(countdown)
    }
  }, 1000)

  // Load stops
  await loadStops()
})

onUnmounted(() => {
  if (countdown) clearInterval(countdown)
})

async function loadStops() {
  loadingStops.value = true
  try {
    const tripId = booking.value?.trip?.id
    const res = await api.get(`/trips/${tripId}/stops`)
    stops.value = res.data.stops
  } catch (e) {
    errors.value.general = 'Không tải được điểm dừng'
  } finally {
    loadingStops.value = false
  }
}

function validate() {
  const errs = {}
  passengers.value.forEach((p, i) => {
    if (!p.name.trim()) errs[`name_${i}`] = 'Vui lòng nhập họ tên'
    if (!p.phone.trim()) errs[`phone_${i}`] = 'Vui lòng nhập số điện thoại'
    else if (!/^0\d{9}$/.test(p.phone.trim())) errs[`phone_${i}`] = 'Số điện thoại không hợp lệ'
  })
  if (!pickupStopId.value)  errs.pickup  = 'Vui lòng chọn điểm đón'
  if (!dropoffStopId.value) errs.dropoff = 'Vui lòng chọn điểm trả'
  errors.value = errs
  return Object.keys(errs).length === 0
}

function submit() {
  if (!validate()) return

  // Lưu thông tin để PaymentView dùng
  const paymentData = {
    ...booking.value,
    passengers: passengers.value,
    pickupStopId:  pickupStopId.value,
    dropoffStopId: dropoffStopId.value,
    totalPrice:    totalPrice.value,
  }
  sessionStorage.setItem('payment_data', JSON.stringify(paymentData))
  router.push('/payment')
}

function formatCountdown(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(p) {
  if (!p) return '0đ'
  return new Intl.NumberFormat('vi-VN').format(p) + 'đ'
}
</script>

<style scoped>
.booking-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

/* NAV */
.navbar {
  background: #0d0d0d;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2.5rem; height: 60px;
  position: sticky; top: 0; z-index: 100;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem; color: #e85d2f;
  letter-spacing: 2px; text-decoration: none;
}
.btn-back-nav {
  background: none; border: 1px solid #333; color: #aaa;
  padding: 0.4rem 1rem; border-radius: 6px;
  font-size: 0.82rem; cursor: pointer; transition: all 0.15s;
}
.btn-back-nav:hover { border-color: #e85d2f; color: #e85d2f; }

/* LOADING */
.full-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: calc(100vh - 60px);
  gap: 1rem; color: #7a7468; font-size: 0.9rem;
}
.spinner {
  width: 28px; height: 28px;
  border: 2px solid #d4cfc6; border-top-color: #e85d2f;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* COUNTDOWN */
.countdown-bar {
  background: #0d0d0d; color: #fff;
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.7rem 2.5rem;
  font-size: 0.88rem;
  transition: background 0.3s;
}
.countdown-bar.urgent { background: #c0392b; }
.cd-label { color: #aaa; }
.cd-time {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: #e85d2f; letter-spacing: 1px;
}
.countdown-bar.urgent .cd-time { color: #fff; }
.cd-note { color: #666; font-size: 0.8rem; }

/* CONTENT */
.content { padding: 1.5rem 2.5rem; }

.layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
  align-items: start;
}

/* FORM PANEL */
.form-panel {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.75rem;
}
.panel-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1.5px;
  color: #7a7468; margin-bottom: 1.25rem;
}

.passenger-block {
  border: 1.5px solid #ede9e1; border-radius: 10px;
  padding: 1.25rem; margin-bottom: 1rem;
}
.passenger-header {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 1rem;
}
.seat-tag {
  background: #e85d2f; color: #fff;
  padding: 0.2rem 0.7rem; border-radius: 20px;
  font-size: 0.78rem; font-weight: 600;
}
.passenger-num { font-size: 0.82rem; color: #7a7468; font-weight: 500; }

.field-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px; color: #7a7468;
}
.field input, .field select {
  border: 1.5px solid #d4cfc6; border-radius: 8px;
  padding: 0.65rem 0.9rem; font-size: 0.9rem;
  color: #0d0d0d; background: #f5f2ec;
  outline: none; transition: border-color 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.field input:focus, .field select:focus {
  border-color: #e85d2f; background: #fff;
}
.field input.field-error, .field select.field-error { border-color: #c0392b; }
.err-msg { font-size: 0.72rem; color: #c0392b; }

.stops-loading { font-size: 0.82rem; color: #7a7468; padding: 0.5rem 0; }

.alert-error {
  background: #fdf0ef; color: #c0392b;
  border: 1px solid #f5c6c2;
  border-radius: 8px; padding: 0.75rem 1rem;
  font-size: 0.83rem; margin-top: 1rem;
}

/* SUMMARY PANEL */
.summary-panel {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.5rem;
  position: sticky; top: 80px;
}
.summary-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1.5px;
  color: #7a7468; margin-bottom: 1rem;
}
.summary-trip { margin-bottom: 0.5rem; }
.s-route { font-size: 1rem; font-weight: 600; color: #0d0d0d; }
.s-time {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: #e85d2f; line-height: 1.2;
}
.s-meta { font-size: 0.78rem; color: #7a7468; margin-top: 0.2rem; }

.summary-divider { height: 1px; background: #ede9e1; margin: 0.75rem 0; }

.summary-seats { }
.s-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #7a7468; margin-bottom: 0.5rem; }
.seat-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.seat-tag-sm {
  background: #ede9e1; color: #0d0d0d;
  padding: 0.2rem 0.6rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.summary-row {
  display: flex; justify-content: space-between;
  font-size: 0.83rem; color: #7a7468; margin-bottom: 0.4rem;
}
.summary-row.total { font-weight: 600; color: #0d0d0d; font-size: 0.9rem; margin-top: 0.25rem; }
.total-price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; color: #e85d2f;
}

.btn-pay {
  width: 100%; background: #e85d2f; color: #fff;
  border: none; border-radius: 8px;
  padding: 0.85rem; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  margin-top: 1rem;
}
.btn-pay:hover:not(:disabled) { background: #c44a1e; }
.btn-pay:disabled { background: #d4cfc6; cursor: not-allowed; }

.secure-note {
  text-align: center; font-size: 0.72rem; color: #7a7468;
  margin-top: 0.75rem;
}
</style>