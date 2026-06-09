<template>
  <div class="home">
    <!-- NAV -->
    <nav class="navbar">
      <span class="nav-logo">PAM TRAVEL</span>
      <div class="nav-links">
        <RouterLink to="/">Trang chủ</RouterLink>
        <RouterLink to="/my-tickets">Vé của tôi</RouterLink>
        <RouterLink v-if="auth.isDriver" to="/driver">Soát vé</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin">Quản trị</RouterLink>
      </div>
      <div class="nav-user">
        <span class="role-badge">{{ auth.user?.role }}</span>
        <span>{{ auth.user?.fullName || auth.user?.email }}</span>
        <button class="btn-logout" @click="logout">Đăng xuất</button>
      </div>
    </nav>

    <!-- HERO -->
    <div class="hero">
      <h1>TÌM CHUYẾN XE<br><span>PHÙ HỢP VỚI BẠN</span></h1>
      <p>Đặt vé nhanh chóng — chọn ghế theo ý muốn — thanh toán an toàn</p>
    </div>

    <!-- SEARCH CARD -->
    <div class="search-card">
      <div class="field">
        <label>Điểm đi</label>
        <select v-model="form.originId">
          <option value="">-- Chọn tỉnh --</option>
          <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Điểm đến</label>
        <select v-model="form.destinationId">
          <option value="">-- Chọn tỉnh --</option>
          <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Ngày đi</label>
        <input v-model="form.departureDate" type="date" :min="today" />
      </div>
      <button class="btn-search" :disabled="loading" @click="doSearch">
        {{ loading ? 'Đang tìm...' : 'TÌM CHUYẾN →' }}
      </button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()

const provinces = ref([])
const loading   = ref(false)
const error     = ref('')
const today     = new Date().toISOString().split('T')[0]

const form = ref({
  originId:      '',
  destinationId: '',
  departureDate: today,
})

onMounted(async () => {
  try {
    const res = await api.get('/trips/provinces')
    provinces.value = res.data
  } catch (e) {
    error.value = 'Không tải được danh sách tỉnh thành'
  }
})

async function doSearch() {
  error.value = ''
  if (!form.value.originId)      { error.value = 'Vui lòng chọn điểm đi'; return }
  if (!form.value.destinationId) { error.value = 'Vui lòng chọn điểm đến'; return }
  if (form.value.originId === form.value.destinationId) {
    error.value = 'Điểm đi và điểm đến không được giống nhau'; return
  }

  loading.value = true
  try {
    const res = await api.get('/trips/search', {
      params: {
        originId:      form.value.originId,
        destinationId: form.value.destinationId,
        departureDate: form.value.departureDate,
      }
    })

    // Lưu kết quả vào sessionStorage để SearchView dùng
    sessionStorage.setItem('search_results', JSON.stringify(res.data))
    sessionStorage.setItem('search_form',    JSON.stringify(form.value))

    router.push('/search')
  } catch (e) {
    error.value = e.response?.data?.error || 'Tìm kiếm thất bại'
  } finally {
    loading.value = false
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.home { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

/* NAV */
.navbar {
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2.5rem;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem;
  color: #e85d2f;
  letter-spacing: 2px;
}
.nav-links { display: flex; gap: 0.25rem; }
.nav-links a {
  color: #aaa;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  transition: all 0.15s;
}
.nav-links a:hover, .nav-links a.router-link-active { color: #fff; background: rgba(255,255,255,0.08); }
.nav-links a.router-link-exact-active { color: #e85d2f; }
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  color: #e85d2f;
}
.btn-logout {
  background: none;
  border: 1px solid #444;
  color: #888;
  padding: 0.25rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s;
}
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

/* HERO */
.hero {
  background: #0d0d0d;
  padding: 4rem 2.5rem 3rem;
}
.hero h1 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  color: #fff;
  line-height: 1.05;
  letter-spacing: 1px;
  max-width: 600px;
}
.hero h1 span { color: #e85d2f; }
.hero p { color: #888; font-size: 0.95rem; margin-top: 0.75rem; line-height: 1.6; }

/* SEARCH CARD */
.search-card {
  background: #fff;
  border: 1px solid #d4cfc6;
  border-radius: 12px;
  padding: 1.75rem;
  margin: 2rem 2.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #7a7468;
}
.field select, .field input {
  border: 1.5px solid #d4cfc6;
  border-radius: 8px;
  padding: 0.65rem 0.9rem;
  font-size: 0.9rem;
  color: #0d0d0d;
  background: #f5f2ec;
  outline: none;
  transition: border-color 0.15s;
  cursor: pointer;
}
.field select:focus, .field input:focus {
  border-color: #e85d2f;
  background: #fff;
}
.btn-search {
  background: #e85d2f;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.7rem 1.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-search:hover { background: #c44a1e; }
.btn-search:disabled { background: #d4cfc6; cursor: not-allowed; }

.error-msg {
  margin: 0 2.5rem;
  padding: 0.75rem 1rem;
  background: #fdf0ef;
  color: #c0392b;
  border-radius: 8px;
  font-size: 0.85rem;
  border: 1px solid #f5c6c2;
}
</style>