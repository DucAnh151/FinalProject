<template>
  <nav class="navbar">
    <div class="left-section">
      <RouterLink to="/" class="nav-logo">PAM TRAVEL</RouterLink>
      <button v-if="backTo" class="btn-back-nav" @click="goBack">
        {{ ui.t.nav.back }}
      </button>
    </div>

    <div class="nav-links">
      <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/" custom v-if="!auth.isAdmin && !auth.isDriver">
        <a :href="href" @click="navigate" :class="{ 'router-link-active': isActive, 'router-link-exact-active': isExactActive }">
          {{ ui.t.nav.home }}
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/my-tickets" custom v-if="!auth.isAdmin && !auth.isDriver">
        <a :href="href" @click="navigate" :class="{ 'router-link-active': isActive, 'router-link-exact-active': isExactActive }">
          {{ ui.t.nav.myTickets }}
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/driver" custom v-if="auth.isDriver">
        <a :href="href" @click="navigate" :class="{ 'router-link-active': isActive, 'router-link-exact-active': isExactActive }">
          {{ ui.t.nav.scan }}
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate, isActive, isExactActive }" to="/admin" custom v-if="auth.isAdmin">
        <a :href="href" @click="navigate" :class="{ 'router-link-active': isActive, 'router-link-exact-active': isExactActive }">
          {{ ui.t.nav.admin }}
        </a>
      </RouterLink>
    </div>

    <div class="actions">
      <!-- Theme toggle -->
      <button class="icon-btn" type="button" :aria-label="ui.t.header.theme" @click="ui.toggleDark()">
        {{ ui.isDark ? '☀' : '◐' }}
      </button>
      <!-- Language toggle -->
      <button class="text-btn" type="button" @click="ui.toggleLocale()">
        {{ ui.locale === 'vi' ? 'EN' : 'VI' }}
      </button>

      <div class="nav-user">
        <div class="user-trigger" @click.stop="showUserDropdown = !showUserDropdown">
          <span class="role-badge">{{ auth.user?.role }}</span>
          <span v-if="auth.user?.loyaltyTier === 'VIP_CUSTOMER'" class="vip-badge">VIP</span>
          <span class="username">{{ auth.user?.fullName || auth.user?.email }} ▼</span>
        </div>
        <div v-if="showUserDropdown" class="dropdown-menu">
          <RouterLink to="/settings" class="dropdown-item">⚙ {{ ui.t.nav.settings }}</RouterLink>
          <button class="dropdown-item btn-logout-item" @click="logout">🚪 {{ ui.t.nav.logout }}</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

const props = defineProps({
  backTo: {
    type: [String, Function],
    default: null
  }
})

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const showUserDropdown = ref(false)

function closeDropdown() {
  showUserDropdown.value = false
}

onMounted(() => {
  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown)
})

function goBack() {
  if (typeof props.backTo === 'function') {
    props.backTo()
  } else if (props.backTo === 'history') {
    router.back()
  } else {
    router.push(props.backTo)
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.left-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.8rem;
  color: #e85d2f;
  letter-spacing: 2px;
  text-decoration: none;
}
.btn-back-nav {
  background: none;
  border: 1px solid #444;
  color: #888;
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.btn-back-nav:hover {
  border-color: #e85d2f;
  color: #e85d2f;
}
.nav-links {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
.nav-links a {
  color: #aaa;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  transition: all 0.15s;
}
.nav-links a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.nav-links a.router-link-active,
.nav-links a.router-link-exact-active {
  color: #e85d2f;
  background: rgba(232, 93, 47, 0.1);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn,
.text-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-btn {
  width: 32px;
  height: 32px;
}
.text-btn {
  padding: 4px 8px;
  height: 32px;
}
.icon-btn:hover,
.text-btn:hover {
  border-color: #e85d2f;
  color: #e85d2f;
}

.nav-user {
  position: relative;
  font-size: 0.82rem;
  color: #ccc;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.user-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
}
.username {
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
}
.vip-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  letter-spacing: 0.5px;
}

.role-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #e85d2f;
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 170px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0;
  z-index: 150;
}
.dropdown-item {
  color: #ccc;
  text-decoration: none;
  font-size: 0.82rem;
  padding: 0.6rem 1rem;
  text-align: left;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.btn-logout-item {
  border-top: 1px solid #2d2d2d;
  color: #e85d2f;
}
.btn-logout-item:hover {
  background: rgba(232, 93, 47, 0.08);
  color: #e85d2f;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 1rem;
  }
  .username {
    display: none;
  }
}
</style>
