<template>
  <div class="seatmap-page">
    <!-- NAV -->
    <UserHeader backTo="/search" />

    <div v-if="loading" class="loading">{{ ui.t.seatMap.loading }}</div>

    <div :class="{ dark: ui.isDark }" v-else-if="seatData" class="content">
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
          <span>💰 {{ formatPrice(trip?.price) }}{{ ui.t.seatMap.perSeat }}</span>
        </div>
      </div>

      <div class="main-layout">
        <!-- SEAT MAP -->
        <div class="seatmap-wrap">
          <div class="legend">
            <span class="leg-item"><span class="seat-demo available"></span> {{ ui.t.seatMap.available }}</span>
            <span class="leg-item"><span class="seat-demo locked"></span> {{ ui.t.seatMap.locked }}</span>
            <span class="leg-item"><span class="seat-demo confirmed"></span> {{ ui.t.seatMap.confirmed }}</span>
            <span class="leg-item"><span class="seat-demo selected"></span> {{ ui.t.seatMap.selected }}</span>
          </div>

          <!-- Render từng tầng -->
          <div v-for="floor in floors" :key="floor" class="floor-wrap">
            <div class="floor-label">{{ ui.t.seatMap.floor }} {{ floor }}</div>
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
          <div class="sidebar-title">{{ ui.t.seatMap.selectedTitle }}</div>

          <div v-if="!selectedSeats.length" class="no-seat">
            {{ ui.t.seatMap.noSeat }}
          </div>

          <div v-else class="selected-list">
            <div v-for="s in selectedSeats" :key="s.seatId" class="selected-item">
              <span>{{ s.seatName }}</span>
              <span class="remove" @click="toggleSeat(s)">✕</span>
            </div>
          </div>

          <div class="price-summary" v-if="selectedSeats.length">
            <div class="price-row">
              <span>{{ selectedSeats.length }} {{ ui.t.seatMap.priceLabel }} {{ formatPrice(trip?.price) }}đ</span>
            </div>
            <div class="price-total">
              <span>{{ ui.t.seatMap.total }}</span>
              <span class="total-num">{{ formatPrice(totalPrice) }}đ</span>
            </div>
          </div>

          <div v-if="error" class="alert-error">{{ error }}</div>

          <button
            class="btn-book"
            :disabled="!selectedSeats.length || booking"
            @click="doBooking"
          >
            {{ booking ? ui.t.seatMap.booking : `${ui.t.seatMap.bookBtn} ${selectedSeats.length} ${ui.t.seatMap.seatsSuffix}` }}
          </button>

          <div class="max-note">{{ ui.t.seatMap.maxNote }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBookingStore } from '../stores/bookingStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const ui     = useUiStore()
const bookStore = useBookingStore()

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
  trip.value = bookStore.selectedTrip || JSON.parse(sessionStorage.getItem('selected_trip') || 'null')
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
    error.value = ui.t.seatMap.loading
  } finally {
    loading.value = false
  }
}

// Check bookingStore if selected seats exist (restore progress)
if (bookStore.bookingId && String(bookStore.selectedTrip?.id) === String(tripId)) {
  selectedSeats.value = bookStore.seats
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
      error.value = ui.t.seatMap.errMax
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

    // Lưu vào bookingStore thay sessionStorage thô
    bookStore.setBookingResult({
      bookingId: res.data.bookingId,
      expiresAt: res.data.expiresAt,
      seats:     selectedSeats.value,
      trip:      trip.value,
      totalPrice: selectedSeats.value.length * (trip.value?.price || 0),
    })

    router.push('/booking')
  } catch (e) {
    error.value = e.response?.data?.error || ui.t.seatMap.errFail
  } finally {
    booking.value = false
  }
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(p) {
  return parseInt(p || 0).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US')
}
</script>

<style scoped>
.seatmap-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; transition: background 0.2s, color 0.2s; }

.loading { text-align: center; padding: 4rem; color: var(--muted); }

.content { padding: 1.5rem 2.5rem; }

.trip-info {
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;
  display: flex; align-items: center; justify-content: space-between;
}
.trip-route { display: flex; align-items: center; gap: 0.75rem; }
.city { font-size: 1.2rem; font-weight: 600; color: var(--text); }
.arrow { color: var(--accent); font-weight: 600; font-size: 1.2rem; }
.trip-meta { display: flex; gap: 1.5rem; font-size: 0.85rem; color: var(--muted); }

.main-layout { display: grid; grid-template-columns: 1fr 280px; gap: 1.5rem; }

.seatmap-wrap {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 10px; padding: 1.5rem;
}
.legend {
  display: flex; gap: 1.5rem; margin-bottom: 1.5rem;
  padding-bottom: 1rem; border-bottom: 1px solid var(--line);
}
.leg-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--muted); }
.seat-demo {
  width: 20px; height: 20px; border-radius: 4px; border: 1.5px solid;
}
.seat-demo.available  { background: rgba(74, 222, 128, 0.1); border-color: #4ade80; }
.seat-demo.locked     { background: rgba(253, 224, 71, 0.1); border-color: #fde047; }
.seat-demo.confirmed  { background: rgba(148, 163, 184, 0.1); border-color: #94a3b8; }
.seat-demo.selected   { background: var(--accent); border-color: var(--accent); }

.floor-wrap { margin-bottom: 1.5rem; }
.floor-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 1px; color: var(--muted); margin-bottom: 0.75rem;
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
  background: rgba(74, 222, 128, 0.1); border-color: #4ade80; color: #4ade80;
}
.seat.available:hover {
  background: rgba(74, 222, 128, 0.2); border-color: #22c55e; transform: scale(1.05);
}
.seat.locked    { background: rgba(253, 224, 71, 0.1); border-color: #fde047; color: #eab308; cursor: not-allowed; }
.seat.confirmed { background: rgba(148, 163, 184, 0.1); border-color: #64748b; color: #64748b; cursor: not-allowed; }
.seat.selected  { background: var(--accent); border-color: var(--accent); color: #fff; transform: scale(1.05); }

/* SIDEBAR */
.sidebar {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 10px; padding: 1.25rem;
  height: fit-content; position: sticky; top: 80px;
}
.sidebar-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; letter-spacing: 1px; margin-bottom: 1rem;
  color: var(--text);
}
.no-seat { color: var(--muted); font-size: 0.85rem; text-align: center; padding: 1rem 0; }
.selected-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.selected-item {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--page-bg); padding: 0.4rem 0.75rem; border-radius: 6px;
  font-size: 0.85rem; font-weight: 500;
  color: var(--text);
}
.remove { cursor: pointer; color: #c0392b; font-size: 0.75rem; }
.remove:hover { color: #e74c3c; }

.price-summary {
  border-top: 1px solid var(--line);
  padding-top: 0.75rem; margin-bottom: 1rem;
}
.price-row { font-size: 0.82rem; color: var(--muted); margin-bottom: 0.4rem; }
.price-total {
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600;
  color: var(--text);
}
.total-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: var(--accent);
}

.alert-error {
  background: #fdf0ef; color: #c0392b; border: 1px solid #f5c6c2;
  padding: 0.6rem 0.75rem; border-radius: 6px; font-size: 0.82rem;
  margin-bottom: 0.75rem;
}
.btn-book {
  width: 100%; background: var(--accent); color: #fff; border: none;
  border-radius: 8px; padding: 0.8rem; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.btn-book:hover:not(:disabled) { background: var(--accent-hover); }
.btn-book:disabled { background: var(--line); cursor: not-allowed; }
.max-note { text-align: center; font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; }

@media (max-width: 768px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
  }
  .content {
    padding: 1rem;
  }
}
</style>