<template>
  <div class="home">
    <!-- NAV -->
    <UserHeader />

    <!-- HERO -->
    <div class="hero">
      <h1>{{ ui.t.home.title }}<br><span>{{ ui.t.home.subtitle }}</span></h1>
      <p>{{ ui.t.home.heroSub }}</p>
    </div>

    <!-- SEARCH CARD -->
    <div class="search-card">
      <div class="field">
        <label>{{ ui.t.home.originLabel }}</label>
        <select v-model="form.originId">
          <option value="">{{ ui.t.home.chooseOrigin }}</option>
          <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ ui.t.home.destLabel }}</label>
        <select v-model="form.destinationId">
          <option value="">{{ ui.t.home.chooseDest }}</option>
          <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ ui.t.home.dateLabel }}</label>
        <input v-model="form.departureDate" type="date" :min="today" />
      </div>
      <button class="btn-search" :disabled="loading" @click="doSearch">
        {{ loading ? ui.t.home.searching : ui.t.home.searchBtn }}
      </button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import UserHeader from '../components/UserHeader.vue'
import api from '../services/api'

const router = useRouter()
const auth   = useAuthStore()
const ui     = useUiStore()

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
    // Cache lại để SearchView dùng
    sessionStorage.setItem('provinces_cache', JSON.stringify(res.data))
  } catch (e) {
    error.value = ui.t.home.errLoad
  }
})

async function doSearch() {
  error.value = ''
  if (!form.value.originId)      { error.value = ui.t.home.errOrigin; return }
  if (!form.value.destinationId) { error.value = ui.t.home.errDest; return }
  if (form.value.originId === form.value.destinationId) {
    error.value = ui.t.home.errSame; return
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
    error.value = e.response?.data?.error || (ui.locale === 'vi' ? 'Tìm kiếm thất bại' : 'Search failed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.home { min-height: 100vh; background: var(--page-bg); color: var(--text); font-family: 'DM Sans', sans-serif; transition: background 0.2s, color 0.2s; }

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
.hero h1 span { color: var(--accent); }
.hero p { color: #888; font-size: 0.95rem; margin-top: 0.75rem; line-height: 1.6; }

/* SEARCH CARD */
.search-card {
  background: var(--panel);
  border: 1px solid var(--line);
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
  color: var(--muted);
}
.field select, .field input {
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.65rem 0.9rem;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--input-bg);
  outline: none;
  transition: border-color 0.15s, background-color 0.15s;
  cursor: pointer;
}
.field select:focus, .field input:focus {
  border-color: var(--accent);
  background: var(--input-focus-bg);
}
.btn-search {
  background: var(--accent);
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
.btn-search:hover:not(:disabled) { background: var(--accent-hover); }
.btn-search:disabled { background: var(--line); cursor: not-allowed; }

.error-msg {
  margin: 0 2.5rem;
  padding: 0.75rem 1rem;
  background: #fdf0ef;
  color: #c0392b;
  border-radius: 8px;
  font-size: 0.85rem;
  border: 1px solid #f5c6c2;
}

@media (max-width: 768px) {
  .search-card {
    grid-template-columns: 1fr;
    margin: 1rem;
    padding: 1rem;
  }
  .error-msg {
    margin: 1rem;
  }
}
</style>