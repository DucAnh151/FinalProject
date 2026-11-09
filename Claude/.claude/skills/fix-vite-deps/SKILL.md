---
name: fix-vite-deps
description: Chẩn đoán và fix nhanh lỗi Vite dep-scan / dep-optimize cho client/. Dùng khi npm run dev treo, báo "Missing specifier", "could not be resolved", hoặc esbuild fail. Áp dụng được cho cả trường hợp lỗi xảy ra sau khi pull code.
---

# Fix lỗi Vite dependency scan

## Bước 1 — Đọc thông báo lỗi đầy đủ

Vite luôn in:
- **Plugin:** thường `vite:dep-scan` hoặc `vite:esbuild`.
- **File:** đường dẫn tuyệt đối tới file gây lỗi.
- **Lý do:** `Missing specifier`, `could not be resolved`, hoặc thông báo của esbuild.

Đừng đoán — đọc đúng 3 mục trên trước.

## Bước 2 — Phân loại

### Loại A: Path import không tồn tại

Ví dụ:
```
Missing "./dist/handsontable.full.css" specifier in "handsontable" package
```

→ Mở file gây lỗi, xác minh path:
```bash
ls node_modules/<pkg>/<path>
```

Nếu không có:
- Kiểm tra version: `cat node_modules/<pkg>/package.json | grep version`.
- Tra path đúng trong `node_modules/<pkg>/` hoặc field `exports` trong `package.json` của package đó.
- Sửa lại import.

### Loại B: Import thừa do auto-import

Ví dụ:
```
ajv/lib/vocabularies/applicator/items (imported by .../Foo.vue)
```

→ Mở file, kiểm tra biến import có được dùng không:
```bash
grep -n "\bitems\b" client/src/views/.../Foo.vue
```

Nếu chỉ xuất hiện ở dòng `import` → xoá cả dòng.

### Loại C: Vite treo không in lỗi rõ ràng

→ Nghi ngờ TS1117 (trùng key object).

```bash
# Với file lớn dạng registry:
grep -oE '^  [A-Z_0-9]+:' <file>.ts | sort | uniq -d

# Hoặc nhờ tsc:
npx tsc --noEmit <file>.ts
```

### Loại D: Cache `.vite` cũ

→ Xoá cache:
```bash
rm -rf client/node_modules/.vite
cd client && npm run clean-dev
```

## Bước 3 — Verify

Sau khi fix:
```bash
cd client
npm run dev
```

Đợi tới khi Vite in `ready in ... ms` và URL local. Nếu còn lỗi mới → quay lại Bước 1 cho lỗi mới đó.

## Nguyên tắc

- **Một fix một vấn đề.** Đừng nâng version package để "tiện".
- **Không sửa file đang `skip-worktree`** mà không cảnh báo user.
- **Không tắt dep-scan** (`optimizeDeps.exclude` toàn cục) để né lỗi — phải tìm root cause.
