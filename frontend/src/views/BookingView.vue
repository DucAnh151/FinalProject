<template>
  <div class="booking-page">
    <!-- NAV -->
    <UserHeader backTo="history" />

    <div v-if="!booking" class="full-loading">
      <div class="spinner"></div>
      <span>{{ ui.t.booking.loading }}</span>
    </div>

    <div v-else class="content">
      <!-- COUNTDOWN -->
      <div :class="['countdown-bar', { urgent: timeLeft < 60 }]">
        <span class="cd-label">{{ ui.t.booking.countdownLabel }}</span>
        <span class="cd-time">{{ formatCountdown(timeLeft) }}</span>
        <span class="cd-note">{{ ui.t.booking.countdownNote }}</span>
      </div>

      <div class="cancel-warning">{{ ui.t.booking.cancelWarning }}</div>

      <div class="layout">
        <!-- LEFT: form -->
        <div class="form-panel">
          <div class="panel-title">{{ ui.t.booking.passengerTitle }}</div>

          <!-- Mỗi ghế = 1 form row -->
          <div
            v-for="(seat, idx) in booking.seats"
            :key="seat.seatId"
            class="passenger-block"
          >
            <div class="passenger-header">
              <span class="seat-tag">{{ seat.seatName }}</span>
              <span class="passenger-num">{{ ui.t.booking.passenger }} {{ idx + 1 }}</span>
              <label class="self-passenger-label" v-if="passengers[idx]">
                <input
                  type="checkbox"
                  v-model="passengers[idx].isSelf"
                  @change="toggleSelf(idx)"
                />
                {{ ui.t.booking.isSelf }}
              </label>
            </div>
            <div class="field-row" v-if="passengers[idx]">
              <div class="field">
                <label>{{ ui.t.booking.nameLabel }}</label>
                <input
                  v-model="passengers[idx].name"
                  type="text"
                  :placeholder="ui.t.booking.namePlaceholder"
                  :class="{ 'field-error': errors[`name_${idx}`] }"
                />
                <span v-if="errors[`name_${idx}`]" class="err-msg">{{ errors[`name_${idx}`] }}</span>
              </div>
              <div class="field">
                <label>{{ ui.t.booking.phoneLabel }}</label>
                <input
                  v-model="passengers[idx].phone"
                  type="tel"
                  :placeholder="ui.t.booking.phonePlaceholder"
                  :class="{ 'field-error': errors[`phone_${idx}`] }"
                />
                <span v-if="errors[`phone_${idx}`]" class="err-msg">{{ errors[`phone_${idx}`] }}</span>
              </div>
            </div>
          </div>

          <!-- Điểm đón / trả -->
          <div class="panel-title" style="margin-top: 1.75rem">{{ ui.t.booking.stopsTitle }}</div>

          <div v-if="loadingStops" class="stops-loading">{{ ui.t.booking.loadingStops }}</div>
          <div v-else class="field-row">
            <div class="field">
              <label>{{ ui.t.booking.pickupLabel }}</label>
              <select
                v-model="pickupStopId"
                :class="{ 'field-error': errors.pickup }"
              >
                <option value="">{{ ui.t.booking.pickupPlaceholder }}</option>
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
              <label>{{ ui.t.booking.dropoffLabel }}</label>
              <select
                v-model="dropoffStopId"
                :class="{ 'field-error': errors.dropoff }"
              >
                <option value="">{{ ui.t.booking.dropoffPlaceholder }}</option>
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
          <div class="summary-title">{{ ui.t.booking.summaryTitle }}</div>

          <div class="summary-trip">
            <div class="s-route">{{ booking.trip?.origin }} → {{ booking.trip?.destination }}</div>
            <div class="s-time">{{ formatTime(booking.trip?.departureTime) }}</div>
            <div class="s-meta">{{ booking.trip?.operator }} · {{ booking.trip?.vehicleType }}</div>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-seats">
            <div class="s-label">{{ ui.t.booking.selectedSeats }}</div>
            <div class="seat-tags">
              <span v-for="s in booking.seats" :key="s.seatId" class="seat-tag-sm">
                {{ s.seatName }}
              </span>
            </div>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-row">
            <span>{{ booking.seats?.length }} {{ ui.t.seatMap.priceLabel }} {{ formatPrice(booking.trip?.price) }}</span>
            <span>{{ formatPrice(totalPrice) }}</span>
          </div>
          <div class="summary-row total">
            <span>{{ ui.t.booking.total }}</span>
            <span class="total-price">{{ formatPrice(totalPrice) }}</span>
          </div>

          <button
            class="btn-pay"
            :disabled="submitting || timeLeft <= 0"
            @click="submit"
          >
            <span v-if="submitting">{{ ui.t.booking.processing }}</span>
            <span v-else-if="timeLeft <= 0">{{ ui.t.booking.expired }}</span>
            <span v-else>{{ ui.t.booking.continueBtn }}</span>
          </button>

          <div class="secure-note">{{ ui.t.booking.secure }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// BookingView: Handles passenger details entry and route stops selection
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBookingStore } from '../stores/bookingStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()
const bookStore = useBookingStore()

