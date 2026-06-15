<template>
  <div class="settings-page">
    <UserHeader />

    <main class="content">
      <header class="page-head">
        <div>
          <h1>{{ ui.t.settings.title }}</h1>
          <p>{{ ui.t.settings.sub }}</p>
        </div>
        <!-- Chỉ CUSTOMER mới thấy số dư ví -->
        <div class="wallet-chip" v-if="auth.isCustomer">
          <span>{{ ui.t.settings.walletLabel }}</span>
          <strong>{{ formatPrice(auth.user?.walletBalance || 0) }}</strong>
        </div>
      </header>

      <div class="settings-grid">

        <!-- ═══════════════════════════════════════ -->
        <!-- PANEL 1: Thông tin cá nhân (MỌI ROLE)  -->
        <!-- ═══════════════════════════════════════ -->
        <section class="panel">
          <h2>{{ ui.t.settings.profileTitle }}</h2>

          <!-- Avatar -->
          <div class="avatar-row">
            <img :src="avatarPreview" alt="Ảnh đại diện" class="avatar-preview" />
            <div class="avatar-actions">
              <label class="upload-btn">
                {{ ui.t.settings.chooseAvatar }}
                <input type="file" accept="image/*" @change="onAvatarChange" />
              </label>
              <button
                v-if="pendingAvatar"
                class="btn-save-avatar"
                :disabled="savingAvatar"
                @click="saveAvatar"
              >
                {{ savingAvatar ? 'Đang lưu...' : 'Lưu ảnh' }}
              </button>
              <p class="avatar-hint">JPG, PNG. Hiển thị trên thanh điều hướng.</p>
            </div>
          </div>
          <div v-if="avatarMsg" :class="['alert', avatarOk ? 'ok' : 'fail']">{{ avatarMsg }}</div>

          <!-- Họ tên -->
          <div class="field">
            <label>{{ ui.t.settings.fullName }}</label>
            <input v-model="profile.fullName" type="text" />
          </div>

          <!-- SĐT -->
          <div class="field">
            <label>{{ ui.t.settings.phone }}</label>
            <input v-model="profile.phone" type="tel" />
          </div>

          <!-- Email — readonly -->
          <div class="field">
            <label>{{ ui.t.settings.email }} <span class="readonly-badge">Không thể thay đổi</span></label>
            <input :value="auth.user?.email || '—'" type="email" readonly class="input-readonly" />
          </div>

          <div v-if="profileMsg" :class="['alert', profileOk ? 'ok' : 'fail']">{{ profileMsg }}</div>
          <button class="btn-primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? ui.t.settings.saving : ui.t.settings.saveProfile }}
          </button>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- PANEL 2: Đổi mật khẩu (MỌI ROLE)      -->
        <!-- ═══════════════════════════════════════ -->
        <section class="panel">
          <h2>Đổi mật khẩu</h2>
          <p class="panel-sub">Nhập mật khẩu hiện tại để xác nhận thay đổi.</p>

          <div class="field">
            <label>Mật khẩu hiện tại</label>
            <input v-model="pwForm.current" type="password" placeholder="••••••" />
          </div>
          <div class="field">
            <label>Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input v-model="pwForm.newPw" type="password" placeholder="••••••" />
          </div>
          <div class="field">
            <label>Nhập lại mật khẩu mới</label>
            <input v-model="pwForm.confirm" type="password" placeholder="••••••" />
          </div>

          <div v-if="pwMsg" :class="['alert', pwOk ? 'ok' : 'fail']">{{ pwMsg }}</div>
          <button class="btn-primary" :disabled="savingPw" @click="savePassword">
            {{ savingPw ? 'Đang cập nhật...' : 'Đổi mật khẩu' }}
          </button>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- PANEL 3: PIN thanh toán (CHỈ CUSTOMER) -->
        <!-- ═══════════════════════════════════════ -->
        <section class="panel" v-if="auth.isCustomer">
          <h2>{{ ui.t.settings.pinTitle }}</h2>
          <p class="panel-sub">{{ ui.t.settings.pinSub }}</p>

          <div class="field">
            <label>{{ ui.t.settings.newPin }}</label>
            <input v-model="pin" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" />
          </div>
          <div class="field">
            <label>{{ ui.t.settings.confirmPin }}</label>
            <input v-model="pinConfirm" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" />
          </div>

          <div v-if="pinMsg" :class="['alert', pinOk ? 'ok' : 'fail']">{{ pinMsg }}</div>
          <button class="btn-primary" :disabled="savingPin" @click="savePin">
            {{ savingPin ? ui.t.settings.savingPin : ui.t.settings.savePin }}
          </button>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- PANEL 4: Hạng thành viên (CHỈ CUSTOMER)-->
        <!-- ═══════════════════════════════════════ -->
        <section class="panel" v-if="auth.isCustomer">
          <h2>{{ ui.t.settings.tierTitle }}</h2>
          <div class="tier-box">
            <strong>{{ auth.user?.loyaltyTier || 'STANDARD' }}</strong>
            <span>{{ auth.user?.totalTrips || 0 }} {{ ui.t.settings.trips }} · {{ auth.user?.totalTickets || 0 }} {{ ui.t.settings.tickets }}</span>
          </div>
          <p class="panel-sub">{{ ui.t.settings.tierSub }}</p>
        </section>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- PANEL 5: Nạp tiền ví (CHỈ CUSTOMER)           -->
        <!-- ═══════════════════════════════════════════════ -->
        <section class="panel panel-wide" v-if="auth.isCustomer">
          <h2>{{ ui.t.settings.rechargeTitle }}</h2>
          <p class="panel-sub">{{ ui.t.settings.rechargeSub }}</p>

          <div v-if="!topupOtpStep">
            <div class="field">
              <label>{{ ui.t.settings.amountLabel }}</label>
              <input v-model.number="rechargeAmount" type="number" min="10000" :placeholder="ui.t.settings.amountPlaceholder" />
            </div>
            <div class="quick-amounts">
              <button v-for="amt in [50000, 100000, 200000, 500000]" :key="amt" type="button" @click="rechargeAmount = amt" class="btn-amt">
                +{{ formatPrice(amt) }}
              </button>
            </div>
            <div class="field" style="margin-top: 1rem">
              <label>{{ ui.t.settings.pinLabel }}</label>
              <input v-model="rechargePin" type="password" maxlength="6" placeholder="••••••" />
            </div>
            <div v-if="rechargeMsg" :class="['alert', rechargeOk ? 'ok' : 'fail']" style="margin-top: 1rem">{{ rechargeMsg }}</div>
            <button class="btn-primary" style="margin-top: 1rem" :disabled="recharging || !rechargeAmount || rechargeAmount <= 0" @click="startTopup">
              {{ recharging ? ui.t.settings.recharging : ui.t.settings.rechargeBtn }}
            </button>
          </div>

          <div v-else>
            <div class="field">
              <label>{{ ui.t.settings.otpTitle }}</label>
              <input v-model="topupOtp" type="text" maxlength="6" placeholder="000000" />
              <p v-if="devTopupOtp" class="panel-sub">Dev OTP: {{ devTopupOtp }}</p>
            </div>
            <div v-if="rechargeMsg" :class="['alert', rechargeOk ? 'ok' : 'fail']">{{ rechargeMsg }}</div>
            <button class="btn-primary" :disabled="recharging || !topupOtp" @click="confirmTopup">
              {{ recharging ? ui.t.settings.recharging : ui.t.settings.otpConfirmBtn }}
            </button>
            <button class="btn-secondary" type="button" @click="topupOtpStep = false">←</button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- PANEL 6: Lịch sử giao dịch (CHỈ CUSTOMER)     -->
        <!-- ═══════════════════════════════════════════════ -->
        <section class="panel panel-wide" v-if="auth.isCustomer">
          <h2>{{ ui.t.settings.walletHistory }}</h2>
          <div v-if="loadingTx" class="panel-sub">{{ ui.t.tickets.loading }}</div>
          <div v-else-if="!transactions.length" class="panel-sub">{{ ui.t.settings.noTransactions }}</div>
          <div v-else class="tx-list">
            <div v-for="tx in transactions" :key="tx.id" class="tx-row">
              <div>
                <strong>{{ txTypeLabel(tx.type) }}</strong>
                <div class="tx-desc">{{ tx.description || '—' }}</div>
                <div class="tx-date">{{ formatDatetime(tx.createdAt) }}</div>
              </div>
              <div :class="['tx-amount', tx.type === 'PAYMENT' ? 'neg' : 'pos']">
                {{ tx.type === 'PAYMENT' ? '-' : '+' }}{{ formatPrice(tx.amount) }}
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const auth = useAuthStore()
const ui   = useUiStore()

