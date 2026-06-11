<template>
  <div class="settings-page">
    <UserHeader />

    <main class="content">
      <header class="page-head">
        <div>
          <h1>{{ ui.t.settings.title }}</h1>
          <p>{{ ui.t.settings.sub }}</p>
        </div>
        <div class="wallet-chip">
          <span>{{ ui.t.settings.walletLabel }}</span>
          <strong>{{ formatPrice(auth.user?.walletBalance || 0) }}</strong>
        </div>
      </header>

      <div class="settings-grid">
        <section class="panel">
          <h2>{{ ui.t.settings.profileTitle }}</h2>
          <div class="avatar-row">
            <img :src="profile.avatarUrl || fallbackAvatar" alt="Ảnh đại diện" />
            <div>
              <label class="upload-btn">
                {{ ui.t.settings.chooseAvatar }}
                <input type="file" accept="image/*" @change="onAvatarChange" />
              </label>
              <p>{{ ui.locale === 'vi' ? 'Ảnh được lưu vào hồ sơ dưới dạng dữ liệu ảnh demo.' : 'Avatar is saved in profile as demo image data.' }}</p>
            </div>
          </div>

          <div class="field">
            <label>{{ ui.t.settings.fullName }}</label>
            <input v-model="profile.fullName" type="text" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>{{ ui.t.settings.phone }}</label>
              <input v-model="profile.phone" type="tel" />
            </div>
            <div class="field">
              <label>{{ ui.t.settings.email }}</label>
              <input v-model="profile.email" type="email" />
            </div>
          </div>

          <div v-if="profileMsg" :class="['alert', profileOk ? 'ok' : 'fail']">{{ profileMsg }}</div>
          <button class="btn-primary" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? ui.t.settings.saving : ui.t.settings.saveProfile }}
          </button>
        </section>

        <section class="panel">
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

        <section class="panel">
          <h2>{{ ui.t.settings.tierTitle }}</h2>
          <div class="tier-box">
            <strong>{{ auth.user?.loyaltyTier || 'STANDARD' }}</strong>
            <span>{{ auth.user?.totalTrips || 0 }} {{ ui.t.settings.trips }} · {{ auth.user?.totalTickets || 0 }} {{ ui.t.settings.tickets }}</span>
          </div>
          <p class="panel-sub">{{ ui.t.settings.tierSub }}</p>
        </section>

        <section class="panel">
          <h2>{{ ui.t.settings.rechargeTitle }}</h2>
          <p class="panel-sub">{{ ui.t.settings.rechargeSub }}</p>

          <div class="field">
            <label>{{ ui.t.settings.amountLabel }}</label>
            <input v-model.number="rechargeAmount" type="number" min="10000" :placeholder="ui.t.settings.amountPlaceholder" />
          </div>

          <div class="quick-amounts">
            <button v-for="amt in [50000, 100000, 200000, 500000]" :key="amt" type="button" @click="rechargeAmount = amt" class="btn-amt">
              +{{ formatPrice(amt) }}
            </button>
          </div>

          <div v-if="auth.user?.hasPin" class="field" style="margin-top: 1rem">
            <label>{{ ui.t.settings.pinLabel }}</label>
            <input v-model="rechargePin" type="password" maxlength="6" placeholder="••••••" />
          </div>

          <div v-if="rechargeMsg" :class="['alert', rechargeOk ? 'ok' : 'fail']" style="margin-top: 1rem">{{ rechargeMsg }}</div>
          <button class="btn-primary" style="margin-top: 1rem" :disabled="recharging || !rechargeAmount || rechargeAmount <= 0" @click="doRecharge">
            {{ recharging ? ui.t.settings.recharging : ui.t.settings.rechargeBtn }}
          </button>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const auth = useAuthStore()
const ui   = useUiStore()

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

// Recharge simulated account wallet
const rechargeAmount = ref('')
const rechargePin    = ref('')
const recharging    = ref(false)
const rechargeMsg    = ref('')
const rechargeOk     = ref(false)

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
    profileMsg.value = ui.t.settings.profileOk
    profileOk.value = true
  } catch (e) {
    profileMsg.value = e.response?.data?.error || 'Update failed'
    profileOk.value = false
  } finally {
    savingProfile.value = false
  }
}

async function savePin() {
  pinMsg.value = ''
  if (!/^\d{6}$/.test(pin.value)) {
    pinMsg.value = ui.t.settings.pinInvalid
    pinOk.value = false
    return
  }
  if (pin.value !== pinConfirm.value) {
    pinMsg.value = ui.t.settings.pinMismatch
    pinOk.value = false
    return
  }

  savingPin.value = true
  try {
    await api.post('/payments/set-pin', { userId: auth.user.id, pin: pin.value })
    
    // Update local store hasPin
    const updatedUser = { ...auth.user }
    updatedUser.hasPin = true
    auth.setUser(updatedUser)

    pin.value = ''
    pinConfirm.value = ''
    pinMsg.value = ui.t.settings.pinOk
    pinOk.value = true
  } catch (e) {
    pinMsg.value = e.response?.data?.error || 'Update PIN failed'
    pinOk.value = false
  } finally {
    savingPin.value = false
  }
}

async function doRecharge() {
  rechargeMsg.value = ''
  if (!rechargeAmount.value || rechargeAmount.value < 10000) {
    rechargeMsg.value = ui.t.settings.minAmount
    rechargeOk.value = false
    return
  }

  recharging.value = true
  try {
    const res = await api.post('/payments/recharge', {
      userId: auth.user.id,
      amount: rechargeAmount.value,
      pin: rechargePin.value
    })

    rechargeMsg.value = res.data.message
    rechargeOk.value = true
    rechargeAmount.value = ''
    rechargePin.value = ''

    // Cập nhật số dư mới trong store
    const updatedUser = { ...auth.user }
    updatedUser.walletBalance = res.data.walletBalance
    auth.setUser(updatedUser)
  } catch (e) {
    rechargeMsg.value = e.response?.data?.error || 'Recharge failed'
    rechargeOk.value = false
  } finally {
    recharging.value = false
  }
}

function formatPrice(value) {
  if (!value) return ui.locale === 'vi' ? '0đ' : '0 VND'
  return Number(value || 0).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US') + (ui.locale === 'vi' ? 'đ' : ' VND')
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

.avatar-row img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--line);
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  margin-bottom: 6px;
  padding: 0 12px;
  color: var(--page-bg);
  background: var(--text);
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
