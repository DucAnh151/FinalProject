<template>
  <div class="driver-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <button :class="['tab-btn', { active: mainView === 'trips' }]" @click="mainView = 'trips'">
          🚌 {{ ui.t.driver.myTrips }}
        </button>
        <button :class="['tab-btn', { active: mainView === 'scanner' }]" @click="mainView = 'scanner'">
          📷 {{ ui.t.driver.scanner }}
        </button>
      </div>
      <div class="nav-user-wrap">
        <!-- Theme toggle -->
        <button class="icon-btn" type="button" :aria-label="ui.t.header.theme" @click="ui.toggleDark()">
          {{ ui.isDark ? '☀' : '◐' }}
        </button>
        <!-- Language toggle -->
        <button class="text-btn" type="button" @click="ui.toggleLocale()">
          {{ ui.locale === 'vi' ? 'EN' : 'VI' }}
        </button>

        <div class="nav-user" style="position:relative">
          <div class="user-trigger-driver" @click.stop="showDriverDropdown = !showDriverDropdown">
            <span class="role-badge">DRIVER</span>
            <span class="username">{{ auth.user?.fullName }} </span>
            <img :src="driverAvatarSrc" class="nav-avatar-small" :alt="auth.user?.fullName" />▼
          </div>
          <div v-if="showDriverDropdown" class="dropdown-menu-dark">
            <RouterLink to="/settings" class="dropdown-item-dark">⚙ {{ ui.t.nav.settings }}</RouterLink>
            <button class="dropdown-item-dark btn-logout-item" @click="logout">🚪 {{ ui.t.nav.logout }}</button>
          </div>
        </div>
      </div>
    </nav>

    <!-- ══════════════════════════════ -->
    <!--   VIEW 1: CHUYẾN CỦA TÔI      -->
    <!-- ══════════════════════════════ -->
    <div v-if="mainView === 'trips'" class="content">
      <div class="page-header-row">
        <div>
          <div class="page-title">{{ ui.t.driver.myTripsTitle }}</div>
          <div class="page-sub">{{ ui.locale === 'vi' ? 'Các chuyến xe được phân công cho' : 'Trips assigned to' }} {{ auth.user?.fullName }}</div>
        </div>
        <button class="btn-reload" @click="loadMyTrips" :disabled="loadingTrips">
          {{ loadingTrips ? ui.t.driver.refreshing : ui.t.driver.refresh }}
        </button>
      </div>

      <!-- Loading / Empty -->
      <div v-if="loadingTrips" class="state-box">
        <div class="spinner"></div>
        <span>{{ ui.t.driver.loading }}</span>
      </div>

      <div v-else-if="!myTrips.length" class="state-box empty">
        <div class="empty-icon">🚌</div>
        <div class="empty-title">{{ ui.t.driver.noTrips }}</div>
        <div class="empty-sub">{{ ui.t.driver.noTripsSub }}</div>
      </div>

      <!-- Trip cards -->
      <div v-else class="trip-list">
        <div
          v-for="trip in myTrips"
          :key="trip.id"
          :class="['trip-card', { 'trip-active': isToday(trip.departureTime) }]"
        >
          <div class="trip-card-left">
            <div class="trip-date-badge" :class="getTripDateClass(trip.departureTime)">
              <span class="td-day">{{ getDay(trip.departureTime) }}</span>
              <span class="td-mon">{{ getMonthYear(trip.departureTime) }}</span>
            </div>
          </div>

          <div class="trip-card-body">
            <div class="trip-route">
              <span class="city">{{ trip.origin }}</span>
              <span class="arr">→</span>
              <span class="city">{{ trip.destination }}</span>
            </div>
            <div class="trip-meta-row">
              <span class="meta-item">🕐 {{ formatTime(trip.departureTime) }} — {{ formatTime(trip.arrivalTime) }}</span>
              <span class="meta-item">🚐 {{ trip.vehicleType }}</span>
              <span class="meta-item">🏢 {{ trip.operator }}</span>
            </div>
            <div class="trip-meta-row">
              <span :class="['status-badge', `s-${trip.status.toLowerCase()}`]">{{ trip.status }}</span>
              <span class="meta-item">👥 {{ trip.passengerCount }} {{ ui.t.driver.passengers }}</span>
            </div>
          </div>

          <div class="trip-card-right">
            <button
              class="btn-manifest"
              @click="openManifest(trip)"
              :disabled="trip.passengerCount === 0"
            >
              {{ ui.t.driver.viewPassengers }}
            </button>
            <button
              class="btn-scanner-trip"
              @click="goToScanner(trip)"
            >
              {{ ui.t.driver.scanTickets }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════ -->
    <!--   VIEW 2: SOÁT VÉ (SCANNER)   -->
    <!-- ══════════════════════════════ -->
    <div v-if="mainView === 'scanner'" class="content">
      <div class="page-header-row">
        <div>
          <div class="page-title">{{ ui.t.driver.scanTitle }}</div>
          <div class="page-sub" v-if="scannerTrip">
            {{ ui.locale === 'vi' ? 'Chuyến' : 'Trip' }} #{{ scannerTrip.id }}: {{ scannerTrip.origin }} → {{ scannerTrip.destination }}
            · {{ formatTime(scannerTrip.departureTime) }}
          </div>
          <div class="page-sub" v-else>{{ ui.t.driver.scanSub }}</div>
        </div>
        <button v-if="scannerTrip" class="btn-clear-trip" @click="scannerTrip = null">
          {{ ui.t.driver.clearTrip }}
        </button>
      </div>

      <div class="layout">
        <!-- LEFT: scanner + input -->
        <div class="scanner-panel">

          <!-- Camera scanner -->
          <div class="camera-section">
            <div class="section-label">{{ ui.t.driver.cameraTitle }}</div>

            <div v-if="!cameraActive" class="camera-placeholder">
              <div class="cam-icon">📷</div>
              <div class="cam-note">{{ ui.t.driver.cameraNote }}</div>
              <button class="btn-camera" @click="startCamera">{{ ui.t.driver.startCamera }}</button>
            </div>

            <div class="camera-wrap" v-else>
              <video ref="videoEl" class="camera-video" autoplay playsinline></video>
              <div class="scan-overlay">
                <div class="scan-frame"></div>
              </div>
              <button class="btn-stop-camera" @click="stopCamera">{{ ui.t.driver.stopCamera }}</button>
            </div>
          </div>

          <div class="divider-row">
            <span class="divider-line"></span>
            <span class="divider-text">{{ ui.t.driver.orLabel }}</span>
            <span class="divider-line"></span>
          </div>

          <!-- Manual input -->
          <div class="manual-section">
            <div class="section-label">{{ ui.t.driver.manualTitle }}</div>
            <div class="input-row">
              <input
                v-model="manualQr"
                type="text"
                :placeholder="ui.t.driver.manualPlaceholder"
                class="qr-input"
                @keyup.enter="checkIn(manualQr)"
              />
              <button
                class="btn-checkin"
                :disabled="!manualQr.trim() || checking"
                @click="checkIn(manualQr)"
              >
                {{ checking ? ui.t.driver.checking : ui.t.driver.checkBtn }}
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT: kết quả -->
        <div class="result-panel">
          <div class="section-label">{{ ui.t.driver.resultTitle }}</div>

          <div v-if="!result && !checking" class="result-waiting">
            <div class="wait-icon">🎫</div>
            <div class="wait-text">{{ ui.t.driver.waiting }}</div>
          </div>

          <div v-if="checking" class="result-checking">
            <div class="spinner"></div>
            <span>{{ ui.t.driver.checkingMsg }}</span>
          </div>

          <div v-if="result && result.valid" class="result-valid">
            <div class="result-icon valid-icon">✓</div>
            <div class="result-title">{{ ui.t.driver.validTitle }}</div>
            <div class="result-sub">{{ ui.t.driver.validSub }}</div>
            <div class="ticket-info">
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoPassenger }}</span><span class="info-val">{{ result.passengerName }}</span></div>
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoPhone }}</span><span class="info-val">{{ result.passengerPhone }}</span></div>
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoSeat }}</span><span class="info-val">{{ result.seatName }}</span></div>
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoRoute }}</span><span class="info-val">{{ result.origin }} → {{ result.destination }}</span></div>
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoDep }}</span><span class="info-val">{{ formatDatetime(result.departureTime) }}</span></div>
              <div class="info-row"><span class="info-key">{{ ui.t.driver.infoQr }}</span><span class="info-val mono">{{ result.qrCode }}</span></div>
            </div>
            <button class="btn-reset" @click="reset">{{ ui.t.driver.nextScan }}</button>
          </div>

          <div v-if="result && !result.valid" class="result-invalid">
            <div class="result-icon invalid-icon">✕</div>
            <div class="result-title">{{ ui.t.driver.invalidTitle }}</div>
            <div class="result-sub">{{ result.reason }}</div>
            <button class="btn-reset" @click="reset">{{ ui.t.driver.retry }}</button>
          </div>
        </div>
      </div>

      <!-- Check-in history -->
      <div v-if="history.length > 0" class="history-section">
        <div class="section-label">{{ ui.t.driver.historyTitle }} ({{ history.length }} {{ ui.t.driver.tickets }})</div>
        <div class="history-list">
          <div
            v-for="(h, idx) in history" :key="idx"
            :class="['history-item', h.valid ? 'h-valid' : 'h-invalid']"
          >
            <span class="h-icon">{{ h.valid ? '✓' : '✕' }}</span>
            <span class="h-qr mono">{{ h.qrCode }}</span>
            <span class="h-name">{{ h.valid ? h.passengerName : h.reason }}</span>
            <span class="h-time">{{ formatTime(h.checkedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════ -->
    <!--   MODAL: MANIFEST HÀNH KHÁCH      -->
    <!-- ══════════════════════════════════ -->
    <div v-if="manifestModal" class="modal-overlay" @click.self="manifestModal = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ ui.t.driver.manifestTitle }}</div>
          <div class="modal-sub">
            {{ selectedTrip?.origin }} → {{ selectedTrip?.destination }}
            · {{ formatTime(selectedTrip?.departureTime) }}
            · {{ formatDate(selectedTrip?.departureTime) }}
          </div>
          <button class="modal-close" @click="manifestModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- Toast thông báo -->
          <div v-if="cashConfirmToast" class="toast-success">✓ {{ cashConfirmToast }}</div>
          <div v-if="cashConfirmError" class="toast-error">✕ {{ cashConfirmError }}</div>
          <div v-if="loadingManifest" class="state-box">
            <div class="spinner"></div>
            <span>{{ ui.locale === 'vi' ? 'Đang tải danh sách hành khách...' : 'Loading passenger list...' }}</span>
          </div>

          <div v-else-if="!manifest.length" class="state-box empty" style="padding:2rem">
            <div>{{ ui.locale === 'vi' ? 'Chưa có hành khách nào trong chuyến này' : 'No passengers on this trip yet' }}</div>
          </div>

          <template v-else>
            <div v-if="cashPendingBookings.length" class="cash-pending-section">
              <div class="section-label">{{ ui.t.driver.confirmCash }}</div>
              <div
                v-for="cb in cashPendingBookings"
                :key="cb.bookingId"
                class="cash-pending-row"
              >
                <span>#{{ cb.bookingId }} · {{ cb.seatCount }} {{ ui.t.driver.passengers }} · {{ formatPrice(cb.totalAmount) }}</span>
                <button
                  class="btn-confirm-cash"
                  :disabled="confirmingCash === cb.bookingId"
                  @click="confirmCashPayment(cb.bookingId)"
                >
                  {{ confirmingCash === cb.bookingId ? ui.t.driver.confirmingCash : ui.t.driver.confirmCash }}
                </button>
              </div>
            </div>

            <div class="manifest-summary">
              <span>{{ ui.t.driver.manifestTotal }} <strong>{{ manifest.length }} {{ ui.t.driver.passengers }}</strong></span>
              <span>{{ ui.t.driver.manifestCI }} <strong class="ci-count">{{ checkedInCount }} / {{ manifest.length }}</strong></span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{{ ui.t.driver.tblNum }}</th>
                    <th>{{ ui.t.driver.tblPassenger }}</th>
                    <th>{{ ui.t.driver.tblSeat }}</th>
                    <th>{{ ui.t.driver.tblPickup }}</th>
                    <th>{{ ui.t.driver.tblDropoff }}</th>
                    <th>{{ ui.t.driver.tblQr }}</th>
                    <th>{{ ui.t.driver.tblStatus }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(p, idx) in manifest"
                    :key="idx"
                    :class="{ 'row-checkedin': p.ticketStatus === 'USED' }"
                  >
                    <td class="mono">{{ idx + 1 }}</td>
                    <td>
                      <div style="font-weight:500">{{ p.passengerName }}</div>
                      <div class="mono" style="font-size:0.72rem;color:var(--muted)">{{ p.passengerPhone }}</div>
                    </td>
                    <td style="white-space:nowrap">
                      <div class="seat-cell">
                        <span :class="['seat-chip', p.floor === 2 ? 'seat-chip-f2' : 'seat-chip-f1']">
                          {{ p.seatName }}
                        </span>
                        <span class="floor-badge">{{ ui.locale === 'vi' ? 'T' : 'F' }}{{ p.floor }}</span>
                      </div>
                    </td>
                    <td style="font-size:0.8rem">{{ p.pickupStop }}</td>
                    <td style="font-size:0.8rem">{{ p.dropoffStop }}</td>
                    <td class="mono" style="font-size:0.7rem">{{ p.qrCode || '—' }}</td>
                    <td>
                      <span :class="['ticket-badge', `tb-${(p.ticketStatus || 'none').toLowerCase()}`]">
                        {{ ticketLabel(p.ticketStatus) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()
const showDriverDropdown = ref(false)

const driverAvatarSrc = computed(() => {
  if (auth.user?.avatarUrl) return auth.user.avatarUrl
  const initial = (auth.user?.fullName || 'D')[0].toUpperCase()
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" rx="6" fill="%23e85d2f"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="white">${initial}</text></svg>`
})

function closeDriverDropdown() { showDriverDropdown.value = false }
// ── Views ──
const mainView = ref('trips')

// ── My trips ──
const myTrips      = ref([])
const loadingTrips = ref(false)

// ── Manifest ──
const manifestModal   = ref(false)
const selectedTrip    = ref(null)
const manifest        = ref([])
const cashPendingBookings = ref([])
const loadingManifest = ref(false)
const confirmingCash  = ref(null)
const cashConfirmToast = ref('')
const cashConfirmError = ref('')

// ── Scanner ──
const scannerTrip  = ref(null)
const manualQr     = ref('')
const checking     = ref(false)
const result       = ref(null)
const history      = ref([])
const cameraActive = ref(false)
const videoEl      = ref(null)
let stream         = null
let barcodeInterval = null

const checkedInCount = computed(() =>
  manifest.value.filter(p => p.ticketStatus === 'USED').length
)

onMounted(() => {
  loadMyTrips()
})

onUnmounted(() => {
  stopCamera()
  if (barcodeInterval) clearInterval(barcodeInterval)
})

// ── Load driver's trips ──
async function loadMyTrips() {
  loadingTrips.value = true
  try {
    const res = await api.get('/admin/driver-trips', { params: { driverId: auth.user.id } })
    myTrips.value = res.data
  } catch {
    myTrips.value = []
  } finally {
    loadingTrips.value = false
  }
}

// ── Open manifest modal ──
async function openManifest(trip) {
  selectedTrip.value   = trip
  manifestModal.value  = true
  loadingManifest.value = true
  manifest.value = []
  cashPendingBookings.value = []
  try {
    const res = await api.get(`/admin/driver-manifest/${trip.id}`)
    manifest.value = res.data.manifest
    cashPendingBookings.value = res.data.cashPendingBookings || []
  } catch {
    manifest.value = []
  } finally {
    loadingManifest.value = false
  }
}

// ── Go to scanner with trip context ──
function goToScanner(trip) {
  scannerTrip.value = trip
  mainView.value = 'scanner'
}

async function confirmCashPayment(bookingId) {
  confirmingCash.value = bookingId
  try {
    await api.put(`/driver/bookings/${bookingId}/confirm-cash`, {
      driverId: auth.user.id,
    })
    // Reload manifest để hiển thị QR mới phát hành
    if (selectedTrip.value) await openManifest(selectedTrip.value)
    // Toast thành công
    cashConfirmToast.value = ui.t.driver.cashConfirmed
    setTimeout(() => { cashConfirmToast.value = '' }, 4000)
  } catch (e) {
    cashConfirmError.value = e.response?.data?.error || 'Confirm failed'
    setTimeout(() => { cashConfirmError.value = '' }, 4000)
  } finally {
    confirmingCash.value = null
  }
}

// ── Check-in ──
async function checkIn(qrCode) {
  if (!qrCode?.trim()) return
  checking.value = true
  result.value   = null

  try {
    const res = await api.post('/tickets/check-in', {
      qrCode:   qrCode.trim(),
      driverId: auth.user.id,
    })
    result.value = { valid: true, ...res.data, qrCode: qrCode.trim(), checkedAt: new Date() }
    history.value.unshift(result.value)
    manualQr.value = ''
  } catch (e) {
    const reason = e.response?.data?.error || (ui.locale === 'vi' ? 'Mã QR không hợp lệ' : 'Invalid QR code')
    result.value  = { valid: false, reason, qrCode: qrCode.trim(), checkedAt: new Date() }
    history.value.unshift(result.value)
    manualQr.value = ''
  } finally {
    checking.value = false
  }
}

function reset() { result.value = null; manualQr.value = '' }

// ── Camera ──
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    cameraActive.value = true
    setTimeout(() => { if (videoEl.value) videoEl.value.srcObject = stream }, 100)
    if ('BarcodeDetector' in window) startBarcodeDetection()
  } catch {
    alert(ui.locale === 'vi' ? 'Không thể truy cập camera. Vui lòng dùng nhập thủ công.' : 'Could not access camera. Please use manual entry.')
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  cameraActive.value = false
  if (barcodeInterval) { clearInterval(barcodeInterval); barcodeInterval = null }
}

async function startBarcodeDetection() {
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
  barcodeInterval = setInterval(async () => {
    if (!videoEl.value || !cameraActive.value) return
    try {
      const codes = await detector.detect(videoEl.value)
      if (codes.length > 0) { stopCamera(); await checkIn(codes[0].rawValue) }
    } catch {}
  }, 500)
}

// ── Helpers ──
function logout() { auth.logout(); router.push('/login') }

function isToday(dt) {
  const d = new Date(dt)
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function getTripDateClass(dt) {
  const d = new Date(dt)
  const now = new Date()
  if (d < now) return 'past'
  if (isToday(dt)) return 'today'
  return 'future'
}

function getDay(dt) { return new Date(dt).getDate() }
function getMonthYear(dt) {
  return new Date(dt).toLocaleDateString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: '2-digit' })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function ticketLabel(status) {
  return {
    ISSUED: ui.t.driver.ticketIssued,
    USED: ui.t.driver.ticketUsed,
    CANCELLED: ui.t.driver.ticketCancelled
  }[status] || '—'
}

function formatPrice(p) {
  if (!p) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return new Intl.NumberFormat(ui.locale === 'vi' ? 'vi-VN' : 'en-US').format(p) + (ui.locale === 'vi' ? 'đ' : ' VND')
}
</script>

<style scoped>
.driver-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

/* NAV */
.navbar {
  background: #0d0d0d;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2.5rem; height: 60px;
  position: sticky; top: 0; z-index: 100;
}
.nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #e85d2f; letter-spacing: 2px; text-decoration: none; }
.nav-links { display: flex; gap: 0.25rem; }
.tab-btn {
  background: none; border: none; color: #aaa;
  font-size: 0.85rem; font-weight: 500;
  padding: 0.4rem 0.9rem; border-radius: 4px;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.tab-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
.tab-btn.active { color: #e85d2f; background: rgba(232,93,47,0.1); }
.nav-user-wrap { display: flex; align-items: center; gap: 1rem; }
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 10px; background: rgba(240,165,0,0.2); color: #f0a500; }
.btn-logout { background: none; border: 1px solid #444; color: #888; padding: 0.25rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; transition: all 0.15s; }
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

.icon-btn,
.text-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn {
  width: 32px;
  height: 32px;
}
.text-btn {
  padding: 4px 8px;
  height: 32px;
}
.icon-btn:hover,
.text-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.user-trigger-driver {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.user-trigger-driver:hover {
  background: rgba(255,255,255,0.08);
}

.user-trigger-driver {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.user-trigger-driver:hover {
  background: rgba(255,255,255,0.08);
}
.nav-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1.5px solid rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.dropdown-menu-dark {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 170px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0;
  z-index: 150;
}
.dropdown-item-dark {
  color: #ccc;
  text-decoration: none;
  font-size: 0.82rem;
  padding: 0.6rem 1rem;
  text-align: left;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
}
.dropdown-item-dark:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.btn-logout-item {
  border-top: 1px solid #2d2d2d;
  color: #e85d2f;
}

/* CONTENT */
.content { padding: 1.75rem 2.5rem; max-width: 1100px; }

.page-header-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.5rem; }
.page-title { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 2px; }
.page-sub { font-size: 0.82rem; color: var(--muted); margin-top: 0.25rem; }

.btn-reload, .btn-clear-trip {
  background: none; border: 1.5px solid var(--line); color: var(--muted);
  padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem;
  cursor: pointer; transition: all 0.15s;
}
.btn-reload:hover, .btn-clear-trip:hover { border-color: var(--accent); color: var(--accent); }
.btn-reload:disabled { opacity: 0.5; cursor: not-allowed; }

/* STATE */
.state-box { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.75rem; padding: 3rem; color: var(--muted); }
.state-box.empty { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
.empty-icon { font-size: 2.5rem; }
.empty-title { font-size: 1rem; font-weight: 600; color: var(--text); }
.empty-sub { font-size: 0.82rem; }
.spinner { width: 24px; height: 24px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* TRIP LIST */
.trip-list { display: flex; flex-direction: column; gap: 0.75rem; }
.trip-card {
  background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px;
  display: flex; align-items: center; gap: 1.25rem; padding: 1rem 1.25rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.trip-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(232,93,47,0.08); }
.trip-card.trip-active { border-color: #2d7a4f; background: rgba(45, 122, 79, 0.04); }

.trip-card-left { flex-shrink: 0; }
.trip-date-badge {
  width: 52px; text-align: center;
  background: var(--tag-bg); border-radius: 8px; padding: 0.4rem;
  display: flex; flex-direction: column; gap: 0;
}
.trip-date-badge.today { background: var(--accent); color: #fff; }
.trip-date-badge.past  { background: var(--tag-bg); color: var(--muted); }
.trip-date-badge.future { background: var(--tag-bg); color: var(--text); }
.td-day { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; line-height: 1; }
.td-mon { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; }

.trip-card-body { flex: 1; }
.trip-route { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
.city { font-size: 1rem; font-weight: 600; }
.arr { color: var(--accent); font-weight: 600; }
.trip-meta-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.meta-item { font-size: 0.8rem; color: var(--muted); }
.status-badge { font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 20px; }
.s-open      { background: rgba(45, 122, 79, 0.15); color: #2d7a4f; }
.s-completed { background: var(--tag-bg); color: var(--muted); }
.s-cancelled { background: rgba(192, 57, 43, 0.15); color: #c0392b; }
.s-closed    { background: rgba(13, 110, 253, 0.15); color: #0d6efd; }

.trip-card-right { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
.btn-manifest {
  background: var(--accent); color: #fff; border: none;
  padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem;
  font-weight: 600; cursor: pointer; white-space: nowrap;
  transition: background 0.15s;
}
.btn-manifest:hover:not(:disabled) { background: var(--accent-hover); }
.btn-manifest:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }
.btn-scanner-trip {
  background: var(--text); color: var(--page-bg); border: none;
  padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.8rem;
  cursor: pointer; transition: background 0.15s;
}
.btn-scanner-trip:hover { background: var(--accent); color: #fff; }

/* SCANNER LAYOUT */
.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }

.section-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 0.75rem; }

.scanner-panel { background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 1.5rem; }

.camera-placeholder { background: #0d0d0d; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; }
.cam-icon { font-size: 2.5rem; }
.cam-note { font-size: 0.82rem; color: #666; }
.btn-camera { background: var(--accent); color: #fff; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
.btn-camera:hover { background: var(--accent-hover); }

.camera-wrap { position: relative; border-radius: 10px; overflow: hidden; }
.camera-video { width: 100%; border-radius: 10px; display: block; }
.scan-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.scan-frame { width: 180px; height: 180px; border: 2px solid var(--accent); border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.4); }
.btn-stop-camera { position: absolute; bottom: 0.75rem; right: 0.75rem; background: rgba(0,0,0,0.6); color: #fff; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.78rem; cursor: pointer; }

.divider-row { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0; }
.divider-line { flex: 1; height: 1px; background: var(--line); }
.divider-text { font-size: 0.75rem; color: var(--muted); }

.input-row { display: flex; gap: 0.5rem; }
.qr-input { flex: 1; border: 1.5px solid var(--line); border-radius: 8px; padding: 0.65rem 0.9rem; font-size: 0.88rem; color: var(--text); background: var(--input-bg); outline: none; font-family: var(--font-mono, monospace); transition: border-color 0.15s; }
.qr-input:focus { border-color: var(--accent); background: var(--input-focus-bg); }
.btn-checkin { background: var(--text); color: var(--page-bg); border: none; border-radius: 8px; padding: 0.65rem 1.1rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
.btn-checkin:hover:not(:disabled) { background: var(--accent); color: #fff; }
.btn-checkin:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }

/* RESULT PANEL */
.result-panel { background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 1.5rem; min-height: 320px; }
.result-waiting { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 240px; gap: 0.75rem; }
.wait-icon { font-size: 2.5rem; }
.wait-text { font-size: 0.85rem; color: var(--muted); }
.result-checking { display: flex; align-items: center; justify-content: center; height: 240px; gap: 0.75rem; color: var(--muted); }

.result-valid, .result-invalid { display: flex; flex-direction: column; align-items: center; text-align: center; }
.result-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 0.75rem; }
.valid-icon   { background: #2d7a4f; color: #fff; }
.invalid-icon { background: #c0392b; color: #fff; }
.result-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; }
.result-valid .result-title  { color: #2d7a4f; }
.result-invalid .result-title { color: #c0392b; }
.result-sub { font-size: 0.82rem; color: var(--muted); margin: 0.25rem 0 1rem; }

.ticket-info { width: 100%; text-align: left; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
.info-row { display: flex; justify-content: space-between; padding: 0.55rem 0.9rem; font-size: 0.82rem; border-bottom: 1px solid var(--line); }
.info-row:last-child { border-bottom: none; }
.info-key { color: var(--muted); }
.info-val { font-weight: 500; text-align: right; }
.mono { font-family: var(--font-mono, monospace); font-size: 0.75rem; color: var(--muted); }

.btn-reset { background: var(--text); color: var(--page-bg); border: none; border-radius: 8px; padding: 0.7rem 1.5rem; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.btn-reset:hover { background: var(--accent); color: #fff; }

/* HISTORY */
.history-section { background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 1.25rem 1.5rem; }
.history-list { display: flex; flex-direction: column; gap: 0.4rem; }
.history-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.82rem; }
.h-valid   { background: rgba(45, 122, 79, 0.1); }
.h-invalid { background: rgba(192, 57, 43, 0.1); }
.h-icon { font-size: 0.85rem; font-weight: 700; width: 16px; text-align: center; }
.h-valid .h-icon   { color: #2d7a4f; }
.h-invalid .h-icon { color: #c0392b; }
.h-qr { font-family: var(--font-mono, monospace); font-size: 0.75rem; color: var(--muted); min-width: 120px; }
.h-name { flex: 1; color: var(--text); }
.h-time { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal { background: var(--panel); border-radius: 16px; width: 100%; max-width: 800px; max-height: 88vh; overflow-y: auto; border: 1px solid var(--line); }
.modal-header { background: #0d0d0d; padding: 1.5rem; border-radius: 16px 16px 0 0; position: relative; }
.modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: #fff; letter-spacing: 1px; }
.modal-sub { font-size: 0.82rem; color: #888; margin-top: 0.3rem; }
.modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #888; font-size: 1rem; cursor: pointer; }
.modal-close:hover { color: #fff; }

.modal-body { padding: 1.5rem; }

.manifest-summary { display: flex; gap: 1.5rem; margin-bottom: 1rem; font-size: 0.85rem; color: var(--muted); }
.manifest-summary strong { color: var(--text); }
.ci-count { color: #2d7a4f; }

.table-wrap { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead { background: #0d0d0d; }
thead th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; }
tbody tr { border-bottom: 1px solid var(--line); transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
tbody tr.row-checkedin { background: rgba(45, 122, 79, 0.1); }
tbody td { padding: 0.8rem 1rem; font-size: 0.875rem; vertical-align: middle; }

.seat-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
}
.seat-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 0.28rem 0.6rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
}
.seat-chip-f1 {
  background: var(--accent);
  color: #fff;
}
.seat-chip-f2 {
  background: #6c3de8;
  color: #fff;
}
.floor-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.62rem;
  font-weight: 700;
  background: var(--tag-bg);
  color: var(--muted);
  border: 1px solid var(--line);
}

.ticket-badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 20px; font-size: 0.68rem; font-weight: 600; }
.tb-issued    { background: rgba(13, 110, 253, 0.15); color: #0d6efd; }
.tb-used      { background: rgba(45, 122, 79, 0.15); color: #2d7a4f; }
.tb-cancelled { background: rgba(192, 57, 43, 0.15); color: #c0392b; }
.tb-none      { background: var(--tag-bg); color: var(--muted); }

.cash-pending-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(13, 110, 253, 0.08);
  border: 1px solid rgba(13, 110, 253, 0.25);
  border-radius: 8px;
}
.cash-pending-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0;
  font-size: 0.85rem;
}
.btn-confirm-cash {
  background: #0d6efd;
  color: #fff;
  border: none;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.btn-confirm-cash:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-confirm-cash:hover:not(:disabled) { background: #0b5ed7; }

/* Toast notifications */
.toast-success {
  background: rgba(45, 122, 79, 0.12);
  border: 1px solid rgba(45, 122, 79, 0.35);
  color: #2d7a4f;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}
.toast-error {
  background: rgba(192, 57, 43, 0.1);
  border: 1px solid rgba(192, 57, 43, 0.3);
  color: #c0392b;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

</style>