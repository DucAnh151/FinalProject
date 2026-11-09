# Quy tắc Vue 3 (riêng cho dự án)

Áp dụng cho `frontend/src/`. Dự án dùng **JavaScript thuần, KHÔNG TypeScript** — đừng thêm `lang="ts"`, `.ts`, hay type annotation.

## Single File Component

- Component mới: `<script setup>` + Composition API.
- KHÔNG import compiler macro (`defineProps`, `defineEmits`, `defineExpose`) — đã global trong `<script setup>`.
- Thứ tự block: `<template>` → `<script setup>` → `<style scoped>` (theo các view hiện có).
- Props/emit khai báo tường minh:
  ```js
  const props = defineProps({
    trip: { type: Object, required: true },
    seats: { type: Array, default: () => [] },
  })
  const emit = defineEmits(['select', 'cancel'])
  ```
  Không dùng dạng mảng string (`defineProps(['trip'])`) cho component mới — mất validation.

## Style

- `<style scoped>` + vanilla CSS. **Không có** UI framework và không thêm mới (không Tailwind/Ant/Element) — giữ bundle và look & feel nhất quán.
- Biến màu/spacing dùng chung đặt ở [frontend/src/style.css](../../frontend/src/style.css); đừng rải lại hex màu giống nhau ở từng view.
- Cần xuyên scoped → `:deep(<selector>)`, không dùng `::v-deep` (deprecated).

## Gọi API

- **Mọi** request đi qua axios instance [frontend/src/services/api.js](../../frontend/src/services/api.js):
  ```js
  import api from '../services/api'
  const res = await api.get('/trips/search', { params: { originId, destinationId, departureDate } })
  ```
- Đường dẫn truyền vào là **tương đối, không có `/api`** (baseURL đã chứa `/api`) và **không có host**. Không `fetch()` trực tiếp, không `axios.create` thêm instance.
- Tham số luôn qua `params`/body — không nối chuỗi input user vào URL.
- Xử lý lỗi ở view, hiện message tiếng Việt từ `err.response?.data?.error`:
  ```js
  catch (err) {
    error.value = err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại'
  }
  ```
  401 đã được interceptor xử lý (xoá session + về `/login`) — không xử lý lại ở view.

## State — Pinia

- 3 store hiện có: `authStore` (user + session), `bookingStore` (luồng đặt vé đang diễn ra), `uiStore` (trạng thái UI dùng chung).
- State **dùng chung nhiều view** → store. State chỉ của 1 view → `ref`/`reactive` trong component.
- Thông tin user và phiên: **chỉ đọc/ghi qua `authStore`**. Không `sessionStorage.getItem('pam_user')` trực tiếp trong component — key `pam_user` là chi tiết nội bộ của store (và của `api.js`).
- Store dùng **option syntax** (`defineStore('auth', { state, getters, actions })`) theo code hiện có — giữ nhất quán, đừng trộn setup syntax vào store cũ.
- Mọi lời gọi API đổi dữ liệu user phải cập nhật lại cả `this.user` và `sessionStorage` trong cùng action (xem `authStore.updateProfile`).

## Router & phân quyền

- Thêm trang → thêm route trong [frontend/src/router/index.js](../../frontend/src/router/index.js) với `component: () => import(...)` (lazy load, đúng pattern hiện có) và `meta` phù hợp:
  - `requiresAuth: true` — phải đăng nhập.
  - `role: 'ADMIN' | 'DRIVER'` — chỉ đúng role đó.
  - `disallowRoles: ['ADMIN']` — chặn role khỏi luồng (BR-13: ADMIN không đặt vé).
  - `guestOnly: true` — chỉ cho khách chưa đăng nhập (login/register).
- Guard ở router là lớp UX, **không phải** bảo mật — backend vẫn phải tự kiểm tra quyền.

## Hiển thị dữ liệu

- Tiền: format VNĐ (`toLocaleString('vi-VN')`), không hiện số thô.
- Ngày/giờ: hiển thị theo giờ VN; gửi lên API dạng `YYYY-MM-DD`.
- `v-for` luôn có `:key` ổn định (id từ server), không dùng index khi danh sách có thể thay đổi thứ tự.

## An toàn

- Không `v-html` với dữ liệu từ user/API khi chưa sanitize.
- Không hard-code token, URL môi trường (dùng `import.meta.env.VITE_*`), không commit `frontend/.env`.
- Chỉ biến prefix `VITE_` được expose ra client — không đặt secret vào đó.
- Xoá `console.log` trước khi báo xong.

## Import

- Đường dẫn tương đối (`../services/api`, `../stores/authStore`) — [vite.config.js](../../frontend/vite.config.js) **chưa** cấu hình alias `@/`. Nếu muốn alias thì thêm config và đổi đồng bộ, đừng dùng `@/` khi chưa có.
- Xoá import không dùng — import path không tồn tại sẽ làm Vite dep-scan fail (xem skill `fix-vite-deps`).