const booking      = ref(null)
const passengers   = ref([])
const pickupStopId  = ref('')
const dropoffStopId = ref('')
const stops        = ref([])
const loadingStops = ref(true)
const submitting   = ref(false)
const errors       = ref({})
const timeLeft     = ref(300) // 5 phút — khớp LOCK_MINUTES backend

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
  const storeHasBooking = bookStore.hasActiveBooking

  if (storeHasBooking) {
    booking.value = {
      bookingId: bookStore.bookingId,
      expiresAt: bookStore.expiresAt,
      trip:      bookStore.selectedTrip,
      seats:     bookStore.seats,
    }
  } else {
    // Fallback: sessionStorage legacy
    const saved = sessionStorage.getItem('current_booking')
    if (!saved) { router.push('/'); return }
    booking.value = JSON.parse(saved)
  }

  // Khởi tạo form passengers (restoring from store if exist)
  if (bookStore.passengers && bookStore.passengers.length === booking.value.seats.length) {
    passengers.value = JSON.parse(JSON.stringify(bookStore.passengers))
  } else {
    passengers.value = booking.value.seats.map(() => ({ name: '', phone: '', isSelf: false }))
  }

  if (bookStore.pickupStopId) {
    pickupStopId.value = bookStore.pickupStopId
  }
  if (bookStore.dropoffStopId) {
    dropoffStopId.value = bookStore.dropoffStopId
  }

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

function toggleSelf(idx) {
  if (passengers.value[idx].isSelf) {
    // Uncheck other passengers' isSelf
    passengers.value.forEach((p, i) => {
      if (i !== idx) p.isSelf = false
    })

    // Fill info from logged in user
    passengers.value[idx].name = auth.user?.fullName || ''
    passengers.value[idx].phone = auth.user?.phone || ''
  } else {
    // Clear info if unchecked
    passengers.value[idx].name = ''
    passengers.value[idx].phone = ''
  }
}

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
    errors.value.general = ui.t.booking.errStops
  } finally {
    loadingStops.value = false
  }
}

function validate() {
  const errs = {}
  passengers.value.forEach((p, i) => {
    if (!p.name.trim()) errs[`name_${i}`] = ui.t.booking.errName
    if (!p.phone.trim()) errs[`phone_${i}`] = ui.t.booking.errPhone
    else if (!/^0\d{9}$/.test(p.phone.trim())) errs[`phone_${i}`] = ui.t.booking.errPhoneInvalid
  })
  if (!pickupStopId.value)  errs.pickup  = ui.t.booking.errPickup
  if (!dropoffStopId.value) errs.dropoff = ui.t.booking.errDropoff
  errors.value = errs
  return Object.keys(errs).length === 0
}

async function submit() {
  if (!validate()) return

  submitting.value = true
  try {
    // Gửi thông tin hành khách lên server
    await api.put(`/bookings/${booking.value.bookingId}/passengers`, {
      passengers: booking.value.seats.map((seat, idx) => ({
        seatId: seat.seatId,
        name:   passengers.value[idx].name,
        phone:  passengers.value[idx].phone,
      })),
      pickupStopId:  pickupStopId.value,
      dropoffStopId: dropoffStopId.value,
    })

    // Lưu vào bookingStore
    bookStore.setPassengers({
      passengers:    passengers.value,
      pickupStopId:  pickupStopId.value,
      dropoffStopId: dropoffStopId.value,
    })
    bookStore.setTotalPrice(totalPrice.value)
    // Giữ lại sessionStorage cho backward compat — normalized structure
    sessionStorage.setItem('payment_data', JSON.stringify({
      bookingId:  booking.value.bookingId,
      trip:       booking.value.trip,
      seats:      booking.value.seats,
      totalPrice: totalPrice.value,
    }))
    router.push('/payment')
  } catch (e) {
    errors.value.general = e.response?.data?.error || (ui.locale === 'vi' ? 'Có lỗi xảy ra' : 'An error occurred')
  } finally {
    submitting.value = false
  }
}

