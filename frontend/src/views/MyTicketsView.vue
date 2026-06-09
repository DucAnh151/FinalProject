<template>
  <div class="tickets-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <RouterLink to="/">Trang chủ</RouterLink>
        <RouterLink to="/my-tickets">Vé của tôi</RouterLink>
      </div>
      <div class="nav-user">
        <span class="role-badge">{{ auth.user?.role }}</span>
        <span>{{ auth.user?.fullName || auth.user?.email }}</span>
        <button class="btn-logout" @click="logout">Đăng xuất</button>
      </div>
    </nav>

    <div class="content">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="page-title">VÉ CỦA TÔI</div>
          <div class="page-sub">Lịch sử đặt vé và vé điện tử</div>
        </div>
        <!-- Filter -->
        <div class="filter-bar">
          <button
            v-for="f in filters"
            :key="f.value"
            :class="['filter-btn', { active: activeFilter === f.value }]"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Đang tải vé...</span>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredBookings.length === 0" class="empty-state">
        <div class="empty-icon">🎫</div>
        <div class="empty-title">Chưa có vé nào</div>
        <div class="empty-sub">Đặt vé ngay để bắt đầu hành trình</div>
        <button class="btn-book-now" @click="$router.push('/')">ĐẶT VÉ NGAY</button>
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
            <div class="price-label">Tổng tiền</div>
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
            <div class="section-label">VÉ ĐIỆN TỬ</div>
            <div class="qr-list">
              <div
                v-for="(seat, idx) in selectedBooking.seats"
                :key="idx"
                class="qr-item"
              >
                <div class="qr-seat">{{ seat }}</div>
                <!-- QR render bằng canvas -->
                <canvas
                  :ref="el => setQrCanvas(el, idx)"
                  class="qr-canvas"
                  width="160"
                  height="160"
                ></canvas>
                <div class="qr-code-text">
                  {{ getQrCode(selectedBooking.id, idx) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Thông tin chuyến -->
          <div class="info-section">
            <div class="section-label">THÔNG TIN CHUYẾN</div>
            <div class="info-row">
              <span class="info-key">Mã đặt vé</span>
              <span class="info-val mono">#{{ selectedBooking.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Ghế</span>
              <span class="info-val">{{ selectedBooking.seats.join(', ') }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Ngày đặt</span>
              <span class="info-val">{{ formatDatetime(selectedBooking.createdAt) }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Tổng tiền</span>
              <span class="info-val price-highlight">{{ formatPrice(selectedBooking.totalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()

const bookings        = ref([])
const loading         = ref(true)
const activeFilter    = ref('ALL')
const selectedBooking = ref(null)

// Map bookingId → [qrCode, ...] từ tickets
// Vì API /bookings/my không trả về qr_code, dùng format giống backend sinh ra
const qrMap = ref({})

const filters = [
  { value: 'ALL',       label: 'Tất cả' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PENDING',   label: 'Chờ thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const filteredBookings = computed(() => {
  if (activeFilter.value === 'ALL') return bookings.value
  return bookings.value.filter(b => b.status === activeFilter.value)
})

onMounted(async () => {
  await loadBookings()
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
  // Render QR sau khi modal mount
  nextTick(() => renderAllQr(booking))
}

// Render QR lên canvas dùng thuật toán QR đơn giản
// Dùng qrcode.js nếu đã cài: npm install qrcode
// Ở đây dùng dynamic import để không block nếu chưa cài
async function renderQr(canvas, text) {
  if (!canvas) return
  try {
    const QRCode = (await import('qrcode')).default
    await QRCode.toCanvas(canvas, text, {
      width: 160,
      margin: 2,
      color: { dark: '#0d0d0d', light: '#ffffff' }
    })
  } catch {
    // Fallback: vẽ placeholder nếu chưa cài qrcode
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f5f2ec'
    ctx.fillRect(0, 0, 160, 160)
    ctx.fillStyle = '#7a7468'
    ctx.font = '11px DM Sans, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QR Code', 80, 75)
    ctx.fillText(text.slice(0, 20), 80, 92)
  }
}

const canvasRefs = ref([])

function setQrCanvas(el, idx) {
  if (el) canvasRefs.value[idx] = el
}

function renderAllQr(booking) {
  canvasRefs.value = []
  nextTick(() => {
    booking.seats.forEach((_, idx) => {
      const canvas = canvasRefs.value[idx]
      const qrText = getQrCode(booking.id, idx)
      renderQr(canvas, qrText)
    })
  })
}

// QR code text — format giống backend: PAM-{bookingId}-{seatIdx}
function getQrCode(bookingId, idx) {
  return `PAM-${bookingId}-SEAT${idx + 1}`
}

function statusLabel(status) {
  const map = {
    CONFIRMED: 'Đã xác nhận',
    PENDING:   'Chờ thanh toán',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Hoàn thành',
  }
  return map[status] || status
}

function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatPrice(p) {
  if (!p) return '0đ'
  return new Intl.NumberFormat('vi-VN').format(p) + 'đ'
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.tickets-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

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
.nav-links { display: flex; gap: 0.25rem; }
.nav-links a {
  color: #aaa; text-decoration: none; font-size: 0.85rem;
  padding: 0.4rem 0.9rem; border-radius: 4px; transition: all 0.15s;
}
.nav-links a:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-links a.router-link-exact-active { color: #e85d2f; }
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge {
  font-size: 0.7rem; font-weight: 600;
  padding: 0.2rem 0.6rem; border-radius: 10px;
  background: rgba(255,255,255,0.08); color: #e85d2f;
}
.btn-logout {
  background: none; border: 1px solid #444; color: #888;
  padding: 0.25rem 0.7rem; border-radius: 4px;
  cursor: pointer; font-size: 0.78rem; transition: all 0.15s;
}
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

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
.page-sub { font-size: 0.82rem; color: #7a7468; margin-top: 0.2rem; }

.filter-bar { display: flex; gap: 0.4rem; }
.filter-btn {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 20px; padding: 0.4rem 1rem;
  font-size: 0.8rem; cursor: pointer; transition: all 0.15s; color: #7a7468;
}
.filter-btn:hover { border-color: #0d0d0d; color: #0d0d0d; }
.filter-btn.active { background: #0d0d0d; border-color: #0d0d0d; color: #fff; }

/* STATES */
.loading-state {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 3rem; color: #7a7468;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid #d4cfc6; border-top-color: #e85d2f;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 4rem 2rem;
  background: #fff; border: 1px solid #d4cfc6; border-radius: 12px;
}
.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.empty-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem; }
.empty-sub { font-size: 0.85rem; color: #7a7468; margin-bottom: 1.5rem; }
.btn-book-now {
  background: #e85d2f; color: #fff; border: none;
  padding: 0.65rem 1.75rem; border-radius: 8px;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
}

/* BOOKING LIST */
.booking-list { display: flex; flex-direction: column; gap: 0.75rem; }

.booking-card {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; overflow: hidden;
  display: flex; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.booking-card:hover {
  border-color: #e85d2f;
  box-shadow: 0 4px 16px rgba(232,93,47,0.08);
}

.status-bar { width: 4px; flex-shrink: 0; }
.status-confirmed { background: #2d7a4f; }
.status-pending   { background: #f0a500; }
.status-cancelled { background: #c0392b; }
.status-completed { background: #7a7468; }

.card-body { flex: 1; padding: 1.1rem 1.25rem; }

.card-main { margin-bottom: 0.6rem; }
.route-info { display: flex; align-items: center; gap: 0.5rem; }
.city { font-size: 1rem; font-weight: 600; }
.route-arrow { color: #e85d2f; font-weight: 600; }
.departure { font-size: 0.78rem; color: #7a7468; margin-top: 0.2rem; }

.card-seats { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.6rem; }
.seat-tag {
  background: #ede9e1; color: #0d0d0d;
  padding: 0.15rem 0.55rem; border-radius: 20px;
  font-size: 0.72rem; font-weight: 600;
}

.card-meta { display: flex; align-items: center; gap: 0.75rem; }
.booking-id { font-size: 0.72rem; color: #7a7468; font-family: 'DM Mono', monospace; }

.status-badge {
  display: inline-block; padding: 0.15rem 0.6rem;
  border-radius: 20px; font-size: 0.68rem; font-weight: 600;
}
.badge-confirmed { background: #d4edda; color: #155724; }
.badge-pending   { background: #fff3cd; color: #856404; }
.badge-cancelled { background: #f8d7da; color: #721c24; }
.badge-completed { background: #e2e3e5; color: #383d41; }

.card-price {
  padding: 1.1rem 1.5rem;
  display: flex; flex-direction: column;
  align-items: flex-end; justify-content: center;
  border-left: 1px solid #ede9e1;
  min-width: 130px;
}
.price-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: #e85d2f; line-height: 1;
}
.price-label { font-size: 0.7rem; color: #7a7468; margin-top: 0.2rem; }

/* MODAL */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 1rem;
}
.modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 560px;
  max-height: 90vh; overflow-y: auto;
  position: relative;
}
.modal-close {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; font-size: 1rem;
  color: #7a7468; cursor: pointer; padding: 0.25rem 0.5rem;
}
.modal-close:hover { color: #0d0d0d; }

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
  font-size: 1.2rem; color: #e85d2f; margin: 0.2rem 0 0.5rem;
}

.modal-body { padding: 1.5rem; }

.qr-section { margin-bottom: 1.5rem; }
.section-label {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px;
  color: #7a7468; margin-bottom: 1rem;
}
.qr-list { display: flex; flex-wrap: wrap; gap: 1rem; }
.qr-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.4rem;
}
.qr-seat {
  font-size: 0.78rem; font-weight: 600;
  background: #e85d2f; color: #fff;
  padding: 0.2rem 0.7rem; border-radius: 20px;
}
.qr-canvas { border: 1px solid #d4cfc6; border-radius: 8px; }
.qr-code-text {
  font-size: 0.62rem; color: #7a7468;
  font-family: 'DM Mono', monospace;
  max-width: 160px; text-align: center; word-break: break-all;
}

.info-section {}
.info-row {
  display: flex; justify-content: space-between;
  padding: 0.6rem 0; border-bottom: 1px solid #f0ede8;
  font-size: 0.85rem;
}
.info-row:last-child { border-bottom: none; }
.info-key { color: #7a7468; }
.info-val { font-weight: 500; }
.mono { font-family: 'DM Mono', monospace; font-size: 0.8rem; }
.price-highlight { color: #e85d2f; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; }
</style>