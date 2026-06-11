<template>
  <div class="search-page">
    <!-- NAV -->
    <UserHeader />

    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ ui.t.search.title }}</h1>
        <p class="page-sub" v-if="searchForm">
          {{ getProvinceName(searchForm.originId) }} →
          {{ getProvinceName(searchForm.destinationId) }} |
          {{ formatDate(searchForm.departureDate) }}
        </p>
      </div>
      <button class="btn-back" @click="router.push('/')">{{ ui.t.search.searchAgain }}</button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="loading">{{ ui.t.search.loading }}</div>

    <!-- EMPTY RAW -->
    <div v-else-if="!allTrips.length" class="empty">
      <div class="empty-icon">🚌</div>
      <div class="empty-title">{{ ui.t.search.noTrips }}</div>
      <div class="empty-sub">{{ ui.t.search.noTripsSub }}</div>
      <button class="btn-search-again" @click="router.push('/')">{{ ui.t.search.searchAgainBtn }}</button>
    </div>

    <!-- SEARCH LAYOUT -->
    <div v-else class="search-layout">
      <!-- SIDEBAR FILTERS -->
      <aside class="filter-sidebar">
        <div class="filter-header">
          <h2>{{ ui.t.search.filterTitle }}</h2>
          <button class="btn-clear-link" @click="resetFilters">{{ ui.t.search.clearFilter }}</button>
        </div>

        <!-- Filter by Operator -->
        <div class="filter-group">
          <h3>{{ ui.t.search.filterOperator }}</h3>
          <div class="checkbox-list">
            <label v-for="op in uniqueOperators" :key="op" class="checkbox-label">
              <input type="checkbox" :value="op" v-model="selectedOperators" />
              <span>{{ op }}</span>
            </label>
          </div>
        </div>

        <!-- Filter by Vehicle Type -->
        <div class="filter-group">
          <h3>{{ ui.t.search.filterVehicle }}</h3>
          <div class="checkbox-list">
            <label v-for="vt in uniqueVehicleTypes" :key="vt" class="checkbox-label">
              <input type="checkbox" :value="vt" v-model="selectedVehicleTypes" />
              <span>{{ vt }}</span>
            </label>
          </div>
        </div>

        <!-- Filter by Time Slot -->
        <div class="filter-group">
          <h3>{{ ui.t.search.filterTime }}</h3>
          <div class="checkbox-list">
            <label class="checkbox-label">
              <input type="checkbox" value="morning" v-model="selectedTimeSlots" />
              <span>{{ ui.t.search.morning }}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="afternoon" v-model="selectedTimeSlots" />
              <span>{{ ui.t.search.afternoon }}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="evening" v-model="selectedTimeSlots" />
              <span>{{ ui.t.search.evening }}</span>
            </label>
          </div>
        </div>
      </aside>

      <!-- RESULTS COLUMN -->
      <div class="results-column">
        <!-- SORT BAR -->
        <div class="sort-bar">
          <span class="results-count">
            {{ ui.t.search.found }} <strong>{{ filteredAndSortedTrips.length }}</strong> {{ ui.t.search.trips }}
          </span>
          <div class="sort-controls">
            <span class="sort-label">{{ ui.t.search.sortLabel }}</span>
            <select v-model="sortBy" class="sort-select">
              <option value="price-asc">{{ ui.t.search.sortPriceAsc }}</option>
              <option value="price-desc">{{ ui.t.search.sortPriceDesc }}</option>
              <option value="time-asc">{{ ui.t.search.sortTimeAsc }}</option>
              <option value="time-desc">{{ ui.t.search.sortTimeDesc }}</option>
            </select>
          </div>
        </div>

        <!-- EMPTY FILTERED -->
        <div v-if="filteredAndSortedTrips.length === 0" class="empty empty-filtered">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">{{ ui.t.search.noFiltered }}</div>
          <div class="empty-sub">{{ ui.t.search.noFilteredSub }}</div>
          <button class="btn-reset-filters" @click="resetFilters">{{ ui.t.search.resetFilters }}</button>
        </div>

        <!-- TRIP LIST -->
        <div v-else class="trip-list">
          <div v-for="trip in filteredAndSortedTrips" :key="trip.id" class="trip-card" @click="selectTrip(trip)">
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
              <div class="seats">{{ trip.totalSeats }} {{ ui.t.search.seats }}</div>
              <button class="btn-select">{{ ui.t.search.selectBtn }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import { useBookingStore } from '../stores/bookingStore'
import UserHeader from '../components/UserHeader.vue'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()

const allTrips   = ref([])
const loading    = ref(true)
const searchForm = ref(null)
const provinces  = ref([])

// Filters state
const selectedOperators = ref([])
const selectedVehicleTypes = ref([])
const selectedTimeSlots = ref([])
const sortBy = ref('price-asc')

onMounted(() => {
  const results = sessionStorage.getItem('search_results')
  const form    = sessionStorage.getItem('search_form')
  const provs   = sessionStorage.getItem('provinces_cache')

  if (!results) { router.push('/'); return }

  const data   = JSON.parse(results)
  allTrips.value = data.trips || []
  searchForm.value = form ? JSON.parse(form) : null
  provinces.value  = provs ? JSON.parse(provs) : []
  loading.value    = false
})

// Dynamic filter options based on search results
const uniqueOperators = computed(() => {
  const ops = allTrips.value.map(t => t.operator)
  return [...new Set(ops)]
})

const uniqueVehicleTypes = computed(() => {
  const types = allTrips.value.map(t => t.vehicleType)
  return [...new Set(types)]
})

// Reset all filters
function resetFilters() {
  selectedOperators.value = []
  selectedVehicleTypes.value = []
  selectedTimeSlots.value = []
  sortBy.value = 'price-asc'
}

// Filter and Sort Logic
const filteredAndSortedTrips = computed(() => {
  let list = [...allTrips.value]

  // 1. Filter by Operator
  if (selectedOperators.value.length > 0) {
    list = list.filter(t => selectedOperators.value.includes(t.operator))
  }

  // 2. Filter by Vehicle Type
  if (selectedVehicleTypes.value.length > 0) {
    list = list.filter(t => selectedVehicleTypes.value.includes(t.vehicleType))
  }

  // 3. Filter by Time Slot
  if (selectedTimeSlots.value.length > 0) {
    list = list.filter(t => {
      const departureTime = new Date(t.departureTime)
      const hour = departureTime.getHours()
      
      const slots = []
      if (hour >= 0 && hour < 12) slots.push('morning')
      if (hour >= 12 && hour < 18) slots.push('afternoon')
      if (hour >= 18 && hour < 24) slots.push('evening')
      
      return selectedTimeSlots.value.some(s => slots.includes(s))
    })
  }

  // 4. Sort
  if (sortBy.value === 'price-asc') {
    list.sort((a, b) => a.price - b.price)
  } else if (sortBy.value === 'price-desc') {
    list.sort((a, b) => b.price - a.price)
  } else if (sortBy.value === 'time-asc') {
    list.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime))
  } else if (sortBy.value === 'time-desc') {
    list.sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime))
  }

  return list
})

