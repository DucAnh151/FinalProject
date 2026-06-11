<template>
  <div class="driver-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <button :class="['tab-btn', { active: mainView === 'trips' }]" @click="mainView = 'trips'">
          🚌 Chuyến của tôi
        </button>
        <button :class="['tab-btn', { active: mainView === 'scanner' }]" @click="mainView = 'scanner'">
          📷 Soát vé
        </button>
      </div>
      <div class="nav-user">
        <span class="role-badge">DRIVER</span>
        <span>{{ auth.user?.fullName }}</span>
        <button class="btn-logout" @click="logout">Đăng xuất</button>
      </div>
    </nav>

    <!-- ══════════════════════════════ -->
    <!--   VIEW 1: CHUYẾN CỦA TÔI      -->
    <!-- ══════════════════════════════ -->
    <div v-if="mainView === 'trips'" class="content">
      <div class="page-header-row">
        <div>
          <div class="page-title">CHUYẾN CỦA TÔI</div>
          <div class="page-sub">Các chuyến xe được phân công cho {{ auth.user?.fullName }}</div>
        </div>
        <button class="btn-reload" @click="loadMyTrips" :disabled="loadingTrips">
          {{ loadingTrips ? '⟳ Đang tải...' : '⟳ Làm mới' }}
        </button>
      </div>

      <!-- Loading / Empty -->
      <div v-if="loadingTrips" class="state-box">
        <div class="spinner"></div>
        <span>Đang tải danh sách chuyến...</span>
      </div>

      <div v-else-if="!myTrips.length" class="state-box empty">
        <div class="empty-icon">🚌</div>
        <div class="empty-title">Chưa có chuyến nào</div>
        <div class="empty-sub">Liên hệ admin để được phân công chuyến xe</div>
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
              <span class="meta-item">👥 {{ trip.passengerCount }} hành khách</span>
            </div>
          </div>

          <div class="trip-card-right">
            <button
              class="btn-manifest"
              @click="openManifest(trip)"
              :disabled="trip.passengerCount === 0"
            >
              Xem hành khách →
            </button>
            <button
              class="btn-scanner-trip"
              @click="goToScanner(trip)"
            >
              Soát vé
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
          <div class="page-title">SOÁT VÉ</div>
          <div class="page-sub" v-if="scannerTrip">
            Chuyến #{{ scannerTrip.id }}: {{ scannerTrip.origin }} → {{ scannerTrip.destination }}
            · {{ formatTime(scannerTrip.departureTime) }}
          </div>
          <div class="page-sub" v-else>Quét mã QR hoặc nhập thủ công để check-in hành khách</div>
        </div>
        <button v-if="scannerTrip" class="btn-clear-trip" @click="scannerTrip = null">
          ✕ Bỏ chọn chuyến
        </button>
      </div>

      <div class="layout">
        <!-- LEFT: scanner + input -->
        <div class="scanner-panel">

          <!-- Camera scanner -->
          <div class="camera-section">
            <div class="section-label">QUÉT MÃ QR</div>

            <div v-if="!cameraActive" class="camera-placeholder">
              <div class="cam-icon">📷</div>
              <div class="cam-note">Nhấn để bật camera</div>
              <button class="btn-camera" @click="startCamera">Bật Camera</button>
            </div>

            <div v-else class="camera-wrap">
              <video ref="videoEl" class="camera-video" autoplay playsinline></video>
              <div class="scan-overlay">
                <div class="scan-frame"></div>
              </div>
              <button class="btn-stop-camera" @click="stopCamera">Tắt Camera</button>
            </div>
          </div>

          <div class="divider-row">
            <span class="divider-line"></span>
            <span class="divider-text">hoặc</span>
            <span class="divider-line"></span>
          </div>

          <!-- Manual input -->
          <div class="manual-section">
            <div class="section-label">NHẬP THỦ CÔNG</div>
            <div class="input-row">
              <input
                v-model="manualQr"
                type="text"
                placeholder="Nhập mã QR (VD: PAM-1-1-001)"
                class="qr-input"
                @keyup.enter="checkIn(manualQr)"
              />
              <button
                class="btn-checkin"
                :disabled="!manualQr.trim() || checking"
                @click="checkIn(manualQr)"
              >
                {{ checking ? '...' : 'KIỂM TRA' }}
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT: kết quả -->
        <div class="result-panel">
          <div class="section-label">KẾT QUẢ</div>

          <div v-if="!result && !checking" class="result-waiting">
            <div class="wait-icon">🎫</div>
            <div class="wait-text">Chờ quét vé...</div>
          </div>

          <div v-if="checking" class="result-checking">
            <div class="spinner"></div>
            <span>Đang kiểm tra...</span>
          </div>

          <div v-if="result && result.valid" class="result-valid">
            <div class="result-icon valid-icon">✓</div>
            <div class="result-title">VÉ HỢP LỆ</div>
            <div class="result-sub">Check-in thành công</div>
            <div class="ticket-info">
              <div class="info-row"><span class="info-key">Hành khách</span><span class="info-val">{{ result.passengerName }}</span></div>
              <div class="info-row"><span class="info-key">Số điện thoại</span><span class="info-val">{{ result.passengerPhone }}</span></div>
              <div class="info-row"><span class="info-key">Ghế</span><span class="info-val">{{ result.seatName }}</span></div>
              <div class="info-row"><span class="info-key">Tuyến</span><span class="info-val">{{ result.origin }} → {{ result.destination }}</span></div>
              <div class="info-row"><span class="info-key">Khởi hành</span><span class="info-val">{{ formatDatetime(result.departureTime) }}</span></div>
              <div class="info-row"><span class="info-key">Mã QR</span><span class="info-val mono">{{ result.qrCode }}</span></div>
            </div>
            <button class="btn-reset" @click="reset">Quét vé tiếp theo</button>
          </div>

          <div v-if="result && !result.valid" class="result-invalid">
            <div class="result-icon invalid-icon">✕</div>
            <div class="result-title">VÉ KHÔNG HỢP LỆ</div>
            <div class="result-sub">{{ result.reason }}</div>
            <button class="btn-reset" @click="reset">Thử lại</button>
          </div>
        </div>
      </div>

      <!-- Check-in history -->
      <div v-if="history.length > 0" class="history-section">
        <div class="section-label">LỊCH SỬ CA NÀY ({{ history.length }} vé)</div>
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
          <div class="modal-title">MANIFEST HÀNH KHÁCH</div>
          <div class="modal-sub">
            {{ selectedTrip?.origin }} → {{ selectedTrip?.destination }}
            · {{ formatTime(selectedTrip?.departureTime) }}
            · {{ formatDate(selectedTrip?.departureTime) }}
          </div>
          <button class="modal-close" @click="manifestModal = false">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="loadingManifest" class="state-box">
            <div class="spinner"></div>
            <span>Đang tải danh sách hành khách...</span>
          </div>

          <div v-else-if="!manifest.length" class="state-box empty" style="padding:2rem">
            <div>Chưa có hành khách nào trong chuyến này</div>
          </div>

          <template v-else>
            <div class="manifest-summary">
              <span>Tổng: <strong>{{ manifest.length }} hành khách</strong></span>
              <span>Check-in: <strong class="ci-count">{{ checkedInCount }} / {{ manifest.length }}</strong></span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hành khách</th>
                    <th>Ghế</th>
                    <th>Điểm đón</th>
                    <th>Điểm trả</th>
                    <th>Mã QR</th>
                    <th>Trạng thái vé</th>
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
                      <div class="mono" style="font-size:0.72rem;color:#7a7468">{{ p.passengerPhone }}</div>
                    </td>
                    <td>
                      <span class="seat-tag">{{ p.seatName }}</span>
                      <span class="floor-hint">T{{ p.floor }}</span>
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
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()

