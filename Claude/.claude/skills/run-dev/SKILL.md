---
name: run-dev
description: Khởi động Vite dev server cho client/ đúng cách, xử lý các lỗi thường gặp khi cài đặt lần đầu hoặc sau khi đổi nhánh. Dùng khi user muốn "chạy dev", "lên local", "khởi động frontend".
---

# Chạy frontend (client/) ở chế độ dev

## Bước chuẩn

```bash
cd client
npm install            # chỉ chạy lần đầu hoặc khi package.json đổi
npm run dev
```

Vite sẽ in URL local (mặc định http://localhost:8080 hoặc port trong `vite.config.ts`).

## Khi nghi ngờ cache hỏng

```bash
cd client
rm -rf node_modules/.vite
npm run clean-dev      # = vite --force, ép re-optimize toàn bộ deps
```

## Sau khi pull / đổi nhánh

Nếu `package.json` hoặc `package-lock.json` đổi:

```bash
cd client
npm install
npm run clean-dev
```

Lưu ý: `package-lock.json` đang `skip-worktree` — nếu cần đồng bộ với upstream:

```bash
git update-index --no-skip-worktree package-lock.json
git checkout package-lock.json
npm install
git update-index --skip-worktree package-lock.json
```

## Các lỗi hay gặp

| Lỗi | Nguyên nhân thường gặp | Hướng xử lý |
|---|---|---|
| `Missing "./dist/handsontable.full.css" specifier` | Handsontable v16 đổi đường dẫn CSS | Đổi sang `handsontable/styles/handsontable.css` |
| `could not be resolved: ajv/lib/...` | Auto-import nhầm path không tồn tại | Xoá import thừa |
| Vite treo, không in lỗi | TS1117 — trùng key trong `defineRouting.ts` | `grep -oE '^  [A-Z_0-9]+:' file.ts \| sort \| uniq -d` |
| `JavaScript heap out of memory` | Build dự án lớn | Dùng `npm run build-more-space-size` |

Khi lỗi vượt ngoài bảng trên → dùng agent `vite-build-doctor`.
