---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.vue"
---
# TypeScript / JavaScript — Bảo mật

> Mở rộng từ [common/security.md](../common/security.md).

## Quản lý secret

```typescript
// SAI — secret hard-code
const apiKey = "sk-proj-xxxxx"

// ĐÚNG — biến môi trường
const apiKey = import.meta.env.VITE_API_KEY  // (Vite)
// hoặc process.env.API_KEY (Node)

if (!apiKey) {
  throw new Error('VITE_API_KEY chưa được cấu hình')
}
```

Lưu ý Vite: chỉ biến có prefix `VITE_` mới được expose ra client. Đặt biến không cần expose ngoài prefix này.

## Token

- KHÔNG lưu access token nhạy cảm trong `localStorage` nếu site có nguy cơ XSS — ưu tiên httpOnly cookie từ server.
- Trong dự án hiện tại có dùng `ls.get(ACCESS_TOKEN)` (localStorage); khi review code mới, cân nhắc nâng cấp dần sang cookie nếu khả thi.

## Render HTML từ user

- `v-html` của Vue tương đương `dangerouslySetInnerHTML` của React — chỉ dùng khi đã sanitize.
- Sanitize bằng DOMPurify trước khi render:

```typescript
import DOMPurify from 'dompurify'
const safe = DOMPurify.sanitize(userHtml, { ALLOWED_TAGS: ['b','i','em','strong','p'] })
```

## Gọi API

- Toàn bộ URL backend qua `defineRouting.ts` (xem `vue-typescript-style.md`).
- Không nối input user trực tiếp vào URL — luôn truyền qua `params` hoặc `data` của axios.
- Validate response trước khi tin (đặc biệt với dữ liệu sẽ render bằng `v-html`).
