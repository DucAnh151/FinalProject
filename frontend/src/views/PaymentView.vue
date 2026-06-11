<template>
  <div class="payment-page">
    <!-- NAV -->
    <UserHeader backTo="history" />

    <div v-if="!paymentData" class="full-loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="content">
      <!-- STEP INDICATOR -->
      <div class="steps">
        <div :class="['step', { active: step === 1, done: step > 1 }]">
          <span class="step-num">{{ step > 1 ? '✓' : '1' }}</span>
          <span class="step-label">{{ ui.t.payment.step1 }}</span>
        </div>
        <div class="step-line"></div>
        <div :class="['step', { active: step === 2, done: step > 2 }]">
          <span class="step-num">{{ step > 2 ? '✓' : '2' }}</span>
          <span class="step-label">{{ ui.t.payment.step2 }}</span>
        </div>
        <div class="step-line"></div>
        <div :class="['step', { active: step === 3 }]">
          <span class="step-num">3</span>
          <span class="step-label">{{ ui.t.payment.step3 }}</span>
        </div>
      </div>

      <div class="layout">
        <!-- LEFT: form theo step -->
        <div class="form-panel">

          <!-- STEP 1: Chọn phương thức + nhập PIN -->
          <div v-if="step === 1">
            <div class="panel-title">{{ ui.t.payment.methodTitle }}</div>
            <div class="cancel-warning">{{ ui.t.payment.cancelWarning }}</div>

            <div class="gateway-list">
              <div
                v-for="gw in gateways"
                :key="gw.value"
                :class="['gateway-card', { active: selectedGateway === gw.value }]"
                @click="selectedGateway = gw.value"
              >
                <span class="gw-icon">{{ gw.icon }}</span>
                <span class="gw-name">{{ gw.name }}</span>
                <span v-if="selectedGateway === gw.value" class="gw-check">✓</span>
              </div>
            </div>

            <div class="panel-title" style="margin-top: 1.75rem">{{ ui.t.payment.pinTitle }}</div>
            <div class="pin-note">{{ ui.t.payment.pinNote }}</div>

            <div class="pin-wrap">
              <input
                v-model="pin"
                type="password"
                maxlength="6"
                placeholder="••••••"
                class="pin-input"
                :class="{ 'field-error': errors.pin }"
                @keyup.enter="initPayment"
              />
            </div>
            <span v-if="errors.pin" class="err-msg">{{ errors.pin }}</span>

            <!-- Set PIN nếu chưa có -->
            <div class="set-pin-box">
              <div class="set-pin-label">{{ ui.t.payment.setPinLabel }}</div>
              <div class="set-pin-row">
                <input
                  v-model="newPin"
                  type="password"
                  maxlength="6"
                  :placeholder="ui.t.payment.setPinNewLabel"
                  class="pin-input-sm"
                />
                <button class="btn-set-pin" :disabled="settingPin" @click="setPin">
                  {{ settingPin ? ui.t.payment.setPinSetting : ui.t.payment.setPinBtn }}
                </button>
              </div>
              <span v-if="pinSetMsg" :class="['set-pin-msg', pinSetOk ? 'ok' : 'fail']">
                {{ pinSetMsg }}
              </span>
            </div>

            <div v-if="errors.general" class="alert-error">{{ errors.general }}</div>

            <button
              class="btn-primary"
              :disabled="submitting || !pin || pin.length < 6"
              @click="initPayment"
            >
              {{ submitting ? ui.t.payment.processing : ui.t.payment.confirmBtn }}
            </button>
          </div>

          <!-- STEP 2: Nhập OTP -->
          <div v-if="step === 2">
            <div class="panel-title">{{ ui.t.payment.otpTitle }}</div>
            <div class="otp-note">
              {{ ui.t.payment.otpNote }}
              <br>
              <span class="otp-dev">{{ ui.t.payment.otpDevLabel }}<strong>{{ devOtp }}</strong>)</span>
            </div>

            <div class="pin-wrap">
              <input
                v-model="otp"
                type="text"
                maxlength="6"
                :placeholder="ui.t.payment.otpInput"
                class="pin-input"
                :class="{ 'field-error': errors.otp }"
                @keyup.enter="confirmPayment"
              />
            </div>
            <span v-if="errors.otp" class="err-msg">{{ errors.otp }}</span>

            <div v-if="errors.general" class="alert-error">{{ errors.general }}</div>

            <button
              class="btn-primary"
              :disabled="submitting || !otp || otp.length < 6"
              @click="confirmPayment"
            >
              {{ submitting ? ui.t.payment.confirming : ui.t.payment.confirmPayBtn }}
            </button>

            <button class="btn-secondary" @click="step = 1">
              {{ ui.t.payment.backBtn }}
            </button>
          </div>

          <!-- STEP 3: Thành công -->
          <div v-if="step === 3" class="success-block">
            <div class="success-icon">✓</div>
            <div class="success-title">{{ ui.t.payment.successTitle }}</div>
            <div class="success-sub">{{ ui.t.payment.successSub }}</div>

            <div class="ticket-list-cards">
              <div v-for="ticket in tickets" :key="ticket.id" class="ticket-card-success">
                <div class="ticket-header-success">{{ ui.t.payment.ticketLabel }}{{ ticket.id }}</div>
                <div class="qr-box">
                  <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCode)}`" alt="QR Vé" class="qr-img" />
                </div>
                <div class="ticket-qr-code">{{ ticket.qrCode }}</div>
              </div>
            </div>

            <button class="btn-primary" @click="$router.push('/my-tickets')">
              {{ ui.t.payment.viewTicketsBtn }}
            </button>
          </div>
        </div>

        <!-- RIGHT: tóm tắt đơn hàng -->
        <div class="summary-panel">
          <div class="summary-title">{{ ui.t.payment.orderTitle }}</div>

          <div class="s-route">
            {{ paymentData.trip?.origin }} → {{ paymentData.trip?.destination }}
          </div>
          <div class="s-time">{{ formatTime(paymentData.trip?.departureTime) }}</div>
          <div class="s-meta">{{ paymentData.trip?.operator }}</div>

          <div class="summary-divider"></div>

          <div class="s-label">{{ ui.t.payment.seats }}</div>
          <div class="seat-tags">
            <span v-for="s in paymentData.seats" :key="s.seatId" class="seat-tag">
              {{ s.seatName }}
            </span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-row">
            <span>{{ paymentData.seats?.length }} {{ ui.t.payment.seats.toLowerCase() }}</span>
            <span>{{ formatPrice(paymentData.totalPrice) }}</span>
          </div>
          <div class="summary-row total">
            <span>{{ ui.t.seatMap.total }}</span>
            <span class="total-price">{{ formatPrice(paymentData.totalPrice) }}</span>
          </div>

          <div v-if="selectedGateway" class="gateway-badge">
            {{ gateways.find(g => g.value === selectedGateway)?.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBookingStore } from '../stores/bookingStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()

// Synchronous init — no spinner flash
function loadPaymentData() {
  const bookStore = useBookingStore()
  if (bookStore.bookingId && bookStore.selectedTrip) {
    return {
      bookingId: bookStore.bookingId,
      trip:      bookStore.selectedTrip,
      seats:     bookStore.seats,
      totalPrice: bookStore.totalPrice,
    }
  }
  const saved = sessionStorage.getItem('payment_data')
  if (saved) return JSON.parse(saved)
  return null
}

const paymentData     = ref(loadPaymentData())
// Redirect if no data (after store + sessionStorage both empty)
if (!paymentData.value) {
  router.push('/')
}

const step            = ref(1)
const selectedGateway = ref('WALLET')
const pin             = ref('')
const otp             = ref('')
const newPin          = ref('')
const devOtp          = ref('')
const paymentId       = ref(null)
const tickets         = ref([])
const submitting      = ref(false)
const settingPin      = ref(false)
const pinSetMsg       = ref('')
const pinSetOk        = ref(false)
const errors          = ref({})

const gateways = computed(() => [
  { value: 'WALLET', name: `${ui.t.payment.walletGateway}${formatPrice(auth.user?.walletBalance)})`, icon: '👛' },
  { value: 'VNPAY', name: ui.t.payment.vnpay,  icon: '🏦' },
  { value: 'MOMO',  name: ui.t.payment.momo,   icon: '💜' },
  { value: 'CARD',  name: ui.t.payment.card,   icon: '💳' },
])

async function setPin() {
  pinSetMsg.value = ''
  if (!newPin.value || newPin.value.length !== 6 || !/^\d+$/.test(newPin.value)) {
    pinSetMsg.value = ui.value.t.settings.pinInvalid
    pinSetOk.value = false
    return
  }
  settingPin.value = true
  try {
    await api.post('/payments/set-pin', { userId: auth.user.id, pin: newPin.value })
    pinSetMsg.value = ui.value.t.payment.successTitle
    pinSetOk.value = true
    newPin.value = ''
  } catch (e) {
    pinSetMsg.value = e.response?.data?.error || 'PIN setup failed'
    pinSetOk.value = false
  } finally {
    settingPin.value = false
  }
}

async function initPayment() {
  errors.value = {}
  if (!pin.value || pin.value.length !== 6) {
    errors.value.pin = ui.value.t.payment.errPin
    return
  }

  submitting.value = true
  try {
    const res = await api.post('/payments/initiate', {
      bookingId: paymentData.value.bookingId,
      userId:    auth.user.id,
      gateway:   selectedGateway.value,
      pin:       pin.value,
    })

    paymentId.value = res.data.paymentId
    devOtp.value    = res.data.otp || ''
    step.value      = 2
  } catch (e) {
    errors.value.general = e.response?.data?.error || ui.value.t.payment.errConfirmFail
  } finally {
    submitting.value = false
  }
}

async function confirmPayment() {
  errors.value = {}
  if (!otp.value || otp.value.length !== 6) {
    errors.value.otp = ui.value.t.payment.errOtp
    return
  }

  submitting.value = true
  try {
    const res = await api.post('/payments/confirm', {
      paymentId: paymentId.value,
      userId:    auth.user.id,
      otp:       otp.value,
    })

    tickets.value = res.data.tickets
    step.value    = 3

    const updatedUser = { ...auth.user }
    if (selectedGateway.value === 'WALLET') {
      updatedUser.walletBalance = Math.max(0, updatedUser.walletBalance - paymentData.value.totalPrice)
    }
    if (res.data.loyaltyTier) {
      updatedUser.loyaltyTier = res.data.loyaltyTier
      updatedUser.totalTickets = res.data.totalTickets
    }
    auth.setUser(updatedUser)

    // Xóa bookingStore + sessionStorage sau thanh toán
    const bookStore = useBookingStore()
    bookStore.clear()
    sessionStorage.removeItem('current_booking')
    sessionStorage.removeItem('payment_data')
    sessionStorage.removeItem('booking_seats')
  } catch (e) {
    errors.value.general = e.response?.data?.error || ui.value.t.payment.errOtpFail
  } finally {
    submitting.value = false
  }
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(p) {
  if (!p) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return new Intl.NumberFormat(ui.locale === 'vi' ? 'vi-VN' : 'en-US').format(p) + (ui.locale === 'vi' ? 'đ' : ' VND')
}
</script>

<style scoped>
.payment-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

.full-loading {
  display: flex; align-items: center; justify-content: center;
  height: calc(100vh - 60px);
}
.spinner {
  width: 28px; height: 28px;
  border: 2px solid var(--line); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* STEPS */
.steps {
  display: flex; align-items: center;
  padding: 1rem 2.5rem;
  background: var(--panel); border-bottom: 1px solid var(--line);
}
.step { display: flex; align-items: center; gap: 0.5rem; }
.step-num {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.78rem; font-weight: 600;
  background: var(--tag-bg); color: var(--muted);
  transition: all 0.2s;
}
.step.active .step-num { background: var(--accent); color: #fff; }
.step.done .step-num   { background: #2d7a4f; color: #fff; }
.step-label { font-size: 0.82rem; color: var(--muted); }
.step.active .step-label { color: var(--text); font-weight: 600; }
.step-line { flex: 1; height: 1px; background: var(--line); margin: 0 0.75rem; }

.content { padding: 1.5rem 2.5rem; }

.layout {
  display: grid; grid-template-columns: 1fr 280px;
  gap: 1.5rem; align-items: start;
}

/* FORM PANEL */
.form-panel {
  background: var(--panel); border: 1.5px solid var(--line);
  border-radius: 12px; padding: 1.75rem;
}
.panel-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1rem; letter-spacing: 1.5px;
  color: var(--muted); margin-bottom: 1rem;
}
.cancel-warning {
  background: rgba(253, 224, 71, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.4);
  color: var(--text);
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  margin-bottom: 1rem;
}

/* Gateway */
.gateway-list { display: flex; flex-direction: column; gap: 0.5rem; }
.gateway-card {
  display: flex; align-items: center; gap: 0.75rem;
  border: 1.5px solid var(--line); border-radius: 8px;
  padding: 0.85rem 1rem; cursor: pointer;
  transition: all 0.15s;
}
.gateway-card:hover { border-color: var(--accent); }
.gateway-card.active { border-color: var(--accent); background: rgba(232, 93, 47, 0.08); }
.gw-icon { font-size: 1.2rem; }
.gw-name { font-size: 0.9rem; font-weight: 500; flex: 1; }
.gw-check { color: var(--accent); font-weight: 700; }

/* PIN */
.pin-note { font-size: 0.82rem; color: var(--muted); margin-bottom: 0.75rem; }
.pin-wrap { margin-bottom: 0.4rem; }
.pin-input {
  width: 180px; border: 1.5px solid var(--line); border-radius: 8px;
  padding: 0.75rem 1rem; font-size: 1.2rem;
  letter-spacing: 4px; text-align: center;
  outline: none; transition: border-color 0.15s;
  background: var(--input-bg); color: var(--text);
  font-family: var(--font-mono, monospace);
}
.pin-input:focus { border-color: var(--accent); background: var(--input-focus-bg); }
.pin-input.field-error { border-color: #c0392b; }
.err-msg { font-size: 0.72rem; color: #c0392b; display: block; margin-bottom: 0.5rem; }

/* Set PIN */
.set-pin-box {
  margin-top: 1.25rem; padding: 1rem;
  background: var(--input-bg); border-radius: 8px;
  border: 1px dashed var(--line);
}
.set-pin-label { font-size: 0.78rem; font-weight: 600; color: var(--text); margin-bottom: 0.5rem; }
.set-pin-row { display: flex; gap: 0.5rem; align-items: center; }
.pin-input-sm {
  border: 1.5px solid var(--line); border-radius: 6px;
  padding: 0.5rem 0.75rem; font-size: 0.9rem;
  letter-spacing: 2px; width: 160px;
  outline: none; background: var(--input-focus-bg); color: var(--text);
  font-family: var(--font-mono, monospace);
}
.pin-input-sm:focus { border-color: var(--accent); }
.btn-set-pin {
  background: var(--text); color: var(--page-bg); border: none;
  padding: 0.5rem 1rem; border-radius: 6px;
  font-size: 0.82rem; cursor: pointer; transition: background 0.15s;
}
.btn-set-pin:hover { background: var(--accent); color: #fff; }
.btn-set-pin:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }
.set-pin-msg { font-size: 0.72rem; display: block; margin-top: 0.4rem; }
.set-pin-msg.ok   { color: #2d7a4f; }
.set-pin-msg.fail { color: #c0392b; }

/* OTP */
.otp-note {
  font-size: 0.85rem; color: var(--muted);
  line-height: 1.6; margin-bottom: 1rem;
}
.otp-dev { font-size: 0.82rem; }
.otp-dev strong { color: var(--accent); font-size: 1rem; }

/* Buttons */
.btn-primary {
  width: 100%; background: var(--accent); color: #fff;
  border: none; border-radius: 8px;
  padding: 0.85rem; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s; margin-top: 1.25rem;
}
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-primary:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }

.btn-secondary {
  width: 100%; background: none; color: var(--muted);
  border: 1.5px solid var(--line); border-radius: 8px;
  padding: 0.75rem; font-size: 0.88rem;
  cursor: pointer; transition: all 0.15s; margin-top: 0.5rem;
}
.btn-secondary:hover { border-color: var(--text); color: var(--text); }

.alert-error {
  background: rgba(192, 57, 43, 0.1); color: #c0392b;
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 8px; padding: 0.75rem 1rem;
  font-size: 0.83rem; margin-top: 0.75rem;
}

/* SUCCESS */
.success-block { text-align: center; padding: 1rem 0; }
.success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: #2d7a4f; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; margin: 0 auto 1rem;
}
.success-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem; letter-spacing: 1px; color: var(--text);
}
.success-sub { font-size: 0.85rem; color: var(--muted); margin: 0.35rem 0 1.5rem; }
.ticket-list-cards {
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  justify-content: center;
}
.ticket-card-success {
  background: var(--input-bg);
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.ticket-header-success {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 0.5rem;
  border-bottom: 1px dashed var(--line);
  padding-bottom: 0.4rem;
}
.qr-box {
  background: #fff;
  padding: 0.5rem;
  border-radius: 6px;
  display: inline-block;
  margin: 0.5rem 0;
  border: 1px solid var(--line);
}
.qr-img {
  width: 120px;
  height: 120px;
  display: block;
}
.ticket-qr-code {
  font-size: 0.68rem;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  word-break: break-all;
}

/* SUMMARY */
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
.s-route { font-size: 1rem; font-weight: 600; color: var(--text); }
.s-time {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.4rem; color: var(--accent); line-height: 1.2;
}
.s-meta { font-size: 0.78rem; color: var(--muted); margin-top: 0.2rem; }
.summary-divider { height: 1px; background: var(--line); margin: 0.75rem 0; }
.s-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 0.5rem; }
.seat-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.seat-tag {
  background: var(--tag-bg); color: var(--text);
  padding: 0.2rem 0.6rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}
.summary-row {
  display: flex; justify-content: space-between;
  font-size: 0.83rem; color: var(--muted); margin-bottom: 0.4rem;
}
.summary-row.total { font-weight: 600; color: var(--text); font-size: 0.9rem; }
.total-price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.2rem; color: var(--accent);
}
.gateway-badge {
  margin-top: 0.75rem; text-align: center;
  background: var(--tag-bg); border-radius: 6px;
  padding: 0.4rem; font-size: 0.78rem; color: var(--muted);
}
</style>