function selectTrip(trip) {
  // Lưu vào bookingStore thay sessionStorage thô
  const bookStore = useBookingStore()
  bookStore.setSelectedTrip(trip)
  sessionStorage.setItem('selected_trip', JSON.stringify(trip))
  router.push(`/trips/${trip.id}/seats`)
}

function getProvinceName(id) {
  const p = provinces.value.find(p => p.id == id)
  return p?.name || id
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(ui.locale === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPrice(p) {
  return parseInt(p).toLocaleString(ui.locale === 'vi' ? 'vi-VN' : 'en-US')
}

function getDuration(dep, arr) {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}
</script>

<style scoped>
.search-page { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; transition: background 0.2s, color 0.2s; }

.page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 2rem 2.5rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; letter-spacing: 2px;
  color: var(--text);
}
.page-sub { font-size: 0.85rem; color: var(--muted); margin-top: 0.3rem; }
.btn-back {
  background: none; border: 1.5px solid var(--line);
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.85rem; cursor: pointer; color: var(--muted);
  transition: all 0.15s;
}
.btn-back:hover { border-color: var(--accent); color: var(--accent); }

.loading { text-align: center; padding: 4rem; color: var(--muted); }

.empty {
  text-align: center; padding: 4rem 2rem;
}
.empty-icon { font-size: 4rem; margin-bottom: 1rem; }
.empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 1px; color: var(--text); }
.empty-sub { color: var(--muted); margin: 0.5rem 0 1.5rem; }
.btn-search-again {
  background: var(--accent); color: #fff; border: none;
  padding: 0.7rem 1.5rem; border-radius: 8px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
}
.btn-search-again:hover { background: var(--accent-hover); }

/* SEARCH LAYOUT */
.search-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  padding: 2rem 2.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* SIDEBAR */
.filter-sidebar {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 80px;
}
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.filter-header h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.3rem;
  letter-spacing: 1px;
  margin: 0;
  color: var(--text);
}
.btn-clear-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.btn-clear-link:hover {
  text-decoration: underline;
}

.filter-group {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
  padding-bottom: 1.25rem;
}
.filter-group:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}
.filter-group h3 {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin: 0 0 0.8rem;
}
.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}
.checkbox-label input {
  cursor: pointer;
  accent-color: var(--accent);
}

/* RESULTS COLUMN */
.results-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.sort-bar {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.85rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.results-count {
  font-size: 0.88rem;
  color: var(--muted);
}
.results-count strong {
  color: var(--text);
}
.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.sort-label {
  font-size: 0.82rem;
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sort-select {
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  color: var(--text);
  background: var(--input-bg);
  outline: none;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}
.sort-select:focus {
  border-color: var(--accent);
  background: var(--input-focus-bg);
}

.empty-filtered {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 4rem 2rem;
}
.btn-reset-filters {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
}
.btn-reset-filters:hover { background: var(--accent-hover); }

.trip-list { display: flex; flex-direction: column; gap: 1rem; }

.trip-card {
  background: var(--panel);
  border: 1px solid var(--line);
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
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(232,93,47,0.12);
  transform: translateY(-1px);
}
.trip-main { flex: 1; }
.trip-route {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.city { font-size: 1.1rem; font-weight: 600; color: var(--text); }
.arrow { color: var(--accent); font-weight: 600; }
.trip-time {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 0.5rem;
}
.time { font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 500; color: var(--text); }
.duration {
  font-size: 0.78rem; color: var(--muted);
  background: var(--tag-bg); padding: 0.15rem 0.5rem; border-radius: 10px;
}
.trip-meta { display: flex; gap: 1rem; }
.operator, .vehicle { font-size: 0.82rem; color: var(--muted); }

.trip-right { text-align: right; }
.price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem; color: var(--accent); line-height: 1;
}
.price span { font-size: 1rem; }
.seats { font-size: 0.78rem; color: var(--muted); margin: 0.25rem 0 0.75rem; }
.btn-select {
  background: var(--accent); color: #fff; border: none;
  padding: 0.5rem 1rem; border-radius: 8px;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s; white-space: nowrap;
}
.btn-select:hover { background: var(--accent-hover); }

@media (max-width: 820px) {
  .search-layout {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  .filter-sidebar {
    position: static;
  }
}
</style>