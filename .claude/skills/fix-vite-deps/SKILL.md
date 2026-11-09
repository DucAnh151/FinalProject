---
name: fix-vite-deps
description: Chẩn đoán và fix nhanh lỗi Vite dep-scan / dep-optimize cho frontend/ của Pam Travel. Dùng khi npm run dev treo, báo "Missing specifier", "could not be resolved", hoặc esbuild fail — kể cả khi lỗi xuất hiện sau khi pull code.
---

# Fix lỗi Vite dependency scan

Mọi lệnh chạy trong `frontend/` (Vite 8, Vue 3.5, JavaScript thuần).

## Bước 1 — Đọc thông báo lỗi đầy đủ

Vite luôn in 3 thứ:
- **Plugin:** thường `vite:dep-scan` hoặc `vite:esbuild`.
- **File:** đường dẫn tuyệt đối tới file gây lỗi.
- **Lý do:** `Missing specifier`, `could not be resolved`, hoặc thông báo esbuild.

Đừng đoán — đọc đúng 3 mục đó trước.

## Bước 2 — Phân loại

### Loại A: Path import không tồn tại

```
Missing "./dist/some.css" specifier in "<pkg>" package
```

Xác minh path:
```bash
ls frontend/node_modules/<pkg>/<path>
cat frontend/node_modules/<pkg>/package.json | grep '"version"'
```

Không có → tra field `exports` trong `package.json` của package đó để tìm path đúng, rồi sửa import. **Không** hạ version package để né.

### Loại B: Import thừa do IDE auto-import

```
<đường dẫn lạ> (imported by .../SomeView.vue)
```

Mở file, kiểm tra biến import có được dùng không:
```bash
grep -n "<tênBiến>" frontend/src/views/SomeView.vue
```

Chỉ xuất hiện ở dòng `import` → xoá cả dòng. Đây là nguyên nhân phổ biến nhất.

### Loại C: Nhầm module system

```
Cannot use 'import.meta' outside a module
ReferenceError: require is not defined
```

`frontend/package.json` có `"type": "module"` → file trong `frontend/` phải dùng `import`/`export`. Code copy từ backend (`require`) lọt vào `frontend/src` là root cause:

```bash
grep -rn "require(" frontend/src --include="*.js" --include="*.vue"
```

### Loại D: Top-level `await`

Đã từng gây lỗi ở `LandingView` (git log `d3c7029`).

```bash
grep -rnE "^\s*await |^\s*const .* = await " frontend/src --include="*.vue" --include="*.js"
```

Fix: gói vào function, gọi trong `onMounted`.

### Loại E: Plugin không tương thích Vite 8

```bash
cat frontend/package.json | grep -A5 devDependencies
```

`@vitejs/plugin-vue` phải khớp major (dự án dùng `^6.x`). Plugin cho Vite 4/5 sẽ fail ở hook `configResolved` hoặc báo API không tồn tại. Cần đổi version → **hỏi user**, đừng tự nâng/hạ.

### Loại F: Cache `.vite` cũ

Sau khi `npm install` hoặc đổi nhánh:
```bash
rm -rf frontend/node_modules/.vite
cd frontend && npx vite --force
```
PowerShell: `Remove-Item -Recurse -Force frontend\node_modules\.vite`

Dự án **không có** script `clean-dev` — dùng `npx vite --force`.

### Loại G: Thiếu dependency sau khi pull

```bash
cd frontend && npm install
```

Nhớ: dự án có **2 `package.json`**. `npm install` ở gốc không cài dependency cho frontend.

## Bước 3 — Verify

```bash
cd frontend && npm run build
```

Build sạch là tín hiệu chắc chắn nhất. Hoặc `npm run dev` và đợi `ready in ... ms`.

Còn lỗi mới → quay lại Bước 1 cho lỗi đó.

## Nguyên tắc

- **Một fix một vấn đề.** Đừng nâng version package để "tiện".
- **Không thêm TypeScript** để sửa lỗi type — dự án là JS thuần.
- **Không thêm UI framework / dependency mới** mà chưa hỏi user.
- **Không tắt dep-scan** (`optimizeDeps.exclude` toàn cục) để né lỗi — phải tìm root cause.
- Vượt ngoài các loại trên → dùng agent `vite-build-doctor`.
