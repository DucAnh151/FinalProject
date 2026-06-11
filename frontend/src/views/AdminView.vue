<template>
  <div class="admin-page">
    <!-- NAV -->
    <nav class="navbar">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <div class="nav-links">
        <button
          v-for="tab in tabs" :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="nav-user">
        <span class="role-badge">ADMIN</span>
        <span>{{ auth.user?.fullName }}</span>
        <button class="btn-logout" @click="logout">Đăng xuất</button>
      </div>
    </nav>

    <!-- STATS ROW -->
    <div class="stats-row">
      <div class="stat-card" v-for="s in summaryCards" :key="s.label">
        <div class="stat-num">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- TABS CONTENT -->
    <div class="content">

      <!-- ── TRIPS TAB ── -->
      <div v-if="activeTab === 'trips'">
        <div class="section-header">
          <span class="section-title">DANH SÁCH CHUYẾN XE</span>
          <div class="filter-bar">
            <select v-model="tripFilter">
              <option value="">Tất cả trạng thái</option>
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Tuyến</th><th>Nhà xe</th>
                <th>Khởi hành</th><th>Giá</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="6" class="loading">Đang tải...</td></tr>
              <tr v-else-if="!filteredTrips.length"><td colspan="6" class="loading">Không có dữ liệu</td></tr>
              <tr v-for="t in filteredTrips" :key="t.id">
                <td class="mono">#{{ t.id }}</td>
                <td><strong>{{ t.origin }}</strong> → {{ t.destination }}</td>
                <td>{{ t.operator }}</td>
                <td class="mono">{{ formatDateTime(t.departureTime) }}</td>
                <td class="mono">{{ formatPrice(t.price) }}đ</td>
                <td><span :class="['badge', `badge-${t.status.toLowerCase()}`]">{{ t.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── BOOKINGS TAB ── -->
      <div v-if="activeTab === 'bookings'">
        <div class="section-header">
          <span class="section-title">ĐƠN ĐẶT VÉ</span>
          <div class="filter-bar">
            <select v-model="bookingFilter">
              <option value="">Tất cả</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Khách hàng</th><th>Tuyến</th>
                <th>Tổng tiền</th><th>Ngày đặt</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingBookings"><td colspan="6" class="loading">Đang tải...</td></tr>
              <tr v-else-if="!filteredBookings.length"><td colspan="6" class="loading">Không có dữ liệu</td></tr>
              <tr v-for="b in filteredBookings" :key="b.id">
                <td class="mono">#{{ b.id }}</td>
                <td>{{ b.userName }}</td>
                <td>{{ b.origin }} → {{ b.destination }}</td>
                <td class="mono">{{ formatPrice(b.totalAmount) }}đ</td>
                <td class="mono">{{ formatDateTime(b.createdAt) }}</td>
                <td><span :class="['badge', `badge-${b.status.toLowerCase()}`]">{{ b.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── USERS TAB ── -->
      <div v-if="activeTab === 'users'">
        <div class="section-header">
          <span class="section-title">NGƯỜI DÙNG</span>
          <div class="filter-bar">
            <select v-model="userFilter">
              <option value="">Tất cả vai trò</option>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="DRIVER">DRIVER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Họ tên</th><th>Email / SĐT</th>
                <th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingUsers"><td colspan="6" class="loading">Đang tải...</td></tr>
              <tr v-else-if="!filteredUsers.length"><td colspan="6" class="loading">Không có dữ liệu</td></tr>
              <tr v-for="u in filteredUsers" :key="u.id">
                <td class="mono">#{{ u.id }}</td>
                <td><strong>{{ u.fullName }}</strong></td>
                <td class="mono">{{ u.email || u.phone }}</td>
                <td><span :class="['badge', `badge-role-${u.role.toLowerCase()}`]">{{ u.role }}</span></td>
                <td>
                  <span :class="['badge', u.isActive ? 'badge-open' : 'badge-cancelled']">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="mono">{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── PAYMENTS TAB ── -->
      <div v-if="activeTab === 'payments'">
        <div class="section-header">
          <span class="section-title">THANH TOÁN</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Booking</th><th>Cổng TT</th>
                <th>Số tiền</th><th>Thời gian</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingPayments"><td colspan="6" class="loading">Đang tải...</td></tr>
              <tr v-else-if="!payments.length"><td colspan="6" class="loading">Không có dữ liệu</td></tr>
              <tr v-for="p in payments" :key="p.id">
                <td class="mono">#{{ p.id }}</td>
                <td class="mono">#{{ p.bookingId }}</td>
                <td><span :class="['badge', `badge-gw-${p.gateway.toLowerCase()}`]">{{ p.gateway }}</span></td>
                <td class="mono">{{ formatPrice(p.amount) }}đ</td>
                <td class="mono">{{ p.paidAt ? formatDateTime(p.paidAt) : '—' }}</td>
                <td><span :class="['badge', `badge-pay-${p.status.toLowerCase()}`]">{{ p.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── STATS TAB ── -->
      <div v-if="activeTab === 'stats'">
        <div class="section-header">
          <span class="section-title">THỐNG KÊ DOANH THU</span>
          <span class="section-sub">30 ngày gần nhất</span>
        </div>

        <div v-if="loadingStats" class="loading">Đang tải dữ liệu thống kê...</div>

        <template v-else>
          <!-- Summary KPIs -->
          <div class="kpi-grid">
            <div class="kpi-card accent">
              <div class="kpi-label">Tổng doanh thu</div>
              <div class="kpi-value">{{ formatPrice(statsData.summary?.totalRevenue) }}đ</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Giao dịch thành công</div>
              <div class="kpi-value">{{ statsData.summary?.successCount || 0 }}</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-label">Đơn đặt xác nhận</div>
              <div class="kpi-value">{{ statsData.summary?.confirmedBookings || 0 }}</div>
            </div>
            <div class="kpi-card red">
              <div class="kpi-label">Đơn đã hủy</div>
              <div class="kpi-value">{{ statsData.summary?.cancelledBookings || 0 }}</div>
            </div>
          </div>

          <!-- Booking status donut (SVG) -->
          <div class="charts-row">
            <!-- Bar chart doanh thu -->
            <div class="chart-panel wide">
              <div class="chart-title">Doanh thu theo ngày</div>
              <div v-if="!statsData.revenueByDay?.length" class="chart-empty">
                Chưa có dữ liệu giao dịch trong 30 ngày
              </div>
              <div v-else class="bar-chart-wrap">
                <div class="bar-chart">
                  <div
                    v-for="(day, idx) in chartDays"
                    :key="idx"
                    class="bar-col"
                    :title="`${day.label}: ${formatPrice(day.revenue)}đ (${day.count} GD)`"
                  >
                    <div class="bar-value-hint" v-if="day.revenue > 0">
                      {{ formatPriceShort(day.revenue) }}
                    </div>
                    <div
                      class="bar"
                      :style="{ height: barHeight(day.revenue) + '%' }"
                      :class="{ 'bar-highlight': day.revenue === maxRevenue && day.revenue > 0 }"
                    ></div>
                    <div class="bar-label">{{ day.label }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Booking status pie -->
            <div class="chart-panel">
              <div class="chart-title">Trạng thái đơn đặt vé</div>
              <div class="donut-wrap">
                <svg viewBox="0 0 120 120" class="donut-svg">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#f0ede8" stroke-width="16"/>
                  <circle
                    v-for="seg in donutSegments" :key="seg.label"
                    cx="60" cy="60" r="48"
                    fill="none"
                    :stroke="seg.color"
                    stroke-width="16"
                    :stroke-dasharray="`${seg.dash} ${301.6 - seg.dash}`"
                    :stroke-dashoffset="seg.offset"
                    stroke-linecap="butt"
                  />
                  <text x="60" y="56" text-anchor="middle" class="donut-center-num">
                    {{ statsData.summary?.totalBookings || 0 }}
                  </text>
                  <text x="60" y="68" text-anchor="middle" class="donut-center-label">
                    đơn
                  </text>
                </svg>
                <div class="donut-legend">
                  <div v-for="seg in donutSegments" :key="seg.label" class="legend-item">
                    <span class="legend-dot" :style="{ background: seg.color }"></span>
                    <span>{{ seg.label }}</span>
                    <span class="legend-val">{{ seg.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top ngày doanh thu -->
          <div class="top-days-panel" v-if="statsData.revenueByDay?.length">
            <div class="chart-title" style="margin-bottom:0.75rem">Top ngày doanh thu cao nhất</div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Ngày</th><th>Doanh thu</th><th>Số giao dịch</th><th>TB/GD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(day, idx) in topDays" :key="day.day">
                    <td class="mono">{{ idx + 1 }}</td>
                    <td class="mono">{{ formatDayLabel(day.day) }}</td>
                    <td class="mono" style="color:#e85d2f;font-weight:600">{{ formatPrice(day.revenue) }}đ</td>
                    <td class="mono">{{ day.count }} GD</td>
                    <td class="mono">{{ formatPrice(Math.round(day.revenue / day.count)) }}đ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()

const activeTab = ref('trips')
const tabs = [
  { key: 'trips',    label: '🚌 Chuyến xe' },
  { key: 'bookings', label: '🎫 Đặt vé' },
  { key: 'users',    label: '👤 Người dùng' },
  { key: 'payments', label: '💳 Thanh toán' },
  { key: 'stats',    label: '📊 Thống kê' },
]

// ── Data refs ──
const trips    = ref([])
const bookings = ref([])
const users    = ref([])
const payments = ref([])
const statsData = ref({ revenueByDay: [], summary: {} })

// ── Loading ──
const loading         = ref(false)
const loadingBookings = ref(false)
const loadingUsers    = ref(false)
const loadingPayments = ref(false)
const loadingStats    = ref(false)

// ── Filters ──
const tripFilter    = ref('')
const bookingFilter = ref('')
const userFilter    = ref('')

// ── Summary cards (top row) ──
const summaryCards = computed(() => [
  { label: 'Chuyến xe',  value: trips.value.length },
  { label: 'Đơn đặt vé', value: bookings.value.length },
  { label: 'Người dùng', value: users.value.length },
  { label: 'Doanh thu',  value: formatPrice(
      payments.value
        .filter(p => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + Number(p.amount), 0)
    ) + 'đ'
  },
])

// ── Filters computed ──
const filteredTrips = computed(() =>
  tripFilter.value ? trips.value.filter(t => t.status === tripFilter.value) : trips.value
)
const filteredBookings = computed(() =>
  bookingFilter.value ? bookings.value.filter(b => b.status === bookingFilter.value) : bookings.value
)
const filteredUsers = computed(() =>
  userFilter.value ? users.value.filter(u => u.role === userFilter.value) : users.value
)

// ── Chart data ──
const chartDays = computed(() => {
  // Tạo 14 ngày gần nhất để fill kể cả ngày 0 GD
  const map = {}
  ;(statsData.value.revenueByDay || []).forEach(d => {
    map[d.day?.toString().substring(0, 10)] = d
  })
  const result = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().substring(0, 10)
    const found = map[key]
    result.push({
      label:   `${d.getDate()}/${d.getMonth() + 1}`,
      revenue: found ? found.revenue : 0,
      count:   found ? found.count : 0,
    })
  }
  return result
})

const maxRevenue = computed(() => Math.max(...chartDays.value.map(d => d.revenue), 1))

function barHeight(rev) {
  return Math.max((rev / maxRevenue.value) * 100, rev > 0 ? 4 : 0)
}

// Donut chart
const donutSegments = computed(() => {
  const s = statsData.value.summary || {}
  const total = s.totalBookings || 0
  if (!total) return []
  const items = [
    { label: 'Confirmed', count: s.confirmedBookings || 0, color: '#2d7a4f' },
    { label: 'Pending',   count: s.pendingBookings   || 0, color: '#f0a500' },
    { label: 'Cancelled', count: s.cancelledBookings || 0, color: '#c0392b' },
  ]
  const circ = 301.6
  let cumulative = 0
  return items.map(item => {
    const dash = (item.count / total) * circ
    const offset = circ - cumulative + circ * 0.25  // rotate start
    cumulative += dash
    return { ...item, dash, offset }
  })
})

const topDays = computed(() =>
  [...(statsData.value.revenueByDay || [])]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
)

// ── Lifecycle ──
onMounted(() => {
  loadTrips()
  loadBookings()
  loadUsers()
  loadPayments()
})

function switchTab(key) {
  activeTab.value = key
  if (key === 'stats' && !statsData.value.revenueByDay?.length) {
    loadStats()
  }
}

// ── Loaders ──
async function loadTrips() {
  loading.value = true
  try { const res = await api.get('/admin/trips'); trips.value = res.data }
  catch { trips.value = [] }
  finally { loading.value = false }
}

async function loadBookings() {
  loadingBookings.value = true
  try { const res = await api.get('/admin/bookings'); bookings.value = res.data }
  catch { bookings.value = [] }
  finally { loadingBookings.value = false }
}

async function loadUsers() {
  loadingUsers.value = true
  try { const res = await api.get('/admin/users'); users.value = res.data }
  catch { users.value = [] }
  finally { loadingUsers.value = false }
}

async function loadPayments() {
  loadingPayments.value = true
  try { const res = await api.get('/admin/payments'); payments.value = res.data }
  catch { payments.value = [] }
  finally { loadingPayments.value = false }
}

async function loadStats() {
  loadingStats.value = true
  try {
    const res = await api.get('/admin/stats')
    statsData.value = res.data
  } catch {
    statsData.value = { revenueByDay: [], summary: {} }
  } finally {
    loadingStats.value = false
  }
}

// ── Helpers ──
function logout() { auth.logout(); router.push('/login') }

function formatPrice(p) {
  return parseInt(p || 0).toLocaleString('vi-VN')
}

function formatPriceShort(p) {
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1) + 'M'
  if (p >= 1_000)     return (p / 1_000).toFixed(0) + 'K'
  return String(p)
}

function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('vi-VN')
}

function formatDayLabel(day) {
  if (!day) return '—'
  return new Date(day).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
</script>

<style scoped>
.admin-page { min-height: 100vh; background: #f5f2ec; font-family: 'DM Sans', sans-serif; }

/* NAV */
.navbar {
  background: #0d0d0d;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem; height: 60px;
  position: sticky; top: 0; z-index: 100;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem; color: #e85d2f; letter-spacing: 2px; text-decoration: none;
}
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
.role-badge {
  font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem;
  border-radius: 10px; background: rgba(255,255,255,0.08); color: #e85d2f;
}
.btn-logout {
  background: none; border: 1px solid #444; color: #888;
  padding: 0.25rem 0.7rem; border-radius: 4px; cursor: pointer;
  font-size: 0.78rem; transition: all 0.15s;
}
.btn-logout:hover { border-color: #e85d2f; color: #e85d2f; }

/* SUMMARY STATS */
.stats-row {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: #d4cfc6;
  border-bottom: 1px solid #d4cfc6;
}
.stat-card {
  background: #fff; padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.stat-num { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: #e85d2f; line-height: 1; }
.stat-label { font-size: 0.75rem; color: #7a7468; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

/* CONTENT */
.content { padding: 1.5rem 2rem; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 1px; }
.section-sub { font-size: 0.8rem; color: #7a7468; }
.filter-bar select {
  border: 1.5px solid #d4cfc6; border-radius: 7px;
  padding: 0.5rem 0.85rem; font-size: 0.85rem;
  color: #0d0d0d; background: #f5f2ec; outline: none; cursor: pointer;
}

/* TABLE */
.table-wrap { background: #fff; border: 1px solid #d4cfc6; border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead { background: #0d0d0d; }
thead th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; }
tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #faf9f7; }
tbody td { padding: 0.8rem 1rem; font-size: 0.875rem; }
.mono { font-family: 'DM Mono', monospace; font-size: 0.8rem; color: #7a7468; }
.loading { text-align: center; padding: 2rem; color: #7a7468; font-size: 0.85rem; }

/* BADGES */
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
.badge-open      { background: #d4edda; color: #155724; }
.badge-pending   { background: #fff3cd; color: #856404; }
.badge-confirmed { background: #d1ecf1; color: #0c5460; }
.badge-cancelled { background: #f8d7da; color: #721c24; }
.badge-completed { background: #e2e3e5; color: #383d41; }
.badge-role-customer { background: #e8f4fd; color: #1a6fa8; }
.badge-role-driver   { background: #fff8e1; color: #8a6200; }
.badge-role-admin    { background: #fce8e8; color: #a82020; }
.badge-gw-vnpay  { background: #e8f0fe; color: #1a56db; }
.badge-gw-momo   { background: #fce8f5; color: #a8208a; }
.badge-gw-card   { background: #e8fce8; color: #1a8a1a; }
.badge-gw-wallet { background: #fff3cd; color: #856404; }
.badge-gw-cash   { background: #e8f4fd; color: #1a6fa8; }
.badge-pay-success  { background: #d4edda; color: #155724; }
.badge-pay-pending  { background: #fff3cd; color: #856404; }
.badge-pay-failed   { background: #f8d7da; color: #721c24; }
.badge-pay-refunded { background: #e2e3e5; color: #383d41; }

/* ── STATS TAB ── */
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1rem; margin-bottom: 1.5rem;
}
.kpi-card {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.25rem 1.5rem;
}
.kpi-card.accent { border-color: #e85d2f; background: #fdf0ef; }
.kpi-card.green  { border-color: #b8dfc8; background: #edf7f1; }
.kpi-card.red    { border-color: #f5c6c2; background: #fdf0ef; }
.kpi-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #7a7468; margin-bottom: 0.4rem; }
.kpi-value { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; color: #0d0d0d; line-height: 1; }
.kpi-card.accent .kpi-value { color: #e85d2f; }
.kpi-card.green  .kpi-value { color: #2d7a4f; }
.kpi-card.red    .kpi-value { color: #c0392b; }

.charts-row {
  display: grid; grid-template-columns: 1fr 280px;
  gap: 1.5rem; margin-bottom: 1.5rem;
}
.chart-panel {
  background: #fff; border: 1.5px solid #d4cfc6;
  border-radius: 12px; padding: 1.5rem;
}
.chart-panel.wide { overflow: hidden; }
.chart-title { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 1px; color: #7a7468; margin-bottom: 1rem; }
.chart-empty { color: #7a7468; font-size: 0.85rem; text-align: center; padding: 2rem; }

/* Bar Chart */
.bar-chart-wrap { overflow-x: auto; }
.bar-chart {
  display: flex; align-items: flex-end; gap: 6px;
  height: 180px; padding-bottom: 28px;
  min-width: 400px;
  position: relative;
}
.bar-col {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end;
  position: relative; cursor: default;
}
.bar-value-hint {
  font-size: 0.6rem; color: #7a7468; margin-bottom: 2px;
  white-space: nowrap;
}
.bar {
  width: 100%; max-width: 28px;
  background: #e85d2f; border-radius: 4px 4px 0 0;
  transition: height 0.4s ease;
  min-height: 2px;
  opacity: 0.75;
}
.bar.bar-highlight { opacity: 1; background: #c44a1e; }
.bar-col:hover .bar { opacity: 1; }
.bar-label {
  position: absolute; bottom: 0;
  font-size: 0.6rem; color: #7a7468;
  text-align: center; white-space: nowrap;
}

/* Donut */
.donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.donut-svg { width: 130px; height: 130px; }
.donut-center-num { font-family: 'Bebas Neue', sans-serif; font-size: 22px; fill: #0d0d0d; }
.donut-center-label { font-size: 9px; fill: #7a7468; }
.donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-val { margin-left: auto; font-weight: 600; color: #0d0d0d; font-family: 'DM Mono', monospace; font-size: 0.78rem; }

.top-days-panel { margin-top: 0.5rem; }
</style>