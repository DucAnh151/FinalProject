<template>
  <div class="driver-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-user">
        <span class="role-badge">DRIVER</span>
        <span>{{ auth.user?.fullName }}</span>
        <button class="btn-logout" @click="logout">Đăng xuất</button>
      </div>
    </nav>

    <div class="content">
      <div class="page-title">SOÁT VÉ</div>
      <div class="page-sub">Quét mã QR hoặc nhập thủ công để check-in hành khách</div>

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

          <!-- Chờ quét -->
          <div v-if="!result && !checking" class="result-waiting">
            <div class="wait-icon">🎫</div>
            <div class="wait-text">Chờ quét vé...</div>
          </div>

          <!-- Đang kiểm tra -->
          <div v-if="checking" class="result-checking">
            <div class="spinner"></div>
            <span>Đang kiểm tra...</span>
          </div>

          <!-- Kết quả hợp lệ -->
          <div v-if="result && result.valid" class="result-valid">
            <div class="result-icon valid-icon">✓</div>
            <div class="result-title">VÉ HỢP LỆ</div>
            <div class="result-sub">Check-in thành công</div>

            <div class="ticket-info">
              <div class="info-row">
                <span class="info-key">Hành khách</span>
                <span class="info-val">{{ result.passengerName }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Số điện thoại</span>
                <span class="info-val">{{ result.passengerPhone }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Ghế</span>
                <span class="info-val">{{ result.seatName }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Tuyến</span>
                <span class="info-val">{{ result.origin }} → {{ result.destination }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Khởi hành</span>
                <span class="info-val">{{ formatDatetime(result.departureTime) }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Mã QR</span>
                <span class="info-val mono">{{ result.qrCode }}</span>
              </div>
            </div>

            <button class="btn-reset" @click="reset">Quét vé tiếp theo</button>
          </div>

          <!-- Kết quả không hợp lệ -->
          <div v-if="result && !result.valid" class="result-invalid">
            <div class="result-icon invalid-icon">✕</div>
            <div class="result-title">VÉ KHÔNG HỢP LỆ</div>
            <div class="result-sub">{{ result.reason }}</div>
            <button class="btn-reset" @click="reset">Thử lại</button>
          </div>
        </div>
      </div>

      <!-- Lịch sử check-in trong ca -->
      <div v-if="history.length > 0" class="history-section">
        <div class="section-label">LỊCH SỬ CA NÀY ({{ history.length }} vé)</div>
        <div class="history-list">
          <div
            v-for="(h, idx) in history"
            :key="idx"
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
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router  = useRouter()
const auth    = useAuthStore()

const manualQr   = ref('')
const checking   = ref(false)
const result     = ref(null)
const history    = ref([])
const cameraActive = ref(false)
const videoEl    = ref(null)

let stream = null

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

function reset() {
  result.value   = null
  manualQr.value = ''
}

// Camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    cameraActive.value = true
    // Gán stream vào video sau khi DOM update
    setTimeout(() => {
      if (videoEl.value) videoEl.value.srcObject = stream
    }, 100)

    // Dùng BarcodeDetector nếu trình duyệt hỗ trợ
    if ('BarcodeDetector' in window) {
      startBarcodeDetection()
    }
  } catch (e) {
    alert('Không thể truy cập camera. Vui lòng dùng nhập thủ công.')
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  cameraActive.value = false
}

let barcodeInterval = null

async function startBarcodeDetection() {
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
  barcodeInterval = setInterval(async () => {
    if (!videoEl.value || !cameraActive.value) return
    try {
      const codes = await detector.detect(videoEl.value)
      if (codes.length > 0) {
        const qr = codes[0].rawValue
        stopCamera()
        await checkIn(qr)
      }
    } catch {}
  }, 500)
}

onUnmounted(() => {
  stopCamera()
  if (barcodeInterval) clearInterval(barcodeInterval)
})

function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.driver-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

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
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge {
  font-size: 0.7rem; font-weight: 600;
  padding: 0.2rem 0.6rem; border-radius: 10px;
  background: rgba(240,165,0,0.2); color: #f0a500;
}
.btn-logout {
  background: none; border: 1px solid #444; color: #888;
  padding: 0.25rem 0.7rem; border-radius: 4px;
  cursor: pointer; font-size: 0.78rem; transition: all 0.15s;
}
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

.content { padding: 1.75rem 2.5rem; max-width: 1000px; }

.page-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; letter-spacing: 2px; margin-bottom: 0.25rem;
}
.page-sub { font-size: 0.82rem; color: #7a7468; margin-bottom: 1.5rem; }

.section-label {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px;
  color: #7a7468; margin-bottom: 0.75rem;
}

.layout {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 1.5rem; align-items: start; margin-bottom: 1.5rem;
}

/* SCANNER PANEL */
.scanner-panel {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.5rem;
}

.camera-placeholder {
  background: #0d0d0d; border-radius: 10px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 3rem; gap: 0.75rem; margin-bottom: 0.5rem;
}
.cam-icon { font-size: 2.5rem; }
.cam-note { font-size: 0.82rem; color: #666; }
.btn-camera {
  background: #e85d2f; color: #fff; border: none;
  padding: 0.6rem 1.5rem; border-radius: 8px;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  margin-top: 0.5rem; transition: background 0.15s;
}
.btn-camera:hover { background: #c44a1e; }

.camera-wrap { position: relative; border-radius: 10px; overflow: hidden; }
.camera-video { width: 100%; border-radius: 10px; display: block; }
.scan-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.scan-frame {
  width: 180px; height: 180px;
  border: 2px solid #e85d2f; border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.4);
}
.btn-stop-camera {
  position: absolute; bottom: 0.75rem; right: 0.75rem;
  background: rgba(0,0,0,0.6); color: #fff; border: none;
  padding: 0.4rem 0.85rem; border-radius: 6px;
  font-size: 0.78rem; cursor: pointer;
}

.divider-row {
  display: flex; align-items: center; gap: 0.75rem;
  margin: 1.25rem 0;
}
.divider-line { flex: 1; height: 1px; background: #d4cfc6; }
.divider-text { font-size: 0.75rem; color: #7a7468; }

.input-row { display: flex; gap: 0.5rem; }
.qr-input {
  flex: 1; border: 1.5px solid #d4cfc6; border-radius: 8px;
  padding: 0.65rem 0.9rem; font-size: 0.88rem;
  color: #0d0d0d; background: #f5f2ec; outline: none;
  font-family: 'DM Mono', monospace; transition: border-color 0.15s;
}
.qr-input:focus { border-color: #e85d2f; background: #fff; }
.btn-checkin {
  background: #0d0d0d; color: #fff; border: none;
  border-radius: 8px; padding: 0.65rem 1.1rem;
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: background 0.15s;
}
.btn-checkin:hover:not(:disabled) { background: #e85d2f; }
.btn-checkin:disabled { background: #d4cfc6; cursor: not-allowed; }

/* RESULT PANEL */
.result-panel {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.5rem; min-height: 320px;
}

.result-waiting {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 240px; gap: 0.75rem;
}
.wait-icon { font-size: 2.5rem; }
.wait-text { font-size: 0.85rem; color: #7a7468; }

.result-checking {
  display: flex; align-items: center; justify-content: center;
  height: 240px; gap: 0.75rem; color: #7a7468;
}
.spinner {
  width: 24px; height: 24px;
  border: 2px solid #d4cfc6; border-top-color: #e85d2f;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.result-valid, .result-invalid {
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
}
.result-icon {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; margin-bottom: 0.75rem;
}
.valid-icon   { background: #2d7a4f; color: #fff; }
.invalid-icon { background: #c0392b; color: #fff; }

.result-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem; letter-spacing: 1px;
}
.result-valid .result-title  { color: #2d7a4f; }
.result-invalid .result-title { color: #c0392b; }

.result-sub { font-size: 0.82rem; color: #7a7468; margin: 0.25rem 0 1rem; }

.ticket-info {
  width: 100%; text-align: left;
  border: 1px solid #d4cfc6; border-radius: 8px;
  overflow: hidden; margin-bottom: 1rem;
}
.info-row {
  display: flex; justify-content: space-between;
  padding: 0.55rem 0.9rem; font-size: 0.82rem;
  border-bottom: 1px solid #f0ede8;
}
.info-row:last-child { border-bottom: none; }
.info-key { color: #7a7468; }
.info-val { font-weight: 500; text-align: right; }
.mono { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #7a7468; }

.btn-reset {
  background: #0d0d0d; color: #fff; border: none;
  border-radius: 8px; padding: 0.7rem 1.5rem;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btn-reset:hover { background: #e85d2f; }

/* HISTORY */
.history-section {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.25rem 1.5rem;
}
.history-list { display: flex; flex-direction: column; gap: 0.4rem; }
.history-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.55rem 0.75rem; border-radius: 8px;
  font-size: 0.82rem;
}
.h-valid   { background: #f0fdf4; }
.h-invalid { background: #fdf0ef; }
.h-icon { font-size: 0.85rem; font-weight: 700; width: 16px; text-align: center; }
.h-valid .h-icon   { color: #2d7a4f; }
.h-invalid .h-icon { color: #c0392b; }
.h-qr { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #7a7468; min-width: 120px; }
.h-name { flex: 1; color: #0d0d0d; }
.h-time { font-size: 0.72rem; color: #7a7468; white-space: nowrap; }
</style>