function formatCountdown(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(p) {
  if (!p) return '0đ'
  return new Intl.NumberFormat(ui.locale === 'vi' ? 'vi-VN' : 'en-US').format(p) + 'đ'
}
</script>

<style scoped>
.booking-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

/* LOADING */
.full-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: calc(100vh - 60px);
  gap: 1rem; color: var(--muted); font-size: 0.9rem;
}
.spinner {
  width: 28px; height: 28px;
  border: 2px solid var(--line); border-top-color: var(--accent);
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
  font-size: 1.4rem; color: var(--accent); letter-spacing: 1px;
}
.countdown-bar.urgent .cd-time { color: #fff; }
.cd-note { color: #666; font-size: 0.8rem; }

.cancel-warning {
  margin: 0 2.5rem 0;
  background: rgba(253, 224, 71, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.4);
  color: var(--text);
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
}

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
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 12px; padding: 1.75rem;
}
.panel-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1.5px;
  color: var(--muted); margin-bottom: 1.25rem;
}

.passenger-block {
  border: 1.5px solid var(--line); border-radius: 10px;
  padding: 1.25rem; margin-bottom: 1rem;
}
.passenger-header {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 1rem;
}
.self-passenger-label {
  margin-left: auto;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  user-select: none;
}
.self-passenger-label input {
  cursor: pointer;
  accent-color: var(--accent);
}
.seat-tag {
  background: var(--accent); color: #fff;
  padding: 0.2rem 0.7rem; border-radius: 20px;
  font-size: 0.78rem; font-weight: 600;
}
.passenger-num { font-size: 0.82rem; color: var(--muted); font-weight: 500; }

.field-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted);
}
.field input, .field select {
  border: 1.5px solid var(--line); border-radius: 8px;
  padding: 0.65rem 0.9rem; font-size: 0.9rem;
  color: var(--text); background: var(--input-bg, var(--tag-bg));
  outline: none; transition: border-color 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.field input:focus, .field select:focus {
  border-color: var(--accent); background: var(--input-focus-bg, var(--panel));
}
.field input.field-error, .field select.field-error { border-color: #c0392b; }
.err-msg { font-size: 0.72rem; color: #c0392b; }

.stops-loading { font-size: 0.82rem; color: var(--muted); padding: 0.5rem 0; }

.alert-error {
  background: rgba(192, 57, 43, 0.1); color: #c0392b;
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 8px; padding: 0.75rem 1rem;
  font-size: 0.83rem; margin-top: 1rem;
}

/* SUMMARY PANEL */
.summary-panel {
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 12px; padding: 1.5rem;
  position: sticky; top: 80px;
}
.summary-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1.5px;
  color: var(--muted); margin-bottom: 1rem;
}
.summary-trip { margin-bottom: 0.5rem; }
.s-route { font-size: 1rem; font-weight: 600; color: var(--text); }
.s-time {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: var(--accent); line-height: 1.2;
}
.s-meta { font-size: 0.78rem; color: var(--muted); margin-top: 0.2rem; }

.summary-divider { height: 1px; background: var(--line); margin: 0.75rem 0; }

.s-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 0.5rem; }
.seat-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.seat-tag-sm {
  background: var(--tag-bg); color: var(--text);
  padding: 0.2rem 0.6rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.summary-row {
  display: flex; justify-content: space-between;
  font-size: 0.83rem; color: var(--muted); margin-bottom: 0.4rem;
}
.summary-row.total { font-weight: 600; color: var(--text); font-size: 0.9rem; margin-top: 0.25rem; }
.total-price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; color: var(--accent);
}

.btn-pay {
  width: 100%; background: var(--accent); color: #fff;
  border: none; border-radius: 8px;
  padding: 0.85rem; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  margin-top: 1rem;
}
.btn-pay:hover:not(:disabled) { background: var(--accent-hover, #c44a1e); }
.btn-pay:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }

.secure-note {
  text-align: center; font-size: 0.72rem; color: var(--muted);
  margin-top: 0.75rem;
}
</style>