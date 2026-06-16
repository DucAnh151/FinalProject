<template>
  <div class="landing" :class="{ dark: darkMode }">
    <!-- Authenticated: UserHeader with nav/theme/user menu -->
    <UserHeader v-if="auth.isLoggedIn" />
    <!-- Guest: PublicHeader -->
    <PublicHeader
      v-else
      :dark="darkMode"
      :locale="locale"
      @toggle-theme="ui.toggleDark()"
      @toggle-locale="toggleLocale"
    />

    <main>
      <section class="hero-section">
        <div class="hero-bg" aria-hidden="true"></div>
        <div class="hero-inner">
          <div class="hero-copy reveal">
            <p class="eyebrow">{{ t.eyebrow }}</p>
            <h1>{{ t.heroTitle }}</h1>
            <p class="hero-sub">{{ t.heroSub }}</p>
          </div>

          <form class="search-panel reveal" @submit.prevent="doSearch">
            <div class="field">
              <label>{{ t.origin }}</label>
              <select v-model="form.originId">
                <option value="">{{ t.chooseOrigin }}</option>
                <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div class="field">
              <label>{{ t.destination }}</label>
              <select v-model="form.destinationId">
                <option value="">{{ t.chooseDestination }}</option>
                <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div class="field">
              <label>{{ t.date }}</label>
              <input v-model="form.departureDate" type="date" :min="today" />
            </div>

            <button class="search-btn" type="submit" :disabled="loading">
              {{ loading ? t.searching : t.search }}
            </button>
          </form>

          <p v-if="error" class="form-error">{{ error }}</p>
        </div>
      </section>

      <section class="trust-section reveal" aria-label="Trust signals">
        <div v-for="item in trustCards" :key="item.label" class="trust-item">
          <span class="trust-icon">{{ item.icon }}</span>
          <strong>{{ formatMetric(item) }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </section>

      <section id="routes" class="section">
        <div class="section-head reveal">
          <p>{{ t.routesEyebrow }}</p>
          <h2>{{ t.routesTitle }}</h2>
        </div>

        <div class="route-grid">
          <article v-for="route in popularRoutes" :key="route.id" class="route-card reveal">
            <img :src="route.imageUrl || '/images/routes/ha-noi-da-nang.png'" :alt="route.description" />
            <div class="route-body">
              <h3>{{ route.origin }} → {{ route.destination }}</h3>
              <p>{{ route.description }}</p>
              <div class="route-meta">
                <span>{{ formatPrice(route.basePrice) }}đ</span>
                <button type="button" @click="searchRoute(route)">{{ t.bookNow }}</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="operators" class="section operator-band">
        <div class="section-head reveal">
          <p>{{ t.operatorsEyebrow }}</p>
          <h2>{{ t.operatorsTitle }}</h2>
        </div>

        <div class="operator-grid">
          <article v-for="operator in operators" :key="operator.id" class="operator-card reveal">
            <img :src="operator.logoUrl || '/images/operators/phuong-trang.png'" :alt="operator.name" />
            <div>
              <h3>{{ operator.name }}</h3>
              <p>{{ operator.description || operator.hotline }}</p>
              <span>{{ operator.rating || '4.8' }}★</span>
            </div>
          </article>
        </div>
      </section>

      <section id="steps" class="section">
        <div class="section-head reveal">
          <p>{{ t.stepsEyebrow }}</p>
          <h2>{{ t.stepsTitle }}</h2>
        </div>

        <div class="steps">
          <article v-for="step in steps" :key="step.icon" class="step reveal">
            <span>{{ step.icon }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </article>
        </div>
      </section>

      <section id="offers" class="section offers-section">
        <div class="section-head reveal">
          <p>{{ t.offersEyebrow }}</p>
          <h2>{{ t.offersTitle }}</h2>
        </div>

        <div class="offer-grid">
          <article v-for="banner in banners" :key="banner.id" class="offer-card reveal">
            <img :src="banner.imageUrl || '/images/banners/phuong-trang-offer.png'" :alt="banner.title" />
            <div>
              <h3>{{ banner.title }}</h3>
              <p>{{ t.offerSub }}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="reviews" class="section">
        <div class="section-head reveal">
          <p>{{ t.reviewsEyebrow }}</p>
          <h2>{{ t.reviewsTitle }}</h2>
        </div>

        <div v-if="!reviews.length" class="reviews-empty reveal">
          {{ t.reviewsEmpty }}
        </div>

        <div v-else class="reviews-grid">
          <article
            v-for="review in reviews"
            :key="review.id"
            class="review-card reveal"
          >
            <!-- Stars -->
            <div class="review-stars">
              <span
                v-for="n in 5"
                :key="n"
                :class="['star', { filled: n <= review.rating }]"
              >★</span>
            </div>

            <!-- Comment -->
            <p class="review-comment">{{ review.comment || '—' }}</p>

            <!-- Route -->
            <div class="review-route">
              🚌 {{ review.origin }} → {{ review.destination }}
            </div>

            <!-- User -->
            <div class="review-user">
              <div class="review-avatar">
                <img
                  v-if="review.avatarUrl"
                  :src="review.avatarUrl"
                  :alt="review.userName"
                />
                <span v-else class="avatar-initial">
                  {{ review.userName[0].toUpperCase() }}
                </span>
              </div>
              <div>
                <div class="review-name">
                  {{ review.userName }}
                  <span v-if="review.isVip" class="vip-tag">VIP</span>
                </div>
                <div class="review-date">{{ formatReviewDate(review.createdAt) }}</div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <PublicFooter :dark="darkMode" :locale="locale" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import PublicFooter from '../components/PublicFooter.vue'
import PublicHeader from '../components/PublicHeader.vue'
import UserHeader from '../components/UserHeader.vue'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import api from '../services/api'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const locale = computed(() => ui.locale)
const darkMode = computed(() => ui.isDark)
const t = computed(() => ui.t.landing)

const provinces = ref([])
const popularRoutes = ref([])
const operators = ref([])
const banners = ref([])
const reviews = ref([])
const stats = ref({ trips: 1000, operators: 50, customers: 12000, rating: 4.8 })
const displayed = ref({ trips: 0, operators: 0, customers: 0, rating: 0 })
const loading = ref(false)
const error = ref('')
const today = new Date().toISOString().split('T')[0]

const form = ref({
  originId: '',
  destinationId: '',
  departureDate: today,
})

const trustCards = computed(() => [
  { icon: '⌁', label: t.value.trustTrips,     value: Math.max(stats.value.trips, 1000),    suffix: '+' },
  { icon: '◇', label: t.value.trustOperators, value: Math.max(stats.value.operators, 50),  suffix: '+' },
  { icon: '★', label: t.value.trustRating,     value: stats.value.rating || 4.8,            suffix: '★', decimal: true },
  { icon: '☎', label: t.value.trustSupport,    value: 24,                                   suffix: '/7' },
])

const steps = computed(() => t.value.steps || [])

onMounted(async () => {
  await Promise.all([loadProvinces(), loadLandingData()])
  setupReveal()
  animateStats()
})

function toggleLocale() {
  ui.toggleLocale()
  nextTick(() => setupReveal())
}

async function loadProvinces() {
  try {
    const res = await api.get('/trips/provinces')
    provinces.value = res.data
    sessionStorage.setItem('provinces_cache', JSON.stringify(res.data))
  } catch {
    provinces.value = [
      { id: 1, name: 'Hà Nội' },
      { id: 2, name: 'Hồ Chí Minh' },
      { id: 3, name: 'Đà Nẵng' },
    ]
  }
}

async function loadLandingData() {
  try {
    const [routesRes, operatorsRes, statsRes, bannersRes, reviewsRes] = await Promise.all([
      api.get('/landing/popular-routes'),
      api.get('/landing/operators'),
      api.get('/landing/stats'),
      api.get('/landing/banners'),
      api.get('/reviews/recent?limit=8'),
    ])
    popularRoutes.value = routesRes.data
    operators.value = operatorsRes.data
    banners.value = bannersRes.data
    stats.value = statsRes.data
    reviews.value = reviewsRes.data
  } catch {
    popularRoutes.value = fallbackRoutes()
    operators.value = fallbackOperators()
    banners.value = fallbackBanners()
    reviews.value = []
  }
}

async function doSearch() {
  error.value = ''
  if (!form.value.originId || !form.value.destinationId || !form.value.departureDate) {
    error.value = t.value.missing
    return
  }
  if (form.value.originId === form.value.destinationId) {
    error.value = t.value.sameProvince
    return
  }

  loading.value = true
  try {
    const res = await api.get('/trips/search', { params: form.value })
    sessionStorage.setItem('search_results', JSON.stringify(res.data))
    sessionStorage.setItem('search_form', JSON.stringify(form.value))

    if (!auth.isLoggedIn) {
      sessionStorage.setItem('pam_login_notice', t.value.loginFirst)
      router.push({ path: '/login', query: { redirect: '/search' } })
      return
    }

    router.push('/search')
  } catch (e) {
    error.value = e.response?.data?.error || t.value.searchFailed
  } finally {
    loading.value = false
  }
}

function searchRoute(route) {
  if (route.originId && route.destinationId) {
    form.value.originId = route.originId
    form.value.destinationId = route.destinationId
  }
  doSearch()
}

let revealObserver = null

function setupReveal() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.16 })
  }
  document.querySelectorAll('.reveal').forEach((el) => {
    if (!el.classList.contains('is-visible')) {
      revealObserver.observe(el)
    } else {
      el.classList.add('is-visible')
    }
  })
}