// ── Avatar ────────────────────────────────────────────────────────────────────
const pendingAvatar  = ref(null)   // base64 chờ lưu
const savingAvatar   = ref(false)
const avatarMsg      = ref('')
const avatarOk       = ref(false)

const avatarPreview = computed(() => {
  if (pendingAvatar.value) return pendingAvatar.value
  if (auth.user?.avatarUrl) return auth.user.avatarUrl
  const initial = (auth.user?.fullName || auth.user?.email || 'U')[0].toUpperCase()
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="16" fill="%23e85d2f"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="white">${initial}</text></svg>`
})

function onAvatarChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { pendingAvatar.value = reader.result }
  reader.readAsDataURL(file)
}

async function saveAvatar() {
  avatarMsg.value = ''
  savingAvatar.value = true
  try {
    await auth.updateAvatar(pendingAvatar.value)
    pendingAvatar.value = null
    avatarMsg.value = 'Đã cập nhật ảnh đại diện'
    avatarOk.value  = true
  } catch (e) {
    avatarMsg.value = e.response?.data?.error || 'Lỗi khi lưu ảnh'
    avatarOk.value  = false
  } finally {
    savingAvatar.value = false
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────
const profile = ref({
  fullName: auth.user?.fullName || '',
  phone:    auth.user?.phone    || '',
})
const savingProfile = ref(false)
const profileMsg    = ref('')
const profileOk     = ref(false)

async function saveProfile() {
  profileMsg.value = ''
  savingProfile.value = true
  try {
    // Chỉ gửi fullName và phone (không gửi email)
    await api.put('/auth/profile', {
      userId:   auth.user.id,
      fullName: profile.value.fullName,
      phone:    profile.value.phone || null,
      email:    auth.user?.email || null,   // giữ nguyên email cũ
    })
    // Cập nhật local store
    const updatedUser = { ...auth.user, fullName: profile.value.fullName, phone: profile.value.phone }
    auth.setUser(updatedUser)
    profileMsg.value = ui.t.settings.profileOk
    profileOk.value  = true
  } catch (e) {
    profileMsg.value = e.response?.data?.error || 'Cập nhật thất bại'
    profileOk.value  = false
  } finally {
    savingProfile.value = false
  }
}

// ── Password ──────────────────────────────────────────────────────────────────
const pwForm = ref({ current: '', newPw: '', confirm: '' })
const savingPw = ref(false)
const pwMsg    = ref('')
const pwOk     = ref(false)

async function savePassword() {
  pwMsg.value = ''
  if (!pwForm.value.current) { pwMsg.value = 'Vui lòng nhập mật khẩu hiện tại'; return }
  if (pwForm.value.newPw.length < 6) { pwMsg.value = 'Mật khẩu mới tối thiểu 6 ký tự'; return }
  if (pwForm.value.newPw !== pwForm.value.confirm) { pwMsg.value = 'Mật khẩu nhập lại không khớp'; return }

  savingPw.value = true
  try {
    await auth.changePassword(pwForm.value.current, pwForm.value.newPw)
    pwMsg.value = 'Đã cập nhật mật khẩu thành công'
    pwOk.value  = true
    pwForm.value = { current: '', newPw: '', confirm: '' }
  } catch (e) {
    pwMsg.value = e.response?.data?.error || 'Đổi mật khẩu thất bại'
    pwOk.value  = false
  } finally {
    savingPw.value = false
  }
}

// ── PIN (CUSTOMER only) ───────────────────────────────────────────────────────
const pin        = ref('')
const pinConfirm = ref('')
const savingPin  = ref(false)
const pinMsg     = ref('')
const pinOk      = ref(false)

async function savePin() {
  pinMsg.value = ''
  if (!/^\d{6}$/.test(pin.value)) { pinMsg.value = ui.t.settings.pinInvalid; pinOk.value = false; return }
  if (pin.value !== pinConfirm.value) { pinMsg.value = ui.t.settings.pinMismatch; pinOk.value = false; return }

  savingPin.value = true
  try {
    await api.post('/payments/set-pin', { userId: auth.user.id, pin: pin.value })
    auth.setUser({ ...auth.user, hasPin: true })
    pin.value = ''; pinConfirm.value = ''
    pinMsg.value = ui.t.settings.pinOk
    pinOk.value  = true
  } catch (e) {
    pinMsg.value = e.response?.data?.error || 'Cập nhật PIN thất bại'
    pinOk.value  = false
  } finally {
    savingPin.value = false
  }
}

// ── Wallet / Topup (CUSTOMER only) ────────────────────────────────────────────
const rechargeAmount = ref('')
const rechargePin    = ref('')
const recharging     = ref(false)
const rechargeMsg    = ref('')
const rechargeOk     = ref(false)
const topupOtpStep   = ref(false)
const topupOtp       = ref('')
const devTopupOtp    = ref('')
const transactions   = ref([])
const loadingTx      = ref(false)

onMounted(() => {
  if (auth.isCustomer) loadWallet()
})

async function loadWallet() {
  loadingTx.value = true
  try {
    const res = await api.get(`/wallet/${auth.user.id}`)
    transactions.value = res.data.transactions || []
    auth.setUser({ ...auth.user, walletBalance: res.data.balance })
  } catch { transactions.value = [] }
  finally { loadingTx.value = false }
}

async function startTopup() {
  rechargeMsg.value = ''
  if (!rechargeAmount.value || rechargeAmount.value < 10000) { rechargeMsg.value = ui.t.settings.minAmount; rechargeOk.value = false; return }
  if (!rechargePin.value) { rechargeMsg.value = 'Vui lòng nhập PIN'; rechargeOk.value = false; return }

  recharging.value = true
  try {
    const res = await api.post('/wallet/topup/initiate', { userId: auth.user.id, amount: rechargeAmount.value, pin: rechargePin.value })
    devTopupOtp.value  = res.data.otp || ''
    topupOtpStep.value = true
    rechargeMsg.value  = ''
  } catch (e) {
    rechargeMsg.value = e.response?.data?.error || 'Thất bại'
    rechargeOk.value  = false
  } finally { recharging.value = false }
}

async function confirmTopup() {
  rechargeMsg.value = ''
  recharging.value  = true
  try {
    const res = await api.post('/wallet/topup/confirm', { userId: auth.user.id, amount: rechargeAmount.value, otp: topupOtp.value })
    rechargeMsg.value  = res.data.message
    rechargeOk.value   = true
    rechargeAmount.value = ''; rechargePin.value = ''; topupOtp.value = ''
    topupOtpStep.value = false
    auth.setUser({ ...auth.user, walletBalance: res.data.walletBalance })
    await loadWallet()
  } catch (e) {
    rechargeMsg.value = e.response?.data?.error || 'Xác nhận thất bại'
    rechargeOk.value  = false
  } finally { recharging.value = false }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function txTypeLabel(type) {
  const map = { TOPUP: ui.t.settings.txTopup, PAYMENT: ui.t.settings.txPayment, REFUND: ui.t.settings.txRefund, BONUS: ui.t.settings.txBonus }
  return map[type] || type
}
function formatPrice(value) {
  if (!value) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return Number(value || 0).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US') + (ui.locale === 'vi' ? 'đ' : ' VND')
}
function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text);
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

.content {
  max-width: 1080px;
  padding: 2rem 2.5rem;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 1.5rem;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 2rem;
}

.page-head p,
.panel-sub,
.avatar-row p {
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.6;
}

.wallet-chip {
  display: grid;
  gap: 4px;
  min-width: 160px;
  padding: 14px 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.wallet-chip span {
  color: var(--muted);
  font-size: 0.75rem;
}

.wallet-chip strong {
  color: var(--accent);
  font-size: 1.2rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1.5rem;
}

.panel h2 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
}
.avatar-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.avatar-hint {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0;
}
.btn-save-avatar {
  background: #2d7a4f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-save-avatar:disabled { opacity: 0.6; cursor: not-allowed; }

.readonly-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
  background: rgba(122, 116, 104, 0.15);
  color: var(--muted);
  margin-left: 0.4rem;
  text-transform: none;
  letter-spacing: 0;
}
.input-readonly {
  background: var(--tag-bg) !important;
  color: var(--muted) !important;
  cursor: not-allowed;
} 

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: fit-content;
  min-height: 34px;
  padding: 0 14px;
  color: var(--accent);
  background: transparent;
  border: 1.5px solid var(--accent);
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 0;
}

.upload-btn::before {
  content: '📷';
  font-size: 0.9rem;
}

.upload-btn:hover {
  background: var(--accent);
  color: #fff;
}

.upload-btn input {
  display: none;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.field {
  display: grid;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.field label {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.field input {
  min-height: 42px;
  color: var(--text);
  background: var(--input-bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 12px;
  outline: none;
}

.field input:focus {
  border-color: var(--accent);
  background: var(--input-focus-bg);
}

.btn-primary {
  width: 100%;
  min-height: 44px;
  color: #fff;
  background: var(--accent);
  border: 0;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary:disabled {
  background: var(--line);
  color: var(--muted);
  cursor: not-allowed;
}

.alert {
  margin: 0 0 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.84rem;
}

.alert.ok {
  color: #1f6b42;
  background: rgba(45, 122, 79, 0.1);
  border: 1px solid rgba(45, 122, 79, 0.3);
}

.alert.fail {
  color: #a73324;
  background: rgba(192, 57, 43, 0.1);
  border: 1px solid rgba(192, 57, 43, 0.3);
}

.tier-box {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0.8rem;
  padding: 14px;
  background: var(--input-bg);
  border-radius: 8px;
}

.tier-box strong {
  color: var(--accent);
}

.tier-box span {
  color: var(--muted);
  font-size: 0.85rem;
}

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.btn-amt {
  background: var(--input-bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-amt:hover {
  background: var(--tag-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.panel-wide {
  grid-column: 1 / -1;
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--input-bg);
  border-radius: 8px;
  font-size: 0.85rem;
}

.tx-desc { color: var(--muted); font-size: 0.78rem; margin-top: 0.15rem; }
.tx-date { color: var(--muted); font-size: 0.72rem; margin-top: 0.15rem; }
.tx-amount { font-weight: 700; white-space: nowrap; }
.tx-amount.pos { color: #2d7a4f; }
.tx-amount.neg { color: #c0392b; }

.btn-secondary {
  width: 100%;
  margin-top: 0.5rem;
  min-height: 40px;
  background: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  color: var(--muted);
}

@media (max-width: 820px) {
  .content {
    padding-inline: 1rem;
  }

  .settings-grid,
  .field-row {
    grid-template-columns: 1fr;
  }

  .page-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
