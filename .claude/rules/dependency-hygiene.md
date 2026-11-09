# Quy tắc về Dependency

Dự án có **2 `package.json`**: gốc (backend) và `frontend/` (Vue). Cài đúng chỗ — `npm install <pkg>` ở gốc không dùng được cho frontend và ngược lại.

## Backend (`package.json` gốc)

| Package | Version | Ghi chú |
|---|---|---|
| `express` | ^4.18.2 | **Express 4** — không nâng lên 5 (breaking: router, error handling, `req.query`) |
| `@prisma/client` + `prisma` | ^5.22.0 | Phải **luôn cùng version**. Nâng 1 cái mà quên cái kia → lỗi runtime |
| `pg` | ^8.11.3 | Chỉ còn dùng ở `js/server.js` legacy |
| `bcrypt` | ^6.0.0 | Native module — đổi version Node phải `npm rebuild bcrypt` |
| `dotenv` | ^17.4.2 | |
| `cors`, `axios` | | |

Lưu ý: `pinia` và `vue-router` đang bị khai báo lẫn trong `package.json` **gốc** (thừa — chúng thuộc frontend). Đừng dựa vào chúng ở backend; nếu dọn thì xoá khỏi gốc và kiểm tra `frontend/package.json` đã có.

**Không có** script `test`/`lint` ở backend. Đừng gọi `npm test` rồi báo "test pass".

## Frontend (`frontend/package.json`)

| Package | Version | Ghi chú |
|---|---|---|
| `vue` | ^3.5.34 | Composition API, `<script setup>` |
| `vite` | ^8.0.12 | Vite 8 — plugin cũ (v4/v5) không tương thích |
| `@vitejs/plugin-vue` | ^6.0.6 | Phải khớp major với Vite |
| `pinia` | ^3.0.4 | Pinia 3 (Vue 3) |
| `vue-router` | ^4.6.4 | |
| `axios` | ^1.17.0 | |
| `qrcode` | ^1.5.4 | Sinh QR vé |

## Khi thêm dependency mới

1. Repo đã có cách giải quyết chưa? `grep` trong `js/lib/`, `frontend/src/` trước (xem skill `search-first`).
2. Package đã có trong `package.json` nào chưa? Ưu tiên dùng cái có sẵn.
3. Package còn được maintain (release < 12 tháng, không CVE nghiêm trọng)?
4. Cài đúng workspace: backend → gốc; UI → `frontend/`.
5. Thêm dep làm `package-lock.json` đổi → nói rõ với user trong báo cáo.

**KHÔNG tự ý thêm:** UI framework (Tailwind/Ant/Element), TypeScript, ORM khác, state library khác Pinia. Những thứ này đổi kiến trúc → phải hỏi user trước.

## Khi Vite dep-scan fail

Triệu chứng: `npm run dev` treo, hoặc "Failed to scan for dependencies from entries" / "Missing specifier" / "could not be resolved".

Nguyên nhân thường gặp:
1. **Import thừa** do IDE auto-import vào path không tồn tại → xoá import.
2. **Sai path sau khi nâng major** — thư viện đổi cấu trúc `exports` → tra `node_modules/<pkg>/package.json`, sửa path import.
3. **Cache `.vite` cũ** → xoá `frontend/node_modules/.vite` rồi `npm run dev`.

Chi tiết: skill `fix-vite-deps`, agent `vite-build-doctor`.

## Node version

Dùng Node LTS (≥ 18). `bcrypt` và Prisma là native/binary — đổi version Node thì `npm rebuild` ở gốc, và `npx prisma generate` lại.
