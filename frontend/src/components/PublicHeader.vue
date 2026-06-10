<template>
  <header class="public-header" :class="{ dark }">
    <RouterLink class="brand" to="/">
      <span class="brand-mark">P</span>
      <span>PAM TRAVEL</span>
    </RouterLink>

    <nav class="nav-links" aria-label="Landing navigation">
      <a href="#routes">{{ t.routes }}</a>
      <a href="#operators">{{ t.operators }}</a>
      <a href="#offers">{{ t.offers }}</a>
      <a href="#support">{{ t.support }}</a>
    </nav>

    <div class="actions">
      <button class="icon-btn" type="button" :aria-label="t.theme" @click="$emit('toggle-theme')">
        {{ dark ? '☀' : '◐' }}
      </button>
      <button class="text-btn" type="button" @click="$emit('toggle-locale')">
        {{ locale === 'vi' ? 'EN' : 'VI' }}
      </button>
      <RouterLink class="ghost-btn" to="/login">{{ t.login }}</RouterLink>
      <RouterLink class="solid-btn" to="/register">{{ t.register }}</RouterLink>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  dark: { type: Boolean, default: false },
  locale: { type: String, default: 'vi' },
})

defineEmits(['toggle-theme', 'toggle-locale'])

const copy = {
  vi: {
    routes: 'Tuyến phổ biến',
    operators: 'Nhà xe',
    offers: 'Ưu đãi',
    support: 'Hỗ trợ',
    theme: 'Đổi giao diện',
    login: 'Đăng nhập',
    register: 'Đăng ký',
  },
  en: {
    routes: 'Popular Routes',
    operators: 'Operators',
    offers: 'Offers',
    support: 'Support',
    theme: 'Toggle theme',
    login: 'Login',
    register: 'Register',
  },
}

const t = computed(() => copy[props.locale] || copy.vi)
</script>

<style scoped>
.public-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 68px;
  padding: 0 40px;
  color: #18201d;
  background: rgba(255, 252, 246, 0.92);
  border-bottom: 1px solid rgba(36, 40, 45, 0.12);
  backdrop-filter: blur(14px);
}

.public-header.dark {
  color: #f7f4ee;
  background: rgba(12, 17, 18, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #fff;
  background: #e85d2f;
  border-radius: 8px;
}

.nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.nav-links a,
.ghost-btn,
.solid-btn,
.text-btn,
.icon-btn {
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}

.nav-links a {
  padding: 9px 12px;
  color: inherit;
  font-size: 14px;
  opacity: 0.74;
}

.nav-links a:hover {
  opacity: 1;
  background: rgba(232, 93, 47, 0.12);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ghost-btn,
.solid-btn,
.text-btn,
.icon-btn {
  min-height: 38px;
  border: 1px solid rgba(36, 40, 45, 0.18);
  background: transparent;
  color: inherit;
  font-size: 14px;
  font-weight: 700;
}

.ghost-btn,
.solid-btn,
.text-btn {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
}

.icon-btn {
  width: 38px;
  padding: 0;
}

.solid-btn {
  color: #fff;
  background: #e85d2f;
  border-color: #e85d2f;
}

.ghost-btn:hover,
.text-btn:hover,
.icon-btn:hover {
  border-color: #e85d2f;
  color: #e85d2f;
}

.solid-btn:hover {
  background: #c84b22;
}

@media (max-width: 920px) {
  .public-header {
    padding: 0 18px;
    gap: 12px;
  }

  .nav-links {
    display: none;
  }
}

@media (max-width: 560px) {
  .brand span:last-child {
    display: none;
  }

  .ghost-btn,
  .solid-btn {
    padding: 0 10px;
  }
}
</style>
