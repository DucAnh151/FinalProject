import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/',
    component: () => import('../views/LandingView.vue'),
    meta: { guestOrAuth: true }
  },
  {
    path: '/home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/search',
    component: () => import('../views/SearchView.vue'),
    meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }
  },
  {
    path: '/trips/:id/seats',
    component: () => import('../views/SeatMapView.vue'),
    meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }
  },
  {
    path: '/booking',
    component: () => import('../views/BookingView.vue'),
    meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }
  },
  {
    path: '/payment',
    component: () => import('../views/PaymentView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-tickets',
    component: () => import('../views/MyTicketsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/driver',
    component: () => import('../views/DriverView.vue'),
    meta: { requiresAuth: true, role: 'DRIVER' }
  },
  {
    path: '/admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, role: 'ADMIN' }
  },
  {
    path: '/settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.path === '/' && auth.isLoggedIn) {
    return { path: auth.isAdmin ? '/admin' : '/home' }
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { path: auth.isAdmin ? '/admin' : '/home' }
  }
  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return { path: '/home' }
  }
  if (to.meta.disallowRoles?.includes(auth.user?.role)) {
    return { path: auth.isAdmin ? '/admin' : '/home' }
  }
})

export default router