function animateStats() {
  const duration = 900
  const startedAt = performance.now()
  const targets = {
    trips:     Math.max(stats.value.trips || 0, 1000),
    operators: Math.max(stats.value.operators || 0, 50),
    customers: Math.max(stats.value.customers || 0, 12000),
    rating:    stats.value.rating || 4.8,
  }

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1)
    displayed.value = {
      trips:     Math.round(targets.trips * progress),
      operators: Math.round(targets.operators * progress),
      customers: Math.round(targets.customers * progress),
      rating:    Number((targets.rating * progress).toFixed(1)),
    }
    if (progress < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

function formatMetric(item) {
  if (item.decimal) return `${displayed.value.rating.toFixed(1)}${item.suffix}`
  const key = item.label === t.value.trustOperators ? 'operators' : item.value === 24 ? null : 'trips'
  const value = key ? displayed.value[key] : item.value
  return `${Number(value).toLocaleString('vi-VN')}${item.suffix}`
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatReviewDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString(
    locale.value === 'vi' ? 'vi-VN' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  )
}

function fallbackRoutes() {
  return [
    { id: 1, originId: 1, destinationId: 3, origin: 'Hà Nội', destination: 'Đà Nẵng', basePrice: 350000, description: 'Hà Nội → Đà Nẵng, 16 giờ di chuyển', imageUrl: '/images/routes/ha-noi-da-nang.png' },
    { id: 2, originId: 3, destinationId: 2, origin: 'Đà Nẵng', destination: 'Hồ Chí Minh', basePrice: 180000, description: 'Đà Nẵng → Hồ Chí Minh, 8 giờ di chuyển', imageUrl: '/images/routes/da-nang-sai-gon.png' },
    { id: 3, originId: 1, destinationId: 2, origin: 'Hà Nội', destination: 'Hồ Chí Minh', basePrice: 500000, description: 'Hà Nội → Hồ Chí Minh, 24 giờ di chuyển', imageUrl: '/images/routes/ha-noi-sai-gon.png' },
  ]
}

function fallbackOperators() {
  return [
    { id: 1, name: 'Nhà xe Phương Trang', logoUrl: '/images/operators/phuong-trang.png', rating: 4.8, description: 'Mạng lưới tuyến phủ rộng.' },
    { id: 2, name: 'Nhà xe Thành Bưởi', logoUrl: '/images/operators/thanh-buoi.png', rating: 4.7, description: 'Nhiều khung giờ trọng điểm.' },
    { id: 3, name: 'Nhà xe Hoàng Long', logoUrl: '/images/operators/hoang-long.png', rating: 4.6, description: 'Xe giường nằm đường dài.' },
  ]
}

function fallbackBanners() {
  return [
    { id: 1, title: 'Phương Trang — Ưu đãi 20%', imageUrl: '/images/banners/phuong-trang-offer.png' },
    { id: 2, title: 'Thành Bưởi — Giá tốt nhất', imageUrl: '/images/banners/thanh-buoi-offer.png' },
    { id: 3, title: 'Hoàng Long — Flash sale', imageUrl: '/images/banners/hoang-long-offer.png' },
  ]
}
</script>

<style scoped>
.landing {
  --page-bg: #f7f4ee;
  --text: #18201d;
  --muted: #6f756e;
  --line: rgba(36, 40, 45, 0.12);
  --panel: #fffdf7;
  --accent: #e85d2f;
  --gold: #f4c15d;
  min-height: 100vh;
  color: var(--text);
  background: var(--page-bg);
}

.landing.dark {
  --page-bg: #101415;
  --text: #f7f4ee;
  --muted: #b4b8ae;
  --line: rgba(255, 255, 255, 0.12);
  --panel: #171d1f;
}

.hero-section {
  position: relative;
  min-height: 660px;
  overflow: hidden;
  color: #fff;
  background: #131817;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(10, 15, 16, 0.92), rgba(10, 15, 16, 0.42)),
    url('/images/hero/pam-hero.png') center / cover no-repeat;
  transform: scale(1.02);
  animation: hero-pan 18s ease-in-out infinite alternate;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  gap: 26px;
  width: min(1160px, calc(100% - 40px));
  min-height: 660px;
  margin: 0 auto;
  padding: 72px 0 86px;
}

.hero-copy {
  max-width: 700px;
}

.eyebrow,
.section-head p {
  margin: 0 0 10px;
  color: var(--gold);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  max-width: 780px;
  font-size: 58px;
  line-height: 1.02;
  letter-spacing: 0;
}

.hero-sub {
  max-width: 650px;
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 18px;
  line-height: 1.7;
}

.search-panel {
  display: grid;
  grid-template-columns: 1fr 1fr 190px auto;
  gap: 14px;
  align-items: end;
  width: min(980px, 100%);
  padding: 18px;
  background: rgba(255, 253, 247, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
}

.field {
  display: grid;
  gap: 7px;
}

.field label {
  color: #646b63;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.field select,
.field input {
  width: 100%;
  min-height: 46px;
  color: #18201d;
  background: #f7f4ee;
  border: 1px solid #d8d1c4;
  border-radius: 8px;
  outline: none;
  padding: 0 12px;
}

.field select:focus,
.field input:focus {
  border-color: var(--accent);
  background: #fff;
}

.search-btn,
.route-meta button {
  min-height: 46px;
  color: #fff;
  background: var(--accent);
  border: 0;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 800;
  white-space: nowrap;
}

.search-btn:disabled {
  background: #b8afa4;
}

.form-error {
  width: fit-content;
  max-width: min(720px, 100%);
  padding: 10px 14px;
  color: #fff3ed;
  background: rgba(197, 65, 36, 0.88);
  border-radius: 8px;
}

.trust-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  width: min(1160px, calc(100% - 40px));
  margin: -42px auto 0;
  position: relative;
  z-index: 2;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.trust-item {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
  padding: 20px;
  background: var(--panel);
}

.trust-icon {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: #fff;
  background: #2f8f83;
  border-radius: 8px;
  font-weight: 900;
}

.trust-item strong {
  font-size: 24px;
  line-height: 1;
}

.trust-item span:last-child {
  color: var(--muted);
  font-size: 13px;
}

.section {
  width: min(1160px, calc(100% - 40px));
  margin: 0 auto;
  padding: 72px 0 0;
}

.section-head {
  margin-bottom: 24px;
}

.section-head h2 {
  font-size: 34px;
  line-height: 1.15;
  letter-spacing: 0;
}

.route-grid,
.operator-grid,
.steps,
.offer-grid {
  display: grid;
  gap: 18px;
}

.route-grid {
  grid-template-columns: repeat(3, 1fr);
}

.route-card,
.operator-card,
.step,
.offer-card {
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.route-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.route-body {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.route-body h3,
.operator-card h3,
.step h3,
.offer-card h3 {
  color: var(--text);
  font-size: 18px;
  line-height: 1.3;
}

.route-body p,
.operator-card p,
.step p,
.offer-card p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
}

.route-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.route-meta span {
  color: var(--accent);
  font-weight: 900;
}

.operator-band {
  width: 100%;
  padding: 72px max(20px, calc((100% - 1160px) / 2)) 0;
}

.operator-grid {
  grid-template-columns: repeat(5, 1fr);
}

.operator-card {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.operator-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 8px;
}

.operator-card span {
  display: inline-flex;
  margin-top: 10px;
  color: #805800;
  background: rgba(244, 193, 93, 0.22);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 900;
}

.steps {
  grid-template-columns: repeat(4, 1fr);
}

.step {
  padding: 20px;
}

.step > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 18px;
  color: #fff;
  background: #3f7cac;
  border-radius: 8px;
  font-weight: 900;
  animation: step-float 2.8s ease-in-out infinite;
}

.offers-section {
  padding-bottom: 72px;
}

.offer-grid {
  grid-template-columns: repeat(3, 1fr);
}

.offer-card img {
  width: 100%;
  aspect-ratio: 20 / 7;
  object-fit: cover;
}

.offer-card div {
  padding: 16px;
}

.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.52s ease, transform 0.52s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes hero-pan {
  from { transform: scale(1.02) translateX(0); }
  to { transform: scale(1.07) translateX(-24px); }
}

@keyframes step-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@media (max-width: 980px) {
  h1 {
    font-size: 44px;
  }

  .search-panel {
    grid-template-columns: 1fr 1fr;
  }

  .route-grid,
  .operator-grid,
  .offer-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .steps,
  .trust-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-section,
  .hero-inner {
    min-height: 720px;
  }

  .hero-inner {
    width: calc(100% - 28px);
    padding-top: 44px;
  }

  h1 {
    font-size: 34px;
  }

  .hero-sub {
    font-size: 16px;
  }

  .search-panel,
  .route-grid,
  .operator-grid,
  .steps,
  .offer-grid,
  .trust-section {
    grid-template-columns: 1fr;
  }

  .section {
    width: calc(100% - 28px);
    padding-top: 54px;
  }

  .section-head h2 {
    font-size: 28px;
  }
}

/* ── REVIEWS ── */
.reviews-empty {
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

.reviews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.review-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.review-stars {
  display: flex;
  gap: 2px;
  font-size: 1.1rem;
}
.star { color: var(--line); }
.star.filled { color: #f0a500; }

.review-comment {
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.55;
  flex: 1;
}

.review-route {
  font-size: 0.78rem;
  color: var(--muted);
  background: var(--tag-bg, #ede9e1);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  width: fit-content;
}

.review-user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-top: 1px solid var(--line);
  padding-top: 0.75rem;
  margin-top: auto;
}

.review-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #e85d2f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.review-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-initial {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
}

.review-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.vip-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
}

.review-date {
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 2px;
}

@media (max-width: 640px) {
  .reviews-grid {
    grid-template-columns: 1fr;
  }
}

</style>