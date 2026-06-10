<template>
  <div class="settings-page">
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <RouterLink v-if="!auth.isAdmin" to="/home">Trang chủ</RouterLink>
        <RouterLink v-if="!auth.isAdmin" to="/my-tickets">Vé của tôi</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin">Quản trị</RouterLink>
        <RouterLink to="/settings">Cài đặt</RouterLink>
      </div>
      <button class="btn-logout" @click="logout">Đăng xuất</button>
    </nav>

    <main class="content">
      <header class="page-head">
        <div>
          <h1>Cài đặt cá nhân</h1>
          <p>Quản lý hồ sơ, ảnh đại diện và mã PIN thanh toán.</p>
        </div>
        <div class="wallet-chip">
          <span>Số dư ví</span>
          <strong>{{ formatPrice(auth.user?.walletBalance || 0) }}</strong>
        </div>
      </header>

      <div class="settings-grid">
        <section class="panel">
          <h2>Thông tin tài khoản</h2>
          <div class="avatar-row">
            <img :src="profile.avatarUrl || fallbackAvatar" alt="Ảnh đại diện" />
            <div>
              <label class="upload-btn">
                Chọn ảnh
                <input type="file" accept="image/*" @change="onAvatarChange" />
              </label>
              <p>Ảnh được lưu vào hồ sơ dưới dạng dữ liệu ảnh demo.</p>
            </div>
          </div>

          <div class="field">
            <label>Họ và tên</label>
            <input v-model="profile.fullName" type="text" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Số điện thoại</label>
              <input v-model="profile.phone" type="tel" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model="profile.email" type="email" />
            </div>
          </div>

          <div v-if="profileMsg" :class="['alert', profileOk ? 'ok' : 'fail']">{{ profileMsg }}</div>
          <button class="btn-primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? 'Đang lưu...' : 'Lưu thông tin' }}
          </button>
        </section>

        <section class="panel">
          <h2>Mã PIN thanh toán</h2>
          <p class="panel-sub">PIN gồm 6 chữ số, dùng khi thanh toán vé hoặc nạp tiền vào ví.</p>

          <div class="field">
            <label>PIN mới</label>
            <input v-model="pin" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" />
          </div>
          <div class="field">
            <label>Nhập lại PIN</label>
            <input v-model="pinConfirm" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" />
          </div>

          <div v-if="pinMsg" :class="['alert', pinOk ? 'ok' : 'fail']">{{ pinMsg }}</div>
          <button class="btn-primary" :disabled="savingPin" @click="savePin">
            {{ savingPin ? 'Đang cập nhật...' : 'Cập nhật PIN' }}
          </button>
        </section>

        <section class="panel">
          <h2>Phân hạng thân thiết</h2>
          <div class="tier-box">
            <strong>{{ auth.user?.loyaltyTier || 'STANDARD' }}</strong>
            <span>{{ auth.user?.totalTrips || 0 }} chuyến · {{ auth.user?.totalTickets || 0 }} vé</span>
          </div>
          <p class="panel-sub">Phần giảm giá theo hạng sẽ được nối ở phase loyalty.</p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const auth = useAuthStore()

const fallbackAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="24" fill="%23e85d2f"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="64" fill="white">P</text></svg>'

const profile = ref({
  fullName: auth.user?.fullName || '',
  phone: auth.user?.phone || '',
  email: auth.user?.email || '',
  avatarUrl: auth.user?.avatarUrl || '',
})

const pin = ref('')
const pinConfirm = ref('')
const savingProfile = ref(false)
const savingPin = ref(false)
const profileMsg = ref('')
const profileOk = ref(false)
const pinMsg = ref('')
const pinOk = ref(false)

function onAvatarChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    profile.value.avatarUrl = reader.result
  }
  reader.readAsDataURL(file)
}

async function saveProfile() {
  profileMsg.value = ''
  savingProfile.value = true
  try {
    await auth.updateProfile(profile.value)
    profileMsg.value = 'Đã cập nhật thông tin tài khoản.'
    profileOk.value = true
  } catch (e) {
    profileMsg.value = e.response?.data?.error || 'Cập nhật thất bại'
    profileOk.value = false
  } finally {
    savingProfile.value = false
  }
}

async function savePin() {
  pinMsg.value = ''
  if (!/^\d{6}$/.test(pin.value)) {
    pinMsg.value = 'PIN phải gồm đúng 6 chữ số.'
    pinOk.value = false
    return
  }
  if (pin.value !== pinConfirm.value) {
    pinMsg.value = 'PIN nhập lại không khớp.'
    pinOk.value = false
    return
  }

  savingPin.value = true
  try {
    await api.post('/payments/set-pin', { userId: auth.user.id, pin: pin.value })
    pin.value = ''
    pinConfirm.value = ''
    pinMsg.value = 'Đã cập nhật PIN thanh toán.'
    pinOk.value = true
  } catch (e) {
    pinMsg.value = e.response?.data?.error || 'Cập nhật PIN thất bại'
    pinOk.value = false
  } finally {
    savingPin.value = false
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ'
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #f5f2ec;
  color: #0d0d0d;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 60px;
  padding: 0 2.5rem;
  background: #0d0d0d;
}

.nav-logo {
  color: #e85d2f;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 1px;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 6px;
}

.nav-links a {
  color: #aaa;
  border-radius: 6px;
  padding: 8px 12px;
  text-decoration: none;
  font-size: 0.85rem;
}

.nav-links a:hover,
.nav-links a.router-link-exact-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.btn-logout {
  color: #aaa;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 7px 12px;
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
  color: #7a7468;
  font-size: 0.88rem;
  line-height: 1.6;
}

.wallet-chip {
  display: grid;
  gap: 4px;
  min-width: 160px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #d4cfc6;
  border-radius: 8px;
}

.wallet-chip span {
  color: #7a7468;
  font-size: 0.75rem;
}

.wallet-chip strong {
  color: #e85d2f;
  font-size: 1.2rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
}

.panel {
  background: #fff;
  border: 1px solid #d4cfc6;
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

.avatar-row img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid #d4cfc6;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin-bottom: 6px;
  padding: 0 12px;
  color: #fff;
  background: #0d0d0d;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
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
  color: #7a7468;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.field input {
  min-height: 42px;
  color: #0d0d0d;
  background: #f5f2ec;
  border: 1px solid #d4cfc6;
  border-radius: 8px;
  padding: 0 12px;
  outline: none;
}

.field input:focus {
  border-color: #e85d2f;
  background: #fff;
}

.btn-primary {
  width: 100%;
  min-height: 44px;
  color: #fff;
  background: #e85d2f;
  border: 0;
  border-radius: 8px;
  font-weight: 800;
}

.btn-primary:disabled {
  background: #d4cfc6;
}

.alert {
  margin: 0 0 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.84rem;
}

.alert.ok {
  color: #1f6b42;
  background: #edf7f1;
  border: 1px solid #b8dfc8;
}

.alert.fail {
  color: #a73324;
  background: #fdf0ef;
  border: 1px solid #f5c6c2;
}

.tier-box {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0.8rem;
  padding: 14px;
  background: #f5f2ec;
  border-radius: 8px;
}

.tier-box strong {
  color: #e85d2f;
}

.tier-box span {
  color: #7a7468;
  font-size: 0.85rem;
}

@media (max-width: 820px) {
  .navbar,
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
