<template>
  <div class="auth-page">
    <!-- Left panel -->
    <div class="panel-left">
      <div class="brand">PAM TRAVEL</div>
      <div class="tagline">
        <h2>ĐẶT VÉ<br><span>THÔNG MINH</span></h2>
        <p>Hệ thống đặt vé xe khách trực tuyến. Tìm chuyến, chọn ghế, thanh toán an toàn.</p>
      </div>
      <div class="features">
        <div class="feature"><span class="dot"></span> Sơ đồ ghế thời gian thực</div>
        <div class="feature"><span class="dot"></span> Thanh toán PIN + OTP</div>
        <div class="feature"><span class="dot"></span> Vé điện tử QR Code</div>
        <div class="feature"><span class="dot"></span> Soát vé tự động</div>
      </div>
    </div>

    <!-- Right panel -->
    <div class="panel-right">
      <div class="form-box">
        <!-- Tabs -->
        <div class="tabs">
          <div :class="['tab', { active: tab === 'login' }]" @click="tab = 'login'">Đăng nhập</div>
          <div :class="['tab', { active: tab === 'register' }]" @click="tab = 'register'">Đăng ký</div>
        </div>

        <!-- LOGIN -->
        <div v-if="tab === 'login'">
          <div class="form-title">CHÀO MỪNG</div>
          <div class="form-sub">Đăng nhập bằng email hoặc số điện thoại</div>

          <div v-if="error" class="alert alert-error">{{ error }}</div>
          <div v-if="success" class="alert alert-success">{{ success }}</div>

          <div class="field">
            <label>Email hoặc Số điện thoại</label>
            <input v-model="loginForm.identifier" type="text" placeholder="abc@travel.vn"
              @keyup.enter="doLogin" />
          </div>
          <div class="field">
            <label>Mật khẩu</label>
            <input v-model="loginForm.password" type="password" placeholder="••••••"
              @keyup.enter="doLogin" />
          </div>

          <button class="btn-submit" :disabled="loading" @click="doLogin">
            <span v-if="loading">Đang đăng nhập...</span>
            <span v-else>ĐĂNG NHẬP</span>
          </button>

          <div class="hint">
            <strong>Tài khoản thử nghiệm:</strong><br>
            admin@pamtravel.vn / admin123<br>
            driver1@travel.vn/ driver123<br>
            khach1@gmail.com / customer123
          </div>
        </div>

        <!-- REGISTER -->
        <div v-if="tab === 'register'">
          <div class="form-title">TẠO TÀI KHOẢN</div>
          <div class="form-sub">Đăng ký tài khoản hành khách mới</div>

          <div v-if="error" class="alert alert-error">{{ error }}</div>
          <div v-if="success" class="alert alert-success">{{ success }}</div>

          <div class="field">
            <label>Họ và tên</label>
            <input v-model="regForm.fullName" type="text" placeholder="Nguyễn Văn A" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Số điện thoại</label>
              <input v-model="regForm.phone" type="tel" placeholder="0901234567" />
            </div>
            <div class="field">
              <label>Email</label>
              <input v-model="regForm.email" type="email" placeholder="email@gmail.com" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Mật khẩu</label>
              <input v-model="regForm.password" type="password" placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div class="field">
              <label>Xác nhận mật khẩu</label>
              <input v-model="regForm.confirm" type="password" placeholder="Nhập lại" />
            </div>
          </div>

          <button class="btn-submit" :disabled="loading" @click="doRegister" style="margin-top:1.25rem">
            <span v-if="loading">Đang đăng ký...</span>
            <span v-else>TẠO TÀI KHOẢN</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router   = useRouter()
const route    = useRoute()
const auth     = useAuthStore()
const tab      = ref('login')
const loading  = ref(false)
const error    = ref('')
const success  = ref('')

const loginForm = ref({ identifier: '', password: '' })
const regForm   = ref({ fullName: '', phone: '', email: '', password: '', confirm: '' })

