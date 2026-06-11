<template>
  <div class="tickets-page">
    <!-- NAV -->
    <UserHeader />

    <div class="content">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="page-title">{{ ui.t.tickets.title }}</div>
          <div class="page-sub">{{ ui.t.tickets.sub }}</div>
        </div>
        <!-- Filter + Refresh -->
        <div class="filter-bar">
          <button
            v-for="f in filters"
            :key="f.value"
            :class="['filter-btn', { active: activeFilter === f.value }]"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
          </button>
          <button class="btn-refresh" @click="loadBookings" :disabled="loading" :title="ui.locale === 'vi' ? 'Làm mới' : 'Refresh'">
            {{ loading ? '...' : '↺' }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>{{ ui.t.tickets.loading }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredBookings.length === 0" class="empty-state">
        <div class="empty-icon">🎫</div>
        <div class="empty-title">{{ ui.t.tickets.emptyTitle }}</div>
        <div class="empty-sub">{{ ui.t.tickets.emptySub }}</div>
        <button class="btn-book-now" @click="$router.push('/')">{{ ui.t.tickets.bookNow }}</button>
      </div>

      <!-- Danh sách vé -->
      <div v-else class="booking-list">
        <div
          v-for="b in filteredBookings"
          :key="b.id"
          class="booking-card"
          @click="openDetail(b)"
        >
          <!-- Status bar bên trái -->
          <div :class="['status-bar', `status-${b.status.toLowerCase()}`]"></div>

          <div class="card-body">
            <!-- Route + time -->
            <div class="card-main">
              <div class="route-info">
                <span class="city">{{ b.origin }}</span>
                <span class="route-arrow">→</span>
                <span class="city">{{ b.destination }}</span>
              </div>
              <div class="departure">{{ formatDatetime(b.departure) }}</div>
            </div>

            <!-- Seats -->
            <div class="card-seats">
              <span v-for="seat in b.seats" :key="seat" class="seat-tag">{{ seat }}</span>
            </div>

            <!-- Meta -->
            <div class="card-meta">
              <span class="booking-id">#{{ b.id }}</span>
              <span :class="['status-badge', `badge-${b.status.toLowerCase()}`]">
                {{ statusLabel(b.status) }}
              </span>
            </div>
          </div>

          <!-- Price -->
          <div class="card-price">
            <div class="price-num">{{ formatPrice(b.totalAmount) }}</div>
            <div class="price-label">{{ ui.t.tickets.totalLabel }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CHI TIẾT VÉ -->
    <div v-if="selectedBooking" class="modal-overlay" @click.self="selectedBooking = null">
      <div class="modal">
        <button class="modal-close" @click="selectedBooking = null">✕</button>

        <div class="modal-header">
          <div class="modal-route">
            {{ selectedBooking.origin }} → {{ selectedBooking.destination }}
          </div>
          <div class="modal-time">{{ formatDatetime(selectedBooking.departure) }}</div>
          <span :class="['status-badge', `badge-${selectedBooking.status.toLowerCase()}`]">
            {{ statusLabel(selectedBooking.status) }}
          </span>
        </div>

        <div class="modal-body">
          <!-- QR codes -->
          <div v-if="selectedBooking.status === 'CONFIRMED'" class="qr-section">
            <div class="section-label">{{ ui.t.tickets.ticketLabel }}</div>
            <div class="qr-list">
              <div
                v-for="ticket in selectedBooking.tickets"
                :key="ticket.id"
                class="qr-item"
              >
                <div class="qr-seat">{{ ui.t.payment.seats }} {{ seatNameForTicket(ticket) }}</div>
                <div class="qr-box">
                  <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCode)}`" alt="QR Vé" class="qr-img" />
                </div>
                <div class="qr-code-text">{{ ticket.qrCode }}</div>
              </div>
            </div>
          </div>

          <div v-else-if="selectedBooking.status === 'CASH_PENDING'" class="cash-pending-box">
            <div class="cash-pending-icon">⏳</div>
            <div class="cash-pending-title">
              {{ ui.locale === 'vi' ? 'Chờ xác nhận tiền mặt' : 'Awaiting Cash Confirmation' }}
            </div>
            <div class="cash-pending-text">{{ ui.t.tickets.cashPendingNote }}</div>
            <button class="btn-check-status" @click="loadBookings">
              {{ ui.locale === 'vi' ? '⟳ Kiểm tra trạng thái' : '⟳ Check Status' }}
            </button>
          </div>

          <!-- Thông tin chuyến -->
          <div class="info-section">
            <div class="section-label">{{ ui.t.tickets.tripInfo }}</div>
            <div class="info-row">
              <span class="info-key">{{ ui.t.tickets.bookingId }}</span>
              <span class="info-val mono">#{{ selectedBooking.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">{{ ui.t.tickets.seatsLabel }}</span>
              <span class="info-val">{{ selectedBooking.seats.join(', ') }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">{{ ui.t.tickets.bookedAt }}</span>
              <span class="info-val">{{ formatDatetime(selectedBooking.createdAt) }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">{{ ui.t.tickets.totalAmount }}</span>
              <span class="info-val price-highlight">{{ formatPrice(selectedBooking.totalAmount) }}</span>
            </div>
          </div>

          <!-- Nút hành động cho vé -->
          <div v-if="selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'PENDING' || selectedBooking.status === 'CASH_PENDING'" class="action-section">
            <!-- PENDING: Thanh toán ngay / Hủy đơn -->
            <div v-if="selectedBooking.status === 'PENDING'" class="pending-actions">
              <button
                class="btn-pay-now"
                @click="payBooking(selectedBooking)"
              >
                {{ ui.t.tickets.payNow }} ({{ formatPrice(selectedBooking.totalAmount) }})
              </button>
              <button
                class="btn-cancel-pending"
                :disabled="cancelling"
                @click="cancelBooking(selectedBooking)"
              >
                {{ cancelling ? ui.t.tickets.cancellingFree : ui.t.tickets.cancelFree }}
              </button>
            </div>

            <!-- CASH_PENDING: Hủy đơn -->
            <div v-else-if="selectedBooking.status === 'CASH_PENDING'" class="pending-actions">
              <button
                class="btn-cancel-pending"
                :disabled="cancelling"
                @click="cancelBooking(selectedBooking)"
              >
                {{ cancelling ? ui.t.tickets.cancellingFree : ui.t.tickets.cancelFree }}
              </button>
            </div>

            <!-- CONFIRMED: Hủy vé & Hoàn tiền -->
            <div v-else-if="selectedBooking.status === 'CONFIRMED'" class="confirmed-actions">
              <div class="refund-note">
                {{ ui.t.tickets.refundNote }} <strong>{{ ui.t.tickets.refundRate }}</strong> ({{ formatPrice(selectedBooking.totalAmount * 0.9) }}) {{ ui.t.tickets.refundSuffix }}
              </div>
              <button
                class="btn-cancel-ticket"
                :disabled="cancelling"
                @click="cancelBooking(selectedBooking)"
              >
                {{ cancelling ? ui.t.tickets.cancelling : ui.t.tickets.cancelBtn }}
              </button>
            </div>
            
            <div v-if="cancelError" class="alert-error">{{ cancelError }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()

const bookings        = ref([])
const loading         = ref(true)
const activeFilter    = ref('ALL')
const selectedBooking = ref(null)
const cancelling      = ref(false)
const cancelError     = ref('')

// Polling để tự động refresh khi CASH_PENDING đang mở
let cashPollInterval = null

const filters = computed(() => [
  { value: 'ALL',          label: ui.t.tickets.filterAll },
  { value: 'CONFIRMED',    label: ui.t.tickets.filterConf },
  { value: 'PENDING',      label: ui.t.tickets.filterPend },
  { value: 'CASH_PENDING', label: ui.t.tickets.filterCash },
  { value: 'CANCELLED',    label: ui.t.tickets.filterCanc },
])

const filteredBookings = computed(() => {
  if (activeFilter.value === 'ALL') return bookings.value
  return bookings.value.filter(b => b.status === activeFilter.value)
})

// Tự động poll 15s khi đang xem booking CASH_PENDING
watch(selectedBooking, (booking) => {
  if (cashPollInterval) { clearInterval(cashPollInterval); cashPollInterval = null }
  if (booking?.status === 'CASH_PENDING') {
    cashPollInterval = setInterval(async () => {
      await loadBookings()
      // Cập nhật selectedBooking từ danh sách mới
      const refreshed = bookings.value.find(b => b.id === booking.id)
      if (refreshed) {
        selectedBooking.value = refreshed
        // Nếu đã chuyển sang CONFIRMED → dừng polling
        if (refreshed.status === 'CONFIRMED') {
          clearInterval(cashPollInterval)
          cashPollInterval = null
        }
      }
    }, 15000)
  }
})

onMounted(async () => {
  await loadBookings()
})

onUnmounted(() => {
  if (cashPollInterval) { clearInterval(cashPollInterval); cashPollInterval = null }
})

async function loadBookings() {
  loading.value = true
  try {
    const res = await api.get('/bookings/my', { params: { userId: auth.user.id } })
    bookings.value = res.data
  } catch (e) {
    console.error('Load bookings error:', e)
  } finally {
    loading.value = false
  }
}

function openDetail(booking) {
  selectedBooking.value = booking
  cancelError.value = ''
}

function payBooking(booking) {
  // Normalized structure matching BookingView output
  const paymentData = {
    bookingId: booking.id,
    trip: {
      origin: booking.origin,
      destination: booking.destination,
      departureTime: booking.departure,
      operator: booking.trip?.operator || 'PAM Travel',
    },
    seats: booking.seatDetails.map(sd => ({
      seatId: sd.seatId,
      seatName: sd.seatName
    })),
    totalPrice: booking.totalAmount
  }
  sessionStorage.setItem('payment_data', JSON.stringify(paymentData))
  router.push('/payment')
}

async function cancelBooking(booking) {
  if (!confirm(ui.t.tickets?.confirmCancel || 'Bạn có chắc muốn hủy?')) return

  cancelling.value = true
  cancelError.value = ''
  try {
    const res = await api.post(`/bookings/${booking.id}/cancel`, { userId: auth.user.id })
    if (res.data.success) {
      alert(ui.t.tickets?.cancelSuccess || 'Hủy vé thành công')
      
      // Update local wallet balance using backend-returned refundAmount
      if (booking.status === 'CONFIRMED' && res.data.refundAmount) {
        const updatedUser = { ...auth.user }
        updatedUser.walletBalance = (updatedUser.walletBalance || 0) + res.data.refundAmount
        auth.setUser(updatedUser)
      }

      selectedBooking.value = null
      await loadBookings()
    }
  } catch (e) {
    cancelError.value = e.response?.data?.error || 'Cancellation failed'
  } finally {
    cancelling.value = false
  }
}

// Map ticket → seat name from seatDetails
function seatNameForTicket(ticket) {
  const parts = ticket.qrCode?.split('-')
  if (parts?.length >= 3) {
    const seatId = parts[2]
    const sd = selectedBooking.value?.seatDetails?.find(s => String(s.seatId) === seatId)
    if (sd?.seatName) return sd.seatName
  }
  const idx = selectedBooking.value?.tickets?.indexOf(ticket) ?? -1
  return selectedBooking.value?.seats?.[idx] || '?'
}

function statusLabel(status) {
  const map = {
    CONFIRMED:    ui.t.tickets.statusConf,
    PENDING:      ui.t.tickets.statusPend,
    CASH_PENDING: ui.t.tickets.statusCash,
    CANCELLED:    ui.t.tickets.statusCanc,
    COMPLETED:    ui.t.tickets.statusComp,
  }
  return map[status] || status
}

function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatPrice(p) {
  if (!p) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return new Intl.NumberFormat(ui.locale === 'vi' ? 'vi-VN' : 'en-US').format(p) + (ui.locale === 'vi' ? 'đ' : ' VND')
}
</script>

<style scoped>
.tickets-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

/* CONTENT */
.content { padding: 1.75rem 2.5rem; max-width: 900px; }

.page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 1.5rem;
}
.page-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; letter-spacing: 2px;
}
.page-sub { font-size: 0.82rem; color: var(--muted); margin-top: 0.2rem; }

.filter-bar { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.filter-btn {
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 20px; padding: 0.4rem 1rem;
  font-size: 0.8rem; cursor: pointer; transition: all 0.15s; color: var(--muted);
}
.filter-btn:hover { border-color: var(--text); color: var(--text); }
.filter-btn.active { background: var(--text); border-color: var(--text); color: var(--page-bg); }
.btn-refresh {
  background: none;
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 0.4rem 0.85rem;
  font-size: 1rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}
.btn-refresh:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* STATES */
.loading-state {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 3rem; color: var(--muted);
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--line); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 4rem 2rem;
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
}
.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.empty-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem; }
.empty-sub { font-size: 0.85rem; color: var(--muted); margin-bottom: 1.5rem; }
.btn-book-now {
  background: var(--accent); color: #fff; border: none;
  padding: 0.65rem 1.75rem; border-radius: 8px;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
}

/* BOOKING LIST */
.booking-list { display: flex; flex-direction: column; gap: 0.75rem; }

.booking-card {
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 12px; overflow: hidden;
  display: flex; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.booking-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(232,93,47,0.08);
}

.status-bar { width: 4px; flex-shrink: 0; }
.status-confirmed { background: #2d7a4f; }
.status-pending   { background: #f0a500; }
.status-cash_pending { background: #0d6efd; }
.status-cancelled { background: #c0392b; }
.status-completed { background: var(--muted); }

.card-body { flex: 1; padding: 1.1rem 1.25rem; }

.card-main { margin-bottom: 0.6rem; }
.route-info { display: flex; align-items: center; gap: 0.5rem; }
.city { font-size: 1rem; font-weight: 600; }
.route-arrow { color: var(--accent); font-weight: 600; }
.departure { font-size: 0.78rem; color: var(--muted); margin-top: 0.2rem; }

.card-seats { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
.seat-tag {
  background: var(--tag-bg); color: var(--text);
  padding: 0.15rem 0.55rem; border-radius: 20px;
  font-size: 0.72rem; font-weight: 600;
}

.card-meta { display: flex; align-items: center; gap: 0.75rem; }
.booking-id { font-size: 0.72rem; color: var(--muted); font-family: var(--font-mono, monospace); }

.status-badge {
  display: inline-block; padding: 0.15rem 0.6rem;
  border-radius: 20px; font-size: 0.68rem; font-weight: 600;
}
.badge-confirmed { background: rgba(45, 122, 79, 0.15); color: #2d7a4f; }
.badge-pending   { background: rgba(240, 165, 0, 0.15); color: #f0a500; }
.badge-cash_pending { background: rgba(13, 110, 253, 0.15); color: #0d6efd; }
.badge-cancelled { background: rgba(192, 57, 43, 0.15); color: #c0392b; }
.badge-completed { background: var(--tag-bg); color: var(--muted); }

.card-price {
  padding: 1.1rem 1.5rem;
  display: flex; flex-direction: column;
  align-items: flex-end; justify-content: center;
  border-left: 1px solid var(--line);
  min-width: 130px;
}
.price-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: var(--accent); line-height: 1;
}
.price-label { font-size: 0.7rem; color: var(--muted); margin-top: 0.2rem; }

/* MODAL */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 1rem;
}
.modal {
  background: var(--panel); border-radius: 16px;
  width: 100%; max-width: 560px;
  max-height: 90vh; overflow-y: auto;
  position: relative;
  border: 1px solid var(--line);
}
.modal-close {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; font-size: 1rem;
  color: var(--muted); cursor: pointer; padding: 0.25rem 0.5rem;
}
.modal-close:hover { color: var(--text); }

.modal-header {
  background: #0d0d0d; padding: 1.5rem;
  border-radius: 16px 16px 0 0;
}
.modal-route {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5rem; color: #fff; letter-spacing: 1px;
}
.modal-time {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; color: var(--accent); margin: 0.2rem 0 0.5rem;
}

.modal-body { padding: 1.5rem; }

.qr-section { margin-bottom: 1.5rem; }
.section-label {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px;
  color: var(--muted); margin-bottom: 1rem;
}
.qr-list { display: flex; flex-wrap: wrap; gap: 1rem; }
.qr-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.4rem;
}
.qr-seat {
  font-size: 0.78rem; font-weight: 600;
  background: var(--accent); color: #fff;
  padding: 0.2rem 0.7rem; border-radius: 20px;
}
.qr-box {
  background: #fff;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  display: inline-block;
  margin: 0.25rem 0;
}
.qr-img {
  width: 140px;
  height: 140px;
  display: block;
}
.qr-code-text {
  font-size: 0.62rem; color: var(--muted);
  font-family: var(--font-mono, monospace);
  max-width: 160px; text-align: center; word-break: break-all;
}

.cash-pending-box {
  background: rgba(13, 110, 253, 0.07);
  border: 1px solid rgba(13, 110, 253, 0.25);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
}
.cash-pending-icon { font-size: 2rem; margin-bottom: 0.5rem; }
.cash-pending-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1px;
  color: #0d6efd; margin-bottom: 0.5rem;
}
.cash-pending-text {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 1rem;
}
.btn-check-status {
  background: #0d6efd;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.25rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-check-status:hover { background: #0b5ed7; }

.info-section {
  margin-bottom: 1.5rem;
}
.info-row {
  display: flex; justify-content: space-between;
  padding: 0.6rem 0; border-bottom: 1px solid var(--line);
  font-size: 0.85rem;
}
.info-row:last-child { border-bottom: none; }
.info-key { color: var(--muted); }
.info-val { font-weight: 500; }
.mono { font-family: var(--font-mono, monospace); font-size: 0.8rem; }
.price-highlight { color: var(--accent); font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; }

/* Action Section */
.action-section {
  border-top: 1px dashed var(--line);
  padding-top: 1.25rem;
  margin-top: 1.25rem;
}
.pending-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.btn-pay-now {
  width: 100%;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.85rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-pay-now:hover {
  background: var(--accent-hover);
}
.btn-cancel-pending {
  width: 100%;
  background: var(--tag-bg);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel-pending:hover:not(:disabled) {
  background: var(--line);
  color: var(--text);
}
.btn-cancel-pending:disabled {
  background: var(--tag-bg);
  color: var(--muted);
  opacity: 0.5;
  cursor: not-allowed;
}

.refund-note {
  background: rgba(192, 57, 43, 0.1);
  color: #c0392b;
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}
.refund-note.refund-loyal {
  background: rgba(45, 122, 79, 0.1);
  color: #2d7a4f;
  border-color: rgba(45, 122, 79, 0.3);
}
.btn-cancel-ticket {
  width: 100%;
  background: #c0392b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.85rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel-ticket:hover:not(:disabled) {
  background: #a93226;
}
.btn-cancel-ticket:disabled {
  background: var(--line);
  color: var(--muted);
  cursor: not-allowed;
}
.alert-error {
  background: rgba(192, 57, 43, 0.1);
  color: #c0392b;
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  margin-top: 0.75rem;
}
</style>
