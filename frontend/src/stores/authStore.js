import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('pam_user') || 'null'),
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin:    (state) => state.user?.role === 'ADMIN',
    isDriver:   (state) => state.user?.role === 'DRIVER',
    isCustomer: (state) => state.user?.role === 'CUSTOMER',
  },

  actions: {
    async login(identifier, password) {
      const res = await api.post('/auth/login', { identifier, password })
      this.user = res.data.user
      sessionStorage.setItem('pam_user', JSON.stringify(this.user))
      return res.data
    },

    async register(fullName, phone, email, password) {
      const res = await api.post('/auth/register', { fullName, phone, email, password })
      return res.data
    },

    logout() {
      this.user = null
      sessionStorage.removeItem('pam_user')
    }
  }
})