// Xóa alert khi đổi tab
watch(tab, () => { error.value = ''; success.value = '' })

async function doLogin() {
  error.value = ''; success.value = ''
  if (!loginForm.value.identifier || !loginForm.value.password) {
    error.value = 'Vui lòng nhập đầy đủ thông tin'; return
  }
  loading.value = true
  try {
    await auth.login(loginForm.value.identifier, loginForm.value.password)
    success.value = `Xin chào ${auth.user.fullName || auth.user.email}! Đang chuyển trang...`
    setTimeout(() => router.push(route.query.redirect || '/home'), 800)
  } catch (e) {
    error.value = e.response?.data?.error || 'Đăng nhập thất bại'
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  error.value = ''; success.value = ''
  const { fullName, phone, email, password, confirm } = regForm.value
  if (!fullName) { error.value = 'Vui lòng nhập họ tên'; return }
  if (!phone && !email) { error.value = 'Nhập số điện thoại hoặc email'; return }
  if (password.length < 6) { error.value = 'Mật khẩu tối thiểu 6 ký tự'; return }
  if (password !== confirm) { error.value = 'Mật khẩu xác nhận không khớp'; return }

  loading.value = true
  try {
    await auth.register(fullName, phone || null, email || null, password)
    success.value = 'Tạo tài khoản thành công! Đang chuyển sang đăng nhập...'
    setTimeout(() => {
      loginForm.value.identifier = phone || email
      tab.value = 'login'
      success.value = 'Tài khoản đã tạo. Vui lòng đăng nhập.'
    }, 1200)
  } catch (e) {
    error.value = e.response?.data?.error || 'Đăng ký thất bại'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
}
.panel-left {
  background: #0d0d0d;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3rem;
}
.brand {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  color: #e85d2f;
  letter-spacing: 3px;
}
.tagline h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 3.5rem;
  color: #fff;
  line-height: 1;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}
.tagline h2 span { color: #e85d2f; }
.tagline p { color: #666; font-size: 0.9rem; line-height: 1.7; }
.features { display: flex; flex-direction: column; gap: 0.75rem; }
.feature { display: flex; align-items: center; gap: 0.75rem; color: #555; font-size: 0.82rem; }
.dot { width: 6px; height: 6px; background: #e85d2f; border-radius: 50%; flex-shrink: 0; }
.panel-right {
  background: #f5f2ec;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
}
.form-box { width: 100%; max-width: 400px; }
.tabs { display: flex; border-bottom: 2px solid #d4cfc6; margin-bottom: 2rem; }
.tab {
  padding: 0.75rem 1.5rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #7a7468;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}
.tab.active { color: #e85d2f; border-bottom-color: #e85d2f; }
.form-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  letter-spacing: 1px;
  margin-bottom: 0.35rem;
}
.form-sub { font-size: 0.83rem; color: #7a7468; margin-bottom: 1.75rem; }
.field { margin-bottom: 1.1rem; }
.field label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #7a7468;
  margin-bottom: 0.4rem;
}
.field input {
  width: 100%;
  border: 1.5px solid #d4cfc6;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
  color: #0d0d0d; 
}
.field input:focus { border-color: #e85d2f; }
.field input::placeholder {color: #aaa;}
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.btn-submit {
  width: 100%;
  background: #e85d2f;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 0.5rem;
}
.btn-submit:hover { background: #c44a1e; }
.btn-submit:disabled { background: #d4cfc6; cursor: not-allowed; }
.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.83rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}
.alert-error { background: #fdf0ef; color: #c0392b; border: 1px solid #f5c6c2; }
.alert-success { background: #edf7f1; color: #2d7a4f; border: 1px solid #b8dfc8; }
.hint {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #ede9e1;
  border-radius: 8px;
  font-size: 0.78rem;
  color: #7a7468;
  line-height: 1.7;
}
.hint strong { color: #0d0d0d; }
</style>
