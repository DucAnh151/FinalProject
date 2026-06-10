<template>
  <div class="seatmap-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <button class="btn-back" @click="router.push('/search')">← Quay lại</button>
    </nav>

    <div v-if="loading" class="loading">Đang tải sơ đồ ghế...</div>

    <div v-else-if="seatData" class="content">
      <!-- Trip info -->
      <div class="trip-info">
        <div class="trip-route">
          <span class="city">{{ trip?.origin }}</span>
          <span class="arrow">→</span>
          <span class="city">{{ trip?.destination }}</span>
        </div>
        <div class="trip-meta">
          <span>🕐 {{ formatTime(trip?.departureTime) }}</span>
          <span>🚌 {{ seatData.vehicleType }}</span>
          <span>💰 {{ formatPrice(trip?.price) }}đ/ghế</span>
        </div>
      </div>

      <div class="main-layout">
        <!-- SEAT MAP -->
        <div class="seatmap-wrap">
          <div class="legend">
            <span class="leg-item"><span class="seat-demo available"></span> Trống</span>
            <span class="leg-item"><span class="seat-demo locked"></span> Đang giữ</span>
            <span class="leg-item"><span class="seat-demo confirmed"></span> Đã đặt</span>
            <span class="leg-item"><span class="seat-demo selected"></span> Đang chọn</span>
          </div>

          <!-- Render từng tầng -->
          <div v-for="floor in floors" :key="floor" class="floor-wrap">
            <div class="floor-label">Tầng {{ floor }}</div>
            <div class="floor-grid">
              <template v-for="row in getRows(floor)" :key="row">
                <div class="seat-row">
                  <template v-for="seat in getSeatsInRow(floor, row)" :key="seat.seatId">
                    <div
                      :class="['seat', getSeatClass(seat)]"
                      @click="toggleSeat(seat)"
                      :title="seat.seatName"
                    >
                      {{ seat.seatName.split('-')[1] || seat.seatName }}
                    </div>
                    <div v-if="hasAisleAfter(floor, seat.col)" class="aisle-spacer"></div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- SIDEBAR -->
        <div class="sidebar">
          <div class="sidebar-title">GHẾ ĐÃ CHỌN</div>

          <div v-if="!selectedSeats.length" class="no-seat">
            Chưa chọn ghế nào
          </div>

          <div v-else class="selected-list">
            <div v-for="s in selectedSeats" :key="s.seatId" class="selected-item">
              <span>{{ s.seatName }}</span>
              <span class="remove" @click="toggleSeat(s)">✕</span>
            </div>
          </div>

          <div class="price-summary" v-if="selectedSeats.length">
            <div class="price-row">
              <span>{{ selectedSeats.length }} ghế × {{ formatPrice(trip?.price) }}đ</span>
            </div>
            <div class="price-total">
              <span>Tổng</span>
              <span class="total-num">{{ formatPrice(totalPrice) }}đ</span>
            </div>
          </div>

          <div v-if="error" class="alert-error">{{ error }}</div>

          <button
            class="btn-book"
            :disabled="!selectedSeats.length || booking"
            @click="doBooking"
          >
            {{ booking ? 'Đang đặt chỗ...' : `ĐẶT ${selectedSeats.length} GHẾ →` }}
          </button>

          <div class="max-note">Tối đa 5 ghế mỗi lần đặt</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const seatData     = ref(null)
const loading      = ref(true)
const error        = ref('')
const booking      = ref(false)
const selectedSeats = ref([])
const trip         = ref(null)
const stops        = ref([])

const tripId = route.params.id

// Polling interval
let pollInterval = null

const floors = computed(() => {
  if (!seatData.value) return []
  const layout = seatData.value.layout
  return Array.from({ length: layout.floors }, (_, i) => i + 1)
})

const totalPrice = computed(() => {
  return selectedSeats.value.length * (trip.value?.price || 0)
})

