import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Tự động đính kèm token nếu có
api.interceptors.request.use(config => {
  const user = JSON.parse(sessionStorage.getItem('pam_user') || 'null')
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

// Xử lý lỗi chung
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('pam_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api