<template>
  <div :class="{ dark: ui.isDark }">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useUiStore } from './stores/uiStore.js'
const ui = useUiStore()
</script>

<style>
/* Dark mode CSS variables — hoạt động khi class .dark được thêm vào root div */
.dark {
  --page-bg: #101415;
  --text:    #f7f4ee;
  --muted:   #b4b8ae;
  --line:    rgba(255, 255, 255, 0.12);
  --panel:   #171d1f;
  color-scheme: dark;
}

/* Áp dụng cho body khi dark */
.dark body,
.dark #app {
  background: #101415;
  color: #f7f4ee;
}
</style>