onMounted(async () => {
  trip.value = JSON.parse(sessionStorage.getItem('selected_trip') || 'null')
  await Promise.all([loadSeatMap(), loadStops()])

  // Polling mỗi 5 giây
  pollInterval = setInterval(loadSeatMap, 5000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

async function loadStops() {
  try {
    const res = await api.get(`/trips/${tripId}/stops`)
    stops.value = res.data.stops
  } catch (e) {
    console.error('Không tải được danh sách điểm dừng', e)
  }
}

async function loadSeatMap() {
  try {
    const res = await api.get(`/trips/${tripId}/seat-map`)
    seatData.value = res.data

    // Cập nhật trạng thái ghế đang chọn
    // Nếu ghế bị người khác lock thì bỏ chọn
    selectedSeats.value = selectedSeats.value.filter(sel => {
      const current = res.data.seats.find(s => s.seatId === sel.seatId)
      return current?.status === 'AVAILABLE'
    })
  } catch (e) {
    error.value = 'Không tải được sơ đồ ghế'
  } finally {
    loading.value = false
  }
}

function getRows(floor) {
  const layout = seatData.value?.layout
  if (!layout) return []
  const floorData = layout[`floor_${floor}`]
  if (!floorData) return []
  return Array.from({ length: floorData.rows }, (_, i) => i + 1)
}

function getSeatsInRow(floor, row) {
  if (!seatData.value) return []
  return seatData.value.seats
    .filter(s => s.floor === floor && s.row === row)
    .sort((a, b) => a.col - b.col)
}

function hasAisleAfter(floor, col) {
  const layout = seatData.value?.layout
  if (!layout) return false
  const floorData = layout[`floor_${floor}`]
  return floorData && floorData.aisle_after_col === col
}

function getSeatClass(seat) {
  const isSelected = selectedSeats.value.some(s => s.seatId === seat.seatId)
  if (isSelected)               return 'selected'
  if (seat.status === 'CONFIRMED') return 'confirmed'
  if (seat.status === 'LOCKED')    return 'locked'
  return 'available'
}

function toggleSeat(seat) {
  if (seat.status === 'CONFIRMED' || seat.status === 'LOCKED') return

  const idx = selectedSeats.value.findIndex(s => s.seatId === seat.seatId)
  if (idx >= 0) {
    selectedSeats.value.splice(idx, 1)
  } else {
    if (selectedSeats.value.length >= 5) {
      error.value = 'Tối đa 5 ghế mỗi lần đặt'
      return
    }
    selectedSeats.value.push(seat)
    error.value = ''
  }
}

async function doBooking() {
  error.value = ''
  booking.value = true

  try {
    const pickup = stops.value.find(s => s.type === 'PICKUP' || s.type === 'BOTH')
    const dropoff = [...stops.value].reverse().find(s => s.type === 'DROPOFF' || s.type === 'BOTH')

    const res = await api.post('/bookings', {
      userId:          auth.user.id,
      tripId:          parseInt(tripId),
      pickupStopId:    pickup ? pickup.id : 1,
      dropoffStopId:   dropoff ? dropoff.id : 2,
      selectedSeatIds: selectedSeats.value.map(s => s.seatId),
    })

    // Lưu booking info để PaymentView dùng
    sessionStorage.setItem('current_booking', JSON.stringify({
      ...res.data,
      trip:  trip.value,
      seats: selectedSeats.value,
    }))

    router.push('/booking')
  } catch (e) {
    error.value = e.response?.data?.error || 'Đặt chỗ thất bại'
  } finally {
    booking.value = false
  }
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(p) {
  return parseInt(p || 0).toLocaleString('vi-VN')
}
</script>

<style scoped>
.seatmap-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

.navbar {
  background: #0d0d0d;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2.5rem; height: 60px;
  position: sticky; top: 0; z-index: 100;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem; color: #e85d2f; letter-spacing: 2px; text-decoration: none;
}
.btn-back {
  background: none; border: 1px solid #444; color: #888;
  padding: 0.4rem 0.9rem; border-radius: 4px; cursor: pointer;
  font-size: 0.85rem; transition: all 0.15s;
}
.btn-back:hover { border-color: #e85d2f; color: #e85d2f; }

.loading { text-align: center; padding: 4rem; color: #7a7468; }

.content { padding: 1.5rem 2.5rem; }

.trip-info {
  background: #fff; border: 1px solid #d4cfc6; border-radius: 10px;
  padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;
  display: flex; align-items: center; justify-content: space-between;
}
.trip-route { display: flex; align-items: center; gap: 0.75rem; }
.city { font-size: 1.2rem; font-weight: 600; }
.arrow { color: #e85d2f; font-weight: 600; font-size: 1.2rem; }
.trip-meta { display: flex; gap: 1.5rem; font-size: 0.85rem; color: #7a7468; }

.main-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; }

.seatmap-wrap {
  background: #fff; border: 1px solid #d4cfc6;
  border-radius: 10px; padding: 1.5rem;
}
.legend {
  display: flex; gap: 1.5rem; margin-bottom: 1.5rem;
  padding-bottom: 1rem; border-bottom: 1px solid #f0ede8;
}
.leg-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #7a7468; }
.seat-demo {
  width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid;
}
.seat-demo.available  { background: #f0fdf4; border-color: #86efac; }
.seat-demo.locked     { background: #fefce8; border-color: #fde047; }
.seat-demo.confirmed  { background: #f1f5f9; border-color: #94a3b8; }
.seat-demo.selected   { background: #e85d2f; border-color: #e85d2f; }

.floor-wrap { margin-bottom: 1.5rem; }
.floor-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 1px; color: #7a7468; margin-bottom: 0.75rem;
}
.floor-grid { display: flex; flex-direction: column; gap: 0.4rem; }
.seat-row { display: flex; gap: 0.4rem; }
.aisle-spacer {
  width: 28px;
  flex-shrink: 0;
}

.seat {
  width: 48px; height: 48px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 500; border: 1.5px solid;
  cursor: pointer; transition: all 0.12s; user-select: none;
}
.seat.available {
  background: #f0fdf4; border-color: #86efac; color: #166534;
}
.seat.available:hover {
  background: #dcfce7; border-color: #4ade80; transform: scale(1.05);
}
.seat.locked    { background: #fefce8; border-color: #fde047; color: #854d0e; cursor: not-allowed; }
.seat.confirmed { background: #f1f5f9; border-color: #94a3b8; color: #94a3b8; cursor: not-allowed; }
.seat.selected  { background: #e85d2f; border-color: #e85d2f; color: #fff; transform: scale(1.05); }

/* SIDEBAR */
.sidebar {
  background: #fff; border: 1px solid #d4cfc6;
  border-radius: 10px; padding: 1.25rem;
  height: fit-content; position: sticky; top: 80px;
}
.sidebar-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; letter-spacing: 1px; margin-bottom: 1rem;
}
.no-seat { color: #7a7468; font-size: 0.85rem; text-align: center; padding: 1rem 0; }
.selected-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.selected-item {
  display: flex; justify-content: space-between; align-items: center;
  background: #f5f2ec; padding: 0.4rem 0.75rem; border-radius: 6px;
  font-size: 0.85rem; font-weight: 500;
}
.remove { cursor: pointer; color: #c0392b; font-size: 0.75rem; }
.remove:hover { color: #e74c3c; }

.price-summary {
  border-top: 1px solid #f0ede8;
  padding-top: 0.75rem; margin-bottom: 1rem;
}
.price-row { font-size: 0.82rem; color: #7a7468; margin-bottom: 0.4rem; }
.price-total {
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600;
}
.total-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: #e85d2f;
}

.alert-error {
  background: #fdf0ef; color: #c0392b; border: 1px solid #f5c6c2;
  padding: 0.6rem 0.75rem; border-radius: 6px; font-size: 0.82rem;
  margin-bottom: 0.75rem;
}
.btn-book {
  width: 100%; background: #e85d2f; color: #fff; border: none;
  border-radius: 8px; padding: 0.8rem; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-book:hover:not(:disabled) { background: #c44a1e; }
.btn-book:disabled { background: #d4cfc6; cursor: not-allowed; }
.max-note { text-align: center; font-size: 0.75rem; color: #7a7468; margin-top: 0.5rem; }
</style>