// ── Views ──
const mainView = ref('trips')

// ── My trips ──
const myTrips      = ref([])
const loadingTrips = ref(false)

// ── Manifest ──
const manifestModal   = ref(false)
const selectedTrip    = ref(null)
const manifest        = ref([])
const loadingManifest = ref(false)

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
  try {
    const res = await api.get(`/admin/driver-manifest/${trip.id}`)
    manifest.value = res.data.manifest
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
    const reason = e.response?.data?.error || 'Mã QR không hợp lệ'
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
    alert('Không thể truy cập camera. Vui lòng dùng nhập thủ công.')
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
  return new Date(dt).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function ticketLabel(status) {
  return { ISSUED: 'Đã phát', USED: 'Đã check-in', CANCELLED: 'Đã hủy' }[status] || '—'
}
</script>

<style scoped>
.driver-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

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
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 10px; background: rgba(240,165,0,0.2); color: #f0a500; }
.btn-logout { background: none; border: 1px solid #444; color: #888; padding: 0.25rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.78rem; transition: all 0.15s; }
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

/* CONTENT */
.content { padding: 1.75rem 2.5rem; max-width: 1100px; }

.page-header-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.5rem; }
.page-title { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 2px; }
.page-sub { font-size: 0.82rem; color: #7a7468; margin-top: 0.25rem; }

.btn-reload, .btn-clear-trip {
  background: none; border: 1.5px solid #d4cfc6; color: #7a7468;
  padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem;
  cursor: pointer; transition: all 0.15s;
}
.btn-reload:hover, .btn-clear-trip:hover { border-color: #e85d2f; color: #e85d2f; }
.btn-reload:disabled { opacity: 0.5; cursor: not-allowed; }

/* STATE */
.state-box { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.75rem; padding: 3rem; color: #7a7468; }
.state-box.empty { background: #fff; border: 1px solid #d4cfc6; border-radius: 12px; }
.empty-icon { font-size: 2.5rem; }
.empty-title { font-size: 1rem; font-weight: 600; color: #0d0d0d; }
.empty-sub { font-size: 0.82rem; }
.spinner { width: 24px; height: 24px; border: 2px solid #d4cfc6; border-top-color: #e85d2f; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* TRIP LIST */
.trip-list { display: flex; flex-direction: column; gap: 0.75rem; }
.trip-card {
  background: #fff; border: 1.5px solid #d4cfc6; border-radius: 12px;
  display: flex; align-items: center; gap: 1.25rem; padding: 1rem 1.25rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.trip-card:hover { border-color: #e85d2f; box-shadow: 0 4px 16px rgba(232,93,47,0.08); }
.trip-card.trip-active { border-color: #2d7a4f; background: #f7fdf9; }

.trip-card-left { flex-shrink: 0; }
.trip-date-badge {
  width: 52px; text-align: center;
  background: #f5f2ec; border-radius: 8px; padding: 0.4rem;
  display: flex; flex-direction: column; gap: 0;
}
.trip-date-badge.today { background: #e85d2f; color: #fff; }
.trip-date-badge.past  { background: #e2e3e5; color: #7a7468; }
.trip-date-badge.future { background: #f5f2ec; color: #0d0d0d; }
.td-day { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; line-height: 1; }
.td-mon { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; }

.trip-card-body { flex: 1; }
.trip-route { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
.city { font-size: 1rem; font-weight: 600; }
.arr { color: #e85d2f; font-weight: 600; }
.trip-meta-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.meta-item { font-size: 0.8rem; color: #7a7468; }
.status-badge { font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 20px; }
.s-open      { background: #d4edda; color: #155724; }
.s-completed { background: #e2e3e5; color: #383d41; }
.s-cancelled { background: #f8d7da; color: #721c24; }
.s-closed    { background: #cce5ff; color: #004085; }

.trip-card-right { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
.btn-manifest {
  background: #e85d2f; color: #fff; border: none;
  padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.82rem;
  font-weight: 600; cursor: pointer; white-space: nowrap;
  transition: background 0.15s;
}
.btn-manifest:hover:not(:disabled) { background: #c44a1e; }
.btn-manifest:disabled { background: #d4cfc6; cursor: not-allowed; }
.btn-scanner-trip {
  background: #0d0d0d; color: #fff; border: none;
  padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.8rem;
  cursor: pointer; transition: background 0.15s;
}
.btn-scanner-trip:hover { background: #e85d2f; }

/* SCANNER LAYOUT */
.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }

.section-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #7a7468; margin-bottom: 0.75rem; }

.scanner-panel { background: #fff; border: 1.5px solid #d4cfc6; border-radius: 12px; padding: 1.5rem; }

.camera-placeholder { background: #0d0d0d; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; }
.cam-icon { font-size: 2.5rem; }
.cam-note { font-size: 0.82rem; color: #666; }
.btn-camera { background: #e85d2f; color: #fff; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
.btn-camera:hover { background: #c44a1e; }

.camera-wrap { position: relative; border-radius: 10px; overflow: hidden; }
.camera-video { width: 100%; border-radius: 10px; display: block; }
.scan-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.scan-frame { width: 180px; height: 180px; border: 2px solid #e85d2f; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.4); }
.btn-stop-camera { position: absolute; bottom: 0.75rem; right: 0.75rem; background: rgba(0,0,0,0.6); color: #fff; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.78rem; cursor: pointer; }

.divider-row { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0; }
.divider-line { flex: 1; height: 1px; background: #d4cfc6; }
.divider-text { font-size: 0.75rem; color: #7a7468; }

.input-row { display: flex; gap: 0.5rem; }
.qr-input { flex: 1; border: 1.5px solid #d4cfc6; border-radius: 8px; padding: 0.65rem 0.9rem; font-size: 0.88rem; color: #0d0d0d; background: #f5f2ec; outline: none; font-family: 'DM Mono', monospace; transition: border-color 0.15s; }
.qr-input:focus { border-color: #e85d2f; background: #fff; }
.btn-checkin { background: #0d0d0d; color: #fff; border: none; border-radius: 8px; padding: 0.65rem 1.1rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
.btn-checkin:hover:not(:disabled) { background: #e85d2f; }
.btn-checkin:disabled { background: #d4cfc6; cursor: not-allowed; }

/* RESULT PANEL */
.result-panel { background: #fff; border: 1.5px solid #d4cfc6; border-radius: 12px; padding: 1.5rem; min-height: 320px; }
.result-waiting { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 240px; gap: 0.75rem; }
.wait-icon { font-size: 2.5rem; }
.wait-text { font-size: 0.85rem; color: #7a7468; }
.result-checking { display: flex; align-items: center; justify-content: center; height: 240px; gap: 0.75rem; color: #7a7468; }

.result-valid, .result-invalid { display: flex; flex-direction: column; align-items: center; text-align: center; }
.result-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 0.75rem; }
.valid-icon   { background: #2d7a4f; color: #fff; }
.invalid-icon { background: #c0392b; color: #fff; }
.result-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; }
.result-valid .result-title  { color: #2d7a4f; }
.result-invalid .result-title { color: #c0392b; }
.result-sub { font-size: 0.82rem; color: #7a7468; margin: 0.25rem 0 1rem; }

.ticket-info { width: 100%; text-align: left; border: 1px solid #d4cfc6; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
.info-row { display: flex; justify-content: space-between; padding: 0.55rem 0.9rem; font-size: 0.82rem; border-bottom: 1px solid #f0ede8; }
.info-row:last-child { border-bottom: none; }
.info-key { color: #7a7468; }
.info-val { font-weight: 500; text-align: right; }
.mono { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #7a7468; }

.btn-reset { background: #0d0d0d; color: #fff; border: none; border-radius: 8px; padding: 0.7rem 1.5rem; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.btn-reset:hover { background: #e85d2f; }

/* HISTORY */
.history-section { background: #fff; border: 1.5px solid #d4cfc6; border-radius: 12px; padding: 1.25rem 1.5rem; }
.history-list { display: flex; flex-direction: column; gap: 0.4rem; }
.history-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.82rem; }
.h-valid   { background: #f0fdf4; }
.h-invalid { background: #fdf0ef; }
.h-icon { font-size: 0.85rem; font-weight: 700; width: 16px; text-align: center; }
.h-valid .h-icon   { color: #2d7a4f; }
.h-invalid .h-icon { color: #c0392b; }
.h-qr { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #7a7468; min-width: 120px; }
.h-name { flex: 1; color: #0d0d0d; }
.h-time { font-size: 0.72rem; color: #7a7468; white-space: nowrap; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 800px; max-height: 88vh; overflow-y: auto; }
.modal-header { background: #0d0d0d; padding: 1.5rem; border-radius: 16px 16px 0 0; position: relative; }
.modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: #fff; letter-spacing: 1px; }
.modal-sub { font-size: 0.82rem; color: #888; margin-top: 0.3rem; }
.modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #888; font-size: 1rem; cursor: pointer; }
.modal-close:hover { color: #fff; }

.modal-body { padding: 1.5rem; }

.manifest-summary { display: flex; gap: 1.5rem; margin-bottom: 1rem; font-size: 0.85rem; color: #7a7468; }
.manifest-summary strong { color: #0d0d0d; }
.ci-count { color: #2d7a4f; }

.table-wrap { background: #fff; border: 1px solid #d4cfc6; border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead { background: #0d0d0d; }
thead th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; }
tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #faf9f7; }
tbody tr.row-checkedin { background: #f0fdf4; }
tbody td { padding: 0.8rem 1rem; font-size: 0.875rem; vertical-align: middle; }

.seat-tag { background: #e85d2f; color: #fff; padding: 0.15rem 0.5rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.floor-hint { font-size: 0.68rem; color: #7a7468; margin-left: 0.25rem; }

.ticket-badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 20px; font-size: 0.68rem; font-weight: 600; }
.tb-issued    { background: #d1ecf1; color: #0c5460; }
.tb-used      { background: #d4edda; color: #155724; }
.tb-cancelled { background: #f8d7da; color: #721c24; }
.tb-none      { background: #e2e3e5; color: #383d41; }
</style>


<!-- nắm đủ toàn bộ context. Bây giờ làm Task 9 hoàn chỉnh:
Kế hoạch:

bookingStore.js — quản lý state đặt vé xuyên suốt các bước, persist vào localStorage
uiStore.js — dark mode + i18n EN/VI, persist vào localStorage
App.vue — apply dark mode class lên root
Cập nhật SeatMapView, BookingView, PaymentView dùng bookingStore thay sessionStorage thô
LandingView dùng uiStore thay local refs -->