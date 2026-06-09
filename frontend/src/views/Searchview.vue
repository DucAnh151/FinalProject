<template>
  <div class="search-page">
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

    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">KẾT QUẢ TÌM KIẾM</h1>
        <p class="page-sub" v-if="searchForm">
          {{ getProvinceName(searchForm.originId) }} →
          {{ getProvinceName(searchForm.destinationId) }} |
          {{ formatDate(searchForm.departureDate) }}
        </p>
      </div>
      <button class="btn-back" @click="router.push('/')">← Tìm lại</button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="loading">Đang tải chuyến xe...</div>

    <!-- EMPTY -->
    <div v-else-if="!trips.length" class="empty">
      <div class="empty-icon">🚌</div>
      <div class="empty-title">Không có chuyến xe</div>
      <div class="empty-sub">Thử chọn ngày khác hoặc tuyến đường khác</div>
      <button class="btn-search-again" @click="router.push('/')">Tìm kiếm lại</button>
    </div>

    <!-- TRIP LIST -->
    <div v-else class="trip-list">
      <div v-for="trip in trips" :key="trip.id" class="trip-card" @click="selectTrip(trip)">
        <div class="trip-main">
          <div class="trip-route">
            <span class="city">{{ trip.origin }}</span>
            <span class="arrow">→</span>
            <span class="city">{{ trip.destination }}</span>
          </div>
          <div class="trip-time">
            <span class="time">{{ formatTime(trip.departureTime) }}</span>
            <span class="duration">~{{ getDuration(trip.departureTime, trip.arrivalTime) }}</span>
            <span class="time">{{ formatTime(trip.arrivalTime) }}</span>
          </div>
          <div class="trip-meta">
            <span class="operator">🚌 {{ trip.operator }}</span>
            <span class="vehicle">{{ trip.vehicleType }}</span>
          </div>
        </div>
        <div class="trip-right">
          <div class="price">{{ formatPrice(trip.price) }}<span>đ</span></div>
          <div class="seats">{{ trip.totalSeats }} chỗ</div>
          <button class="btn-select">Chọn ghế →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const auth   = useAuthStore()

const trips      = ref([])
const loading    = ref(true)
const searchForm = ref(null)
const provinces  = ref([])

onMounted(() => {
  const results = sessionStorage.getItem('search_results')
  const form    = sessionStorage.getItem('search_form')
  const provs   = sessionStorage.getItem('provinces_cache')

  if (!results) { router.push('/'); return }

  const data   = JSON.parse(results)
  trips.value  = data.trips || []
  searchForm.value = form ? JSON.parse(form) : null
  provinces.value  = provs ? JSON.parse(provs) : []
  loading.value    = false
})

function selectTrip(trip) {
  sessionStorage.setItem('selected_trip', JSON.stringify(trip))
  router.push(`/trips/${trip.id}/seats`)
}

function getProvinceName(id) {
  const p = provinces.value.find(p => p.id == id)
  return p?.name || id
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPrice(p) {
  return parseInt(p).toLocaleString('vi-VN')
}

function getDuration(dep, arr) {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.search-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

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
  text-decoration: none;
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
.nav-links a:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-user { display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem; color: #ccc; }
.role-badge {
  font-size: 0.7rem; font-weight: 600;
  padding: 0.2rem 0.6rem; border-radius: 10px;
  background: rgba(255,255,255,0.08); color: #e85d2f;
}
.btn-logout {
  background: none; border: 1px solid #444; color: #888;
  padding: 0.25rem 0.7rem; border-radius: 4px; cursor: pointer;
  font-size: 0.78rem; transition: all 0.15s;
}
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

.page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 2rem 2.5rem 1.25rem;
  border-bottom: 1px solid #d4cfc6;
  background: #fff;
}
.page-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; letter-spacing: 2px;
}
.page-sub { font-size: 0.85rem; color: #7a7468; margin-top: 0.3rem; }
.btn-back {
  background: none; border: 1.5px solid #d4cfc6;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.85rem; cursor: pointer; color: #7a7468;
  transition: all 0.15s;
}
.btn-back:hover { border-color: #e85d2f; color: #e85d2f; }

.loading { text-align: center; padding: 4rem; color: #7a7468; }

.empty {
  text-align: center; padding: 4rem 2rem;
}
.empty-icon { font-size: 4rem; margin-bottom: 1rem; }
.empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 1px; }
.empty-sub { color: #7a7468; margin: 0.5rem 0 1.5rem; }
.btn-search-again {
  background: #e85d2f; color: #fff; border: none;
  padding: 0.7rem 1.5rem; border-radius: 8px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
}

.trip-list { padding: 1.5rem 2.5rem; display: flex; flex-direction: column; gap: 1rem; }

.trip-card {
  background: #fff;
  border: 1px solid #d4cfc6;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.trip-card:hover {
  border-color: #e85d2f;
  box-shadow: 0 4px 16px rgba(232,93,47,0.12);
  transform: translateY(-1px);
}
.trip-main { flex: 1; }
.trip-route {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.city { font-size: 1.1rem; font-weight: 600; color: #0d0d0d; }
.arrow { color: #e85d2f; font-weight: 600; }
.trip-time {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 0.5rem;
}
.time { font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 500; }
.duration {
  font-size: 0.78rem; color: #7a7468;
  background: #f5f2ec; padding: 0.15rem 0.5rem; border-radius: 10px;
}
.trip-meta { display: flex; gap: 1rem; }
.operator, .vehicle { font-size: 0.82rem; color: #7a7468; }

.trip-right { text-align: right; }
.price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; color: #e85d2f; line-height: 1;
}
.price span { font-size: 1rem; }
.seats { font-size: 0.78rem; color: #7a7468; margin: 0.25rem 0 0.75rem; }
.btn-select {
  background: #e85d2f; color: #fff; border: none;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s; white-space: nowrap;
}
.btn-select:hover { background: #c44a1e; }
</style>