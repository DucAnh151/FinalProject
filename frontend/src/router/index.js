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
    meta: { requiresAuth: true, disallowRoles: ['ADMIN', 'DRIVER'] }
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
    meta: { requiresAuth: true, disallowRoles: ['ADMIN', 'DRIVER'] }
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
    meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }
  },
  {
    path: '/my-tickets',
    component: () => import('../views/MyTicketsView.vue'),
    meta: { requiresAuth: true, disallowRoles: ['ADMIN'] }
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
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Helper: redirect về đúng trang home theo role
function roleHome(auth) {
  if (auth.isAdmin)  return '/admin'
  if (auth.isDriver) return '/driver'
  return '/home'
}

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Landing page: nếu đã đăng nhập → redirect về đúng home
  if (to.path === '/' && auth.isLoggedIn) {
    return { path: roleHome(auth) }
  }

  // Trang yêu cầu auth: chưa login → về login
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Trang chỉ dành cho guest: đã login → về đúng home
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { path: roleHome(auth) }
  }

  // Trang yêu cầu role cụ thể: sai role → về đúng home của role đó
  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return { path: roleHome(auth) }
  }

  // Trang không cho phép role này: → về đúng home của role đó
  if (to.meta.disallowRoles?.includes(auth.user?.role)) {
    return { path: roleHome(auth) }
  }
})